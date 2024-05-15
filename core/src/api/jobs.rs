use crate::{
	context::NodeContext,
	invalidate_query,
	location::{find_location, LocationError},
	object::validation::old_validator_job::OldObjectValidatorJobInit,
	old_job::{JobStatus, OldJob, OldJobs},
};

use sd_core_heavy_lifting::{
	file_identifier::FileIdentifier, job_system::report, media_processor::job::MediaProcessor,
	JobId, Report,
};

use sd_prisma::prisma::{job, location, SortOrder};

use std::{
	collections::{hash_map::Entry, BTreeMap, HashMap, VecDeque},
	path::PathBuf,
	sync::Arc,
	time::Instant,
};

use chrono::{DateTime, Utc};
use prisma_client_rust::or;
use rspc::alpha::AlphaRouter;
use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::time::Duration;
use tracing::{info, trace};
use uuid::Uuid;

use super::{utils::library, CoreEvent, Ctx, R};

const TEN_MINUTES: Duration = Duration::from_secs(60 * 10);

pub(crate) fn mount() -> AlphaRouter<Ctx> {
	R.router()
		.procedure("progress", {
			// Listen for updates from the job manager
			// - the client listens for events containing an updated JobReport
			// - the client replaces its local copy of the JobReport using the index provided by the reports procedure
			// - this should be used with the ephemeral sync engine
			R.with2(library())
				.subscription(|(node, _), _: ()| async move {
					let mut event_bus_rx = node.event_bus.0.subscribe();
					// debounce per-job
					let mut intervals = BTreeMap::<JobId, Instant>::new();

					async_stream::stream! {
						loop {
							let progress_event = loop {
								if let Ok(CoreEvent::JobProgress(progress_event)) = event_bus_rx.recv().await {
									break progress_event;
								}
							};

							let instant = intervals.entry(progress_event.id).or_insert_with(
								Instant::now
							);

							if instant.elapsed() <= Duration::from_secs_f64(1.0 / 30.0) {
								continue;
							}

							yield progress_event;

							*instant = Instant::now();

							// remove stale jobs that didn't receive a progress for more than 10 minutes
							intervals.retain(|_, instant| instant.elapsed() < TEN_MINUTES);
						}
					}
				})
		})
		.procedure("reports", {
			// Reports provides the client with a list of JobReports
			// - we query with a custom select! to avoid returning paused job cache `job.data`
			// - results must include running jobs, and be combined with the in-memory state
			//	  this is to ensure the client will always get the correct initial state
			// - jobs are sorted in to groups by their action
			// - TODO: refactor grouping system to a many-to-many table
			#[derive(Debug, Clone, Serialize, Type)]
			pub struct JobGroup {
				id: Uuid,
				action: Option<String>,
				status: report::Status,
				created_at: DateTime<Utc>,
				jobs: VecDeque<Report>,
			}

			R.with2(library())
				.query(|(node, library), _: ()| async move {
					let mut groups: HashMap<String, JobGroup> = HashMap::new();

					let job_reports: Vec<Report> = library
						.db
						.job()
						.find_many(vec![])
						.order_by(job::date_created::order(SortOrder::Desc))
						.take(100)
						.exec()
						.await?
						.into_iter()
						.flat_map(Report::try_from)
						.collect();

					let active_reports_by_id = node.job_system.get_active_reports().await;

					for job in job_reports {
						// action name and group key are computed from the job data
						let (action_name, group_key) = job.get_action_name_and_group_key();

						trace!("job {job:#?}, action_name {action_name}, group_key {group_key:?}",);

						// if the job is running, use the in-memory report
						let report = active_reports_by_id.get(&job.id).unwrap_or(&job);

						// if we have a group key, handle grouping
						if let Some(group_key) = group_key {
							match groups.entry(group_key) {
								// Create new job group with metadata
								Entry::Vacant(entry) => {
									entry.insert(JobGroup {
										id: job.parent_id.unwrap_or(job.id),
										action: Some(action_name),
										status: job.status,
										jobs: [report.clone()].into_iter().collect(),
										created_at: job.created_at.unwrap_or(Utc::now()),
									});
								}
								// Add to existing job group
								Entry::Occupied(mut entry) => {
									let group = entry.get_mut();

									// protect paused status from being overwritten
									if report.status != report::Status::Paused {
										group.status = report.status;
									}

									group.jobs.push_front(report.clone());
								}
							}
						} else {
							// insert individual job as group
							groups.insert(
								job.id.to_string(),
								JobGroup {
									id: job.id,
									action: None,
									status: job.status,
									jobs: [report.clone()].into_iter().collect(),
									created_at: job.created_at.unwrap_or(Utc::now()),
								},
							);
						}
					}

					let mut groups_vec = groups.into_values().collect::<Vec<_>>();
					groups_vec.sort_by(|a, b| b.created_at.cmp(&a.created_at));

					tracing::debug!("{groups_vec:#?}");

					Ok(groups_vec)
				})
		})
		.procedure("isActive", {
			R.with2(library())
				.query(|(node, library), _: ()| async move {
					Ok(node.old_jobs.has_active_workers(library.id).await)
				})
		})
		.procedure("clear", {
			R.with2(library())
				.mutation(|(_, library), id: Uuid| async move {
					library
						.db
						.job()
						.delete(job::id::equals(id.as_bytes().to_vec()))
						.exec()
						.await?;

					invalidate_query!(library, "jobs.reports");
					Ok(())
				})
		})
		.procedure("clearAll", {
			R.with2(library())
				.mutation(|(_, library), _: ()| async move {
					info!("Clearing all jobs");
					library
						.db
						.job()
						.delete_many(vec![or![
							job::status::equals(Some(JobStatus::Canceled as i32)),
							job::status::equals(Some(JobStatus::Failed as i32)),
							job::status::equals(Some(JobStatus::Completed as i32)),
							job::status::equals(Some(JobStatus::CompletedWithErrors as i32)),
						]])
						.exec()
						.await?;

					invalidate_query!(library, "jobs.reports");
					Ok(())
				})
		})
		// pause job
		.procedure("pause", {
			R.with2(library())
				.mutation(|(node, library), id: Uuid| async move {
					let ret = OldJobs::pause(&node.old_jobs, id).await.map_err(Into::into);
					invalidate_query!(library, "jobs.reports");
					ret
				})
		})
		.procedure("resume", {
			R.with2(library())
				.mutation(|(node, library), id: Uuid| async move {
					let ret = OldJobs::resume(&node.old_jobs, id)
						.await
						.map_err(Into::into);
					invalidate_query!(library, "jobs.reports");
					ret
				})
		})
		.procedure("cancel", {
			R.with2(library())
				.mutation(|(node, library), id: Uuid| async move {
					let ret = OldJobs::cancel(&node.old_jobs, id)
						.await
						.map_err(Into::into);
					invalidate_query!(library, "jobs.reports");
					ret
				})
		})
		.procedure("generateThumbsForLocation", {
			#[derive(Type, Deserialize)]
			pub struct GenerateThumbsForLocationArgs {
				pub id: location::id::Type,
				pub path: PathBuf,
				#[serde(default)]
				pub regenerate: bool,
			}

			R.with2(library()).mutation(
				|(node, library),
				 GenerateThumbsForLocationArgs {
				     id,
				     path,
				     regenerate,
				 }: GenerateThumbsForLocationArgs| async move {
					let Some(location) = find_location(&library, id).exec().await? else {
						return Err(LocationError::IdNotFound(id).into());
					};

					node.job_system
						.dispatch(
							MediaProcessor::new(location, Some(path), regenerate)?,
							id,
							NodeContext {
								node: Arc::clone(&node),
								library,
							},
						)
						.await
						.map_err(Into::into)
				},
			)
		})
		// .procedure("generateLabelsForLocation", {
		// 	#[derive(Type, Deserialize)]
		// 	pub struct GenerateLabelsForLocationArgs {
		// 		pub id: location::id::Type,
		// 		pub path: PathBuf,
		// 		#[serde(default)]
		// 		pub regenerate: bool,
		// 	}
		// 	R.with2(library()).mutation(
		// 		|(node, library),
		// 		 GenerateLabelsForLocationArgs {
		// 		     id,
		// 		     path,
		// 		     regenerate,
		// 		 }: GenerateLabelsForLocationArgs| async move {
		// 			let Some(location) = find_location(&library, id).exec().await? else {
		// 				return Err(LocationError::IdNotFound(id).into());
		// 			};
		// 			OldJob::new(OldMediaProcessorJobInit {
		// 				location,
		// 				sub_path: Some(path),
		// 				regenerate_thumbnails: false,
		// 				regenerate_labels: regenerate,
		// 			})
		// 			.spawn(&node, &library)
		// 			.await
		// 			.map_err(Into::into)
		// 		},
		// 	)
		// })
		.procedure("objectValidator", {
			#[derive(Type, Deserialize)]
			pub struct ObjectValidatorArgs {
				pub id: location::id::Type,
				pub path: PathBuf,
			}

			R.with2(library())
				.mutation(|(node, library), args: ObjectValidatorArgs| async move {
					let Some(location) = find_location(&library, args.id).exec().await? else {
						return Err(LocationError::IdNotFound(args.id).into());
					};

					OldJob::new(OldObjectValidatorJobInit {
						location,
						sub_path: Some(args.path),
					})
					.spawn(&node, &library)
					.await
					.map_err(Into::into)
				})
		})
		.procedure("identifyUniqueFiles", {
			#[derive(Type, Deserialize)]
			pub struct IdentifyUniqueFilesArgs {
				pub id: location::id::Type,
				pub path: PathBuf,
			}

			R.with2(library()).mutation(
				|(node, library), IdentifyUniqueFilesArgs { id, path }: IdentifyUniqueFilesArgs| async move {
					let Some(location) = find_location(&library, id).exec().await? else {
						return Err(LocationError::IdNotFound(id).into());
					};

					// OldJob::new(OldFileIdentifierJobInit {
					// 	location,
					// 	sub_path: Some(args.path),
					// })
					// .spawn(&node, &library)
					// .await
					// .map_err(Into::into)

					node.job_system
						.dispatch(
							FileIdentifier::new(location, Some(path))?,
							id,
							NodeContext {
								node: Arc::clone(&node),
								library,
							},
						)
						.await
						.map_err(Into::into)
				},
			)
		})
		.procedure("newThumbnail", {
			R.with2(library())
				.subscription(|(node, _), _: ()| async move {
					// TODO: Only return event for the library that was subscribed to
					let mut event_bus_rx = node.event_bus.0.subscribe();
					async_stream::stream! {
						while let Ok(event) = event_bus_rx.recv().await {
							match event {
								CoreEvent::NewThumbnail { thumb_key } => yield thumb_key,
								_ => {}
							}
						}
					}
				})
		})
		.procedure("newFilePathIdentified", {
			R.with2(library())
				.subscription(|(node, _), _: ()| async move {
					// TODO: Only return event for the library that was subscribed to
					let mut event_bus_rx = node.event_bus.0.subscribe();
					async_stream::stream! {
						while let Ok(event) = event_bus_rx.recv().await {
							match event {
								CoreEvent::NewIdentifiedObjects { file_path_ids } => yield file_path_ids,
								_ => {}
							}
						}
					}
				})
		})
}
