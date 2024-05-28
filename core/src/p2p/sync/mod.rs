#![allow(clippy::panic, clippy::unwrap_used)] // TODO: Finish this

use crate::{
	library::Library,
	sync::{self, GetOpsArgs},
};

use sd_p2p_proto::{decode, encode};
use sd_sync::CompressedCRDTOperations;

use std::sync::Arc;

use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt};
use tracing::*;
use uuid::Uuid;

use super::P2PManager;

mod proto;
pub use proto::*;

pub use originator::run as originator;
mod originator {
	use crate::p2p::Header;

	use super::*;
	use responder::tx as rx;
	use sd_p2p_tunnel::Tunnel;

	pub mod tx {

		use super::*;

		#[derive(Debug, PartialEq)]
		pub struct Operations(pub CompressedCRDTOperations);

		impl Operations {
			// TODO: Per field errors for better error handling
			pub async fn from_stream(
				stream: &mut (impl AsyncRead + Unpin),
			) -> std::io::Result<Self> {
				Ok(Self(
					rmp_serde::from_slice(&decode::buf(stream).await.unwrap()).unwrap(),
				))
			}

			pub fn to_bytes(&self) -> Vec<u8> {
				let Self(args) = self;
				let mut buf = vec![];

				// TODO: Error handling
				encode::buf(&mut buf, &rmp_serde::to_vec_named(&args).unwrap());
				buf
			}
		}

		#[cfg(test)]
		#[tokio::test]
		async fn test() {
			use sd_sync::CRDTOperation;

			{
				let original = Operations(CompressedCRDTOperations::new(vec![]));

				let mut cursor = std::io::Cursor::new(original.to_bytes());
				let result = Operations::from_stream(&mut cursor).await.unwrap();
				assert_eq!(original, result);
			}

			{
				let original = Operations(CompressedCRDTOperations::new(vec![CRDTOperation {
					instance: Uuid::new_v4(),
					timestamp: sync::NTP64(0),
					record_id: rmpv::Value::Nil,
					model: 0,
					data: sd_sync::CRDTOperationData::create(),
				}]));

				let mut cursor = std::io::Cursor::new(original.to_bytes());
				let result = Operations::from_stream(&mut cursor).await.unwrap();
				assert_eq!(original, result);
			}
		}
	}

	/// REMEMBER: This only syncs one direction!
	pub async fn run(library_id: Uuid, sync: &Arc<sync::Manager>, p2p: &Arc<super::P2PManager>) {
		for (remote_identity, peer) in p2p.get_library_instances(&library_id) {
			if !peer.is_connected() {
				continue;
			};

			let sync = sync.clone();

			tokio::spawn(async move {
				debug!(
					"Alerting peer '{remote_identity:?}' of new sync events for library '{library_id:?}'"
				);

				let mut stream = peer.new_stream().await.unwrap();

				stream
					.write_all(&Header::Sync(library_id).to_bytes())
					.await
					.unwrap();

				let mut tunnel = Tunnel::initiator(stream).await.unwrap();

				tunnel
					.write_all(&SyncMessage::NewOperations.to_bytes())
					.await
					.unwrap();
				tunnel.flush().await.unwrap();

				while let Ok(rx::MainRequest::GetOperations(args)) =
					rx::MainRequest::from_stream(&mut tunnel).await
				{
					let ops = sync.get_ops(args).await.unwrap();

					tunnel
						.write_all(&tx::Operations(CompressedCRDTOperations::new(ops)).to_bytes())
						.await
						.unwrap();
					tunnel.flush().await.unwrap();
				}
			});
		}
	}
}

pub use responder::run as responder;
mod responder {
	use super::*;
	use originator::tx as rx;

	pub mod tx {
		use serde::{Deserialize, Serialize};

		use super::*;

		#[derive(Serialize, Deserialize, PartialEq, Debug)]
		pub enum MainRequest {
			GetOperations(GetOpsArgs),
			Done,
		}

		impl MainRequest {
			// TODO: Per field errors for better error handling
			pub async fn from_stream(
				stream: &mut (impl AsyncRead + Unpin),
			) -> std::io::Result<Self> {
				Ok(
					// TODO: Error handling
					rmp_serde::from_slice(&decode::buf(stream).await.unwrap()).unwrap(),
				)
			}

			pub fn to_bytes(&self) -> Vec<u8> {
				let mut buf = vec![];
				// TODO: Error handling
				encode::buf(&mut buf, &rmp_serde::to_vec_named(&self).unwrap());
				buf
			}
		}

		#[cfg(test)]
		#[tokio::test]
		async fn test() {
			{
				let original = MainRequest::GetOperations(GetOpsArgs {
					clocks: vec![],
					count: 0,
				});

				let mut cursor = std::io::Cursor::new(original.to_bytes());
				let result = MainRequest::from_stream(&mut cursor).await.unwrap();
				assert_eq!(original, result);
			}

			{
				let original = MainRequest::Done;

				let mut cursor = std::io::Cursor::new(original.to_bytes());
				let result = MainRequest::from_stream(&mut cursor).await.unwrap();
				assert_eq!(original, result);
			}
		}
	}

	pub async fn run(
		stream: &mut (impl AsyncRead + AsyncWrite + Unpin),
		library: Arc<Library>,
	) -> Result<(), ()> {
		let ingest = &library.sync.ingest;

		async fn early_return(stream: &mut (impl AsyncRead + AsyncWrite + Unpin)) {
			// TODO: Proper error returned to remote instead of this.
			// TODO: We can't just abort the connection when the remote is expecting data.
			stream
				.write_all(&tx::MainRequest::Done.to_bytes())
				.await
				.unwrap();
			stream.flush().await.unwrap();
		}

		let Ok(mut rx) = ingest.req_rx.try_lock() else {
			warn!("Rejected sync due to libraries lock being held!");

			early_return(stream).await;
			return Ok(());
		};

		use sync::ingest::*;

		ingest.event_tx.send(Event::Notification).await.unwrap();

		while let Some(req) = rx.recv().await {
			const OPS_PER_REQUEST: u32 = 1000;

			let timestamps = match req {
				Request::FinishedIngesting => break,
				Request::Messages { timestamps, .. } => timestamps,
				_ => continue,
			};

			debug!("Getting ops for timestamps {timestamps:?}");

			stream
				.write_all(
					&tx::MainRequest::GetOperations(sync::GetOpsArgs {
						clocks: timestamps,
						count: OPS_PER_REQUEST,
					})
					.to_bytes(),
				)
				.await
				.unwrap();
			stream.flush().await.unwrap();

			let rx::Operations(ops) = rx::Operations::from_stream(stream).await.unwrap();

			let (wait_tx, wait_rx) = tokio::sync::oneshot::channel::<()>();

			ingest
				.event_tx
				.send(Event::Messages(MessagesEvent {
					instance_id: library.sync.instance,
					has_more: ops.len() == OPS_PER_REQUEST as usize,
					messages: ops,
					wait_tx: None,
				}))
				.await
				.expect("TODO: Handle ingest channel closed, so we don't loose ops");

			wait_rx.await.unwrap()
		}

		debug!("Sync responder done");

		stream
			.write_all(&tx::MainRequest::Done.to_bytes())
			.await
			.unwrap();
		stream.flush().await.unwrap();

		Ok(())
	}
}
