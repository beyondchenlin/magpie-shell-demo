//! Private, bounded manual catalog jobs. Health epoch covers every metadata write.
use super::*;
use std::collections::HashMap;
use tagma_core::catalog::ProbeProvider;
#[derive(Default)]
pub struct Jobs {
    active: std::sync::Mutex<HashMap<String, CancellationToken>>,
}
struct Active {
    jobs: Arc<Jobs>,
    id: String,
}
impl Drop for Active {
    fn drop(&mut self) {
        if let Ok(mut active) = self.jobs.active.lock() {
            active.remove(&self.id);
        }
    }
}
impl Jobs {
    pub fn cancel(&self, id: &str) -> AppResult<()> {
        if uuid::Uuid::parse_str(id).is_err() {
            return Err(AppError::new(ErrorCode::InvalidInput));
        }
        if let Some(token) = self
            .active
            .lock()
            .map_err(|_| AppError::new(ErrorCode::InternalError))?
            .get(id)
        {
            token.cancel();
        }
        Ok(())
    }
}
pub async fn start(state: &Arc<Runtime>, input: ProbeProvider) -> AppResult<()> {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(6);
    check_protocol(input.protocol_version)?;
    if state.shutdown.is_cancelled() || uuid::Uuid::parse_str(&input.request_id).is_err() {
        return Err(AppError::new(ErrorCode::InvalidInput));
    }
    let (record, credential) = {
        let loaded = state.snapshot.read().await;
        if loaded.0 != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let record = loaded
            .1
            .providers
            .iter()
            .find(|p| p.provider.id == input.provider_id)
            .cloned()
            .ok_or_else(|| AppError::new(ErrorCode::InvalidInput))?;
        let credential = loaded.3.get(&input.provider_id).cloned();
        (record, credential)
    };
    let permit = state
        .catalog_slots
        .clone()
        .try_acquire_owned()
        .map_err(|_| AppError::new(ErrorCode::ProbeBusy))?;
    let token = state.shutdown.child_token();
    let security = state.security.register(
        None,
        vec![tagma_core::security::provider_target(
            &tagma_core::health::provider_fingerprint(&record),
        )],
        Some(token.clone()),
    )?;
    security.check_all().await?;
    {
        let mut jobs = state
            .catalog_jobs
            .active
            .lock()
            .map_err(|_| AppError::new(ErrorCode::InternalError))?;
        if jobs.contains_key(&input.request_id) {
            return Err(AppError::new(ErrorCode::ProbeBusy));
        }
        jobs.insert(input.request_id.clone(), token.clone());
    }
    let active = Active {
        jobs: state.catalog_jobs.clone(),
        id: input.request_id.clone(),
    };
    let guard = state.health.external();
    let directory = state.directory.clone();
    let request = input.clone();
    let pinned = record.clone();
    let admission = tokio::task::spawn_blocking(move || {
        let result = ConfigService::begin_runtime_catalog(&directory, &request, &pinned);
        (result, permit, guard)
    });
    let (result, permit, mut guard) = tokio::time::timeout(Duration::from_millis(500), admission)
        .await
        .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))?
        .map_err(|_| AppError::new(ErrorCode::InternalError))?;
    if let Err(error) = result {
        if error.code != ErrorCode::StorageUnavailable {
            guard.confirm();
        }
        return Err(error);
    }
    let state = state.clone();
    tokio::spawn(async move {
        let _active = active;
        let result = tokio::time::timeout_at(deadline, async {
            let Ok(dispatch) = security
                .admit_dispatch(&tagma_core::security::provider_target(
                    &tagma_core::health::provider_fingerprint(&record),
                ))
                .await
            else {
                return tagma_runtime::catalog::Detection {
                    outcome: tagma_core::catalog::CatalogOutcome::Cancelled,
                    status: None,
                    models: vec![],
                };
            };
            if tokio::time::Instant::now() >= deadline {
                return tagma_runtime::catalog::Detection {
                    outcome: tagma_core::catalog::CatalogOutcome::Timeout,
                    status: None,
                    models: vec![],
                };
            }
            let mut detection = Box::pin(tagma_runtime::catalog::detect(
                &state.catalog_client,
                &record.provider,
                credential,
                &token,
            ));
            let initial = futures_util::poll!(detection.as_mut());
            drop(dispatch);
            match initial {
                std::task::Poll::Ready(result) => result,
                std::task::Poll::Pending => detection.await,
            }
        })
        .await
        .unwrap_or(tagma_runtime::catalog::Detection {
            outcome: tagma_core::catalog::CatalogOutcome::Timeout,
            status: None,
            models: vec![],
        });
        let Ok(observed_at_ms) = tagma_core::health::now_ms() else {
            return;
        };
        let directory = state.directory.clone();
        let fingerprint = tagma_core::health::provider_fingerprint(&record);
        // A dropped caller cannot release the worker slot before the write actually finishes.
        let _ = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            if ConfigService::finish_runtime_catalog(
                &directory,
                &input,
                &fingerprint,
                result.outcome,
                result.status,
                result.models,
                observed_at_ms,
            )
            .is_ok()
            {
                guard.confirm();
            }
        })
        .await;
    });
    Ok(())
}
