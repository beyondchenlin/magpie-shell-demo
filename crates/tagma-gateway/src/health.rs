//! One coalescing metadata writer; no bodies/credentials and no generated health probes.
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
};
use tagma_core::{ConfigService, health::HealthObservation, service::ConfigSnapshot};
use tokio_util::sync::CancellationToken;

#[derive(Clone, Hash, PartialEq, Eq)]
struct Key {
    provider_id: String,
    model_id: String,
    fingerprint: String,
}
struct Queue {
    pending: HashMap<Key, HealthObservation>,
    unconfirmed: HashSet<Key>,
    running: bool,
    active: Option<HashMap<String, (String, HashSet<String>)>>,
    overflowed: bool,
}
impl Queue {
    fn accepts(&self, key: &Key) -> bool {
        self.active.as_ref().is_none_or(|active| {
            active
                .get(&key.provider_id)
                .is_some_and(|(fingerprint, models)| {
                    fingerprint == &key.fingerprint && models.contains(&key.model_id)
                })
        })
    }
}
pub struct Tracker {
    directory: PathBuf,
    queue: Mutex<Queue>,
    epoch: AtomicU64,
    shutdown: CancellationToken,
}
impl Tracker {
    pub fn new(directory: PathBuf, shutdown: CancellationToken) -> Arc<Self> {
        Arc::new(Self {
            directory,
            queue: Mutex::new(Queue {
                pending: HashMap::new(),
                unconfirmed: HashSet::new(),
                running: false,
                active: None,
                overflowed: false,
            }),
            epoch: AtomicU64::new(0),
            shutdown,
        })
    }
    pub fn observe(
        self: &Arc<Self>,
        provider_id: &str,
        model_id: &str,
        fingerprint: &str,
        observation: HealthObservation,
    ) {
        if self.shutdown.is_cancelled() {
            return;
        }
        let key = Key {
            provider_id: provider_id.into(),
            model_id: model_id.into(),
            fingerprint: fingerprint.into(),
        };
        let Ok(mut queue) = self.queue.lock() else {
            return;
        };
        if !queue.accepts(&key) {
            return;
        }
        // Configured models plus at most eight in-flight eight-step plans. Fail closed
        // if this bound is reached instead of growing a request-derived queue.
        if queue.pending.len() >= 32_832 && !queue.pending.contains_key(&key) {
            queue.overflowed = true;
            self.epoch.fetch_add(1, Ordering::SeqCst);
            return;
        }
        self.epoch.fetch_add(1, Ordering::SeqCst);
        queue.pending.insert(key, observation);
        if queue.running {
            return;
        }
        queue.running = true;
        drop(queue);
        let tracker = self.clone();
        tokio::task::spawn_blocking(move || tracker.drain());
    }
    fn drain(&self) {
        loop {
            let next = {
                let Ok(mut queue) = self.queue.lock() else {
                    return;
                };
                if self.shutdown.is_cancelled() {
                    queue.pending.clear();
                    queue.running = false;
                    return;
                }
                let Some(key) = queue.pending.keys().next().cloned() else {
                    queue.running = false;
                    return;
                };
                let observation = queue.pending.remove(&key).expect("pending entry exists");
                (key, observation)
            };
            let result = ConfigService::record_runtime_health(
                &self.directory,
                &next.0.provider_id,
                &next.0.model_id,
                &next.0.fingerprint,
                next.1,
            );
            let Ok(mut queue) = self.queue.lock() else {
                return;
            };
            if result.is_ok() || !queue.accepts(&next.0) {
                queue.unconfirmed.remove(&next.0);
            } else {
                queue.unconfirmed.insert(next.0);
            }
            self.epoch.fetch_add(1, Ordering::SeqCst);
        }
    }
    pub fn confirmed(&self) -> bool {
        self.queue.lock().is_ok_and(|queue| {
            !queue.running
                && queue.pending.is_empty()
                && queue.unconfirmed.is_empty()
                && !queue.overflowed
        })
    }
    pub fn epoch(&self) -> u64 {
        self.epoch.load(Ordering::SeqCst)
    }
    pub fn reconcile(&self, snapshot: &ConfigSnapshot) {
        let current: HashMap<_, _> = snapshot
            .providers
            .iter()
            .map(|p| {
                (
                    p.provider.id.clone(),
                    (
                        tagma_core::health::provider_fingerprint(p),
                        p.provider.models.iter().cloned().collect::<HashSet<_>>(),
                    ),
                )
            })
            .collect();
        let keep = |key: &Key| {
            current
                .get(&key.provider_id)
                .is_some_and(|(fingerprint, models)| {
                    fingerprint == &key.fingerprint && models.contains(&key.model_id)
                })
        };
        if let Ok(mut queue) = self.queue.lock() {
            queue.pending.retain(|key, _| keep(key));
            queue.unconfirmed.retain(keep);
            queue.active = Some(current);
            queue.overflowed = false;
            self.epoch.fetch_add(1, Ordering::SeqCst);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tagma_core::{
        credentials::SystemCredentials,
        health::{HealthFailure, InferenceHealth},
        *,
    };
    #[tokio::test]
    async fn coalesced_observations_are_confirmed_only_after_persistent_write() {
        let temp = tempfile::tempdir().unwrap();
        let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
        let p = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: 0,
                id: None,
                name: "fixture".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://example.invalid/v1".into(),
                enabled: true,
                models: vec!["model".into()],
                credential: None,
            })
            .unwrap()
            .providers[0]
            .clone();
        let fingerprint = tagma_core::health::provider_fingerprint(
            &config.read_snapshot().unwrap().1.providers[0],
        );
        let tracker = Tracker::new(temp.path().to_owned(), CancellationToken::new());
        for _ in 0..1000 {
            tracker.observe(
                &p.id,
                "model",
                &fingerprint,
                HealthObservation::InferenceSucceeded,
            );
        }
        tokio::time::timeout(std::time::Duration::from_secs(3), async {
            while !tracker.confirmed() {
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
        assert!(tracker.epoch() >= 1000);
        assert_eq!(config.view().unwrap().desired_revision, 1);
        assert_eq!(
            config.view().unwrap().model_health[0].inference,
            InferenceHealth::Ready
        );
        tracker.observe(
            &p.id,
            "model",
            &fingerprint,
            HealthObservation::InferenceFailed(HealthFailure::Authentication),
        );
        tokio::time::timeout(std::time::Duration::from_secs(3), async {
            while !tracker.confirmed() {
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
        assert_eq!(
            config.view().unwrap().model_health[0].inference,
            InferenceHealth::Failed
        );
        let operation = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
        operation.execute_batch("BEGIN IMMEDIATE").unwrap();
        tracker.observe(
            &p.id,
            "model",
            &fingerprint,
            HealthObservation::InferenceSucceeded,
        );
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            loop {
                if tracker.queue.lock().is_ok_and(|queue| !queue.running) {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
        assert!(
            !tracker.confirmed(),
            "A failed metadata write cannot be acknowledged as persisted"
        );
        assert_eq!(
            config.view().unwrap().model_health[0].inference,
            InferenceHealth::Failed
        );
        operation.execute_batch("ROLLBACK").unwrap();
        drop(operation);
        tracker.observe(
            &p.id,
            "model",
            &fingerprint,
            HealthObservation::InferenceSucceeded,
        );
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            while !tracker.confirmed() {
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
        assert_eq!(
            config.view().unwrap().model_health[0].inference,
            InferenceHealth::Ready
        );
    }
}
