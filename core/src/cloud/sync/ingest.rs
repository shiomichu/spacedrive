use sd_prisma::prisma::cloud_crdt_operation;
use sd_sync::CompressedCRDTOperations;
use std::sync::{
	atomic::{AtomicBool, Ordering},
	Arc,
};
use tokio::sync::Notify;
use tracing::debug;

use crate::cloud::sync::err_break;

// Responsible for taking sync operations received from the cloud,
// and applying them to the local database via the sync system's ingest actor.

pub async fn run_actor(
	sync: Arc<sd_core_sync::Manager>,
	notify: Arc<Notify>,
	state: Arc<AtomicBool>,
	state_notify: Arc<Notify>,
) {
	loop {
		state.store(true, Ordering::Relaxed);
		state_notify.notify_waiters();

		{
			let mut rx = sync.ingest.req_rx.lock().await;

			if sync
				.ingest
				.event_tx
				.send(sd_core_sync::Event::Notification)
				.await
				.is_ok()
			{
				while let Some(req) = rx.recv().await {
					const OPS_PER_REQUEST: u32 = 1000;

					use sd_core_sync::*;

					let timestamps = match req {
						Request::FinishedIngesting => {
							break;
						}
						Request::Messages { timestamps, .. } => timestamps,
						_ => continue,
					};

					let (ops_ids, ops): (Vec<_>, Vec<_>) = err_break!(
						sync.get_cloud_ops(GetOpsArgs {
							clocks: timestamps,
							count: OPS_PER_REQUEST,
						})
						.await
					)
					.into_iter()
					.unzip();

					if ops.is_empty() {
						break;
					}

					debug!(
						"Sending {} messages ({:?} to {:?}) to ingester",
						ops.len(),
						ops.first().map(|operation| operation.timestamp.as_u64()),
						ops.last().map(|operation| operation.timestamp.as_u64()),
					);

					let (wait_tx, wait_rx) = tokio::sync::oneshot::channel::<()>();

					err_break!(
						sync.ingest
							.event_tx
							.send(sd_core_sync::Event::Messages(MessagesEvent {
								instance_id: sync.instance,
								has_more: ops.len() == OPS_PER_REQUEST as usize,
								messages: CompressedCRDTOperations::new(ops),
								wait_tx: Some(wait_tx)
							}))
							.await
					);

					err_break!(wait_rx.await);

					err_break!(
						sync.db
							.cloud_crdt_operation()
							.delete_many(vec![cloud_crdt_operation::id::in_vec(ops_ids)])
							.exec()
							.await
					);
				}
			}
		}

		state.store(false, Ordering::Relaxed);
		state_notify.notify_waiters();

		notify.notified().await;
	}
}
