//! Shared bounded read bridge for native/CLI entry points, separate from writes.
use std::{path::Path, sync::Arc, time::Duration};
use tagma_core::{usage::read::*, *};
fn unavailable() -> AppError {
    AppError::new(ErrorCode::UsageQueryUnavailable)
}
#[derive(Clone)]
pub struct UsageReader {
    slots: Arc<tokio::sync::Semaphore>,
}
impl Default for UsageReader {
    fn default() -> Self {
        Self {
            slots: Arc::new(tokio::sync::Semaphore::new(1)),
        }
    }
}
struct CancelOnDrop(Arc<UsageReadCancellation>);
impl Drop for CancelOnDrop {
    fn drop(&mut self) {
        self.0.cancel();
    }
}
impl UsageReader {
    async fn run<T: Send + 'static>(
        &self,
        work: impl FnOnce(Arc<UsageReadCancellation>) -> AppResult<T> + Send + 'static,
    ) -> AppResult<T> {
        // No waiting queue. A timed-out worker retains the permit until its
        // SQLite connection and transaction really close.
        let permit = self
            .slots
            .clone()
            .try_acquire_owned()
            .map_err(|_| unavailable())?;
        let cancellation = Arc::new(UsageReadCancellation::default());
        let _cancel = CancelOnDrop(cancellation.clone());
        let task = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            work(cancellation)
        });
        tokio::time::timeout(Duration::from_millis(500), task)
            .await
            .map_err(|_| unavailable())?
            .map_err(|_| unavailable())?
    }
    pub async fn requests(
        &self,
        directory: &Path,
        input: UsageRequestsQuery,
    ) -> AppResult<UsageRequestsView> {
        let directory = directory.to_owned();
        self.run(move |cancel| tagma_core::usage::read::requests(&directory, input, &cancel))
            .await
    }
    pub async fn details(
        &self,
        directory: &Path,
        input: UsageDetailsQuery,
    ) -> AppResult<UsageDetailsView> {
        let directory = directory.to_owned();
        self.run(move |cancel| tagma_core::usage::read::details(&directory, input, &cancel))
            .await
    }
    pub async fn summary(
        &self,
        directory: &Path,
        input: UsageSummaryQuery,
    ) -> AppResult<UsageSummaryView> {
        let directory = directory.to_owned();
        self.run(move |cancel| tagma_core::usage::read::summary(&directory, input, &cancel))
            .await
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn timeout_does_not_release_a_live_worker_or_queue_more_queries() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-reader-")
            .tempdir()
            .unwrap();
        let reader = UsageReader::default();
        let (entered, ready) = tokio::sync::oneshot::channel();
        let (release, resume) = std::sync::mpsc::channel();
        let task = {
            let reader = reader.clone();
            tokio::spawn(async move {
                reader
                    .run(move |cancel| {
                        let _ = entered.send(());
                        let _ = resume.recv_timeout(Duration::from_secs(3));
                        if cancel.is_cancelled() {
                            Err(AppError::new(ErrorCode::UsageQueryCancelled))
                        } else {
                            Ok(())
                        }
                    })
                    .await
            })
        };
        ready.await.unwrap();
        assert_eq!(
            task.await.unwrap().unwrap_err().code,
            ErrorCode::UsageQueryUnavailable
        );
        assert_eq!(reader.slots.available_permits(), 0);
        let query = UsageRequestsQuery {
            protocol_version: 1,
            range: UsageRange {
                start_ms: 0.0,
                end_ms: 86400000.0,
            },
            filter: Default::default(),
            cursor: None,
            limit: 32,
        };
        assert!(reader.requests(temp.path(), query.clone()).await.is_err());
        release.send(()).unwrap();
        tokio::time::timeout(Duration::from_secs(1), async {
            while reader.slots.available_permits() == 0 {
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await
        .unwrap();
        let view = reader.requests(temp.path(), query).await.unwrap();
        assert!(matches!(
            view.info.availability,
            UsageAvailability::NotCreated
        ));
        assert_eq!(std::fs::read_dir(temp.path()).unwrap().count(), 0);
        println!(
            "Usage reader:500ms wait timeout retains sole worker permit;retry refused until real worker exits;no missing-store initialization"
        );
    }
}
