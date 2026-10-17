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
#[derive(Clone, Copy, Hash, PartialEq, Eq)]
enum Scope {
    Catalog,
    Inference,
}
impl Scope {
    fn of(observation: &HealthObservation) -> Self {
        if matches!(observation, HealthObservation::CatalogSeen) {
            Self::Catalog
        } else {
            Self::Inference
        }
    }
}
struct Observed {
    at_ms: u64,
    value: HealthObservation,
}
#[derive(Default)]
struct Pending {
    catalog: Option<Observed>,
    inference: Option<Observed>,
}
impl Pending {
    fn merge(&mut self, at_ms: u64, value: HealthObservation) {
        let slot = match Scope::of(&value) {
            Scope::Catalog => &mut self.catalog,
            Scope::Inference => &mut self.inference,
        };
        if slot.as_ref().is_none_or(|old| {
            at_ms > old.at_ms || (at_ms == old.at_ms && value.precedence() > old.value.precedence())
        }) {
            *slot = Some(Observed { at_ms, value });
        }
    }
    fn events(self) -> impl Iterator<Item = (Scope, Observed)> {
        self.catalog
            .into_iter()
            .map(|event| (Scope::Catalog, event))
            .chain(
                self.inference
                    .into_iter()
                    .map(|event| (Scope::Inference, event)),
            )
    }
}
struct Queue {
    pending: HashMap<Key, Pending>,
    unconfirmed: HashSet<(Key, Scope)>,
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
    clock: Arc<dyn Fn() -> tagma_core::AppResult<u64> + Send + Sync>,
    read_slots: Arc<tokio::sync::Semaphore>,
    #[cfg(test)]
    before_drain: Mutex<Option<Arc<dyn Fn() + Send + Sync>>>,
}
impl Tracker {
    pub fn new(directory: PathBuf, shutdown: CancellationToken) -> Arc<Self> {
        Self::with_clock(directory, shutdown, Arc::new(tagma_core::health::now_ms))
    }
    fn with_clock(
        directory: PathBuf,
        shutdown: CancellationToken,
        clock: Arc<dyn Fn() -> tagma_core::AppResult<u64> + Send + Sync>,
    ) -> Arc<Self> {
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
            clock,
            read_slots: Arc::new(tokio::sync::Semaphore::new(1)),
            #[cfg(test)]
            before_drain: Mutex::new(None),
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
            if let Ok(mut queue) = self.queue.lock() {
                queue.overflowed = true;
                self.epoch.fetch_add(1, Ordering::SeqCst);
            }
            return;
        }
        let observed_at = (self.clock)();
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
        let observed_at_ms = match observed_at {
            Ok(time) => time,
            Err(_) => {
                queue.unconfirmed.insert((key, Scope::of(&observation)));
                self.epoch.fetch_add(1, Ordering::SeqCst);
                return;
            }
        };
        // Configured models plus at most eight in-flight eight-step plans. Fail closed
        // if this bound is reached instead of growing a request-derived queue.
        if queue.pending.len() >= 32_832 && !queue.pending.contains_key(&key) {
            queue.overflowed = true;
            self.epoch.fetch_add(1, Ordering::SeqCst);
            return;
        }
        self.epoch.fetch_add(1, Ordering::SeqCst);
        queue
            .pending
            .entry(key)
            .or_default()
            .merge(observed_at_ms, observation);
        if queue.running {
            return;
        }
        queue.running = true;
        drop(queue);
        let tracker = self.clone();
        tokio::task::spawn_blocking(move || tracker.drain());
    }
    fn drain(&self) {
        #[cfg(test)]
        if let Some(hook) = self.before_drain.lock().unwrap().clone() {
            hook();
        }
        loop {
            let next = {
                let Ok(mut queue) = self.queue.lock() else {
                    return;
                };
                if self.shutdown.is_cancelled() {
                    queue.overflowed |= !queue.pending.is_empty();
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
            for (scope, observation) in next.1.events() {
                let result = ConfigService::record_observed_runtime_health(
                    &self.directory,
                    &next.0.provider_id,
                    &next.0.model_id,
                    &next.0.fingerprint,
                    observation.value,
                    observation.at_ms,
                );
                let Ok(mut queue) = self.queue.lock() else {
                    return;
                };
                let key = (next.0.clone(), scope);
                if result.is_ok() || !queue.accepts(&next.0) {
                    queue.unconfirmed.remove(&key);
                } else {
                    queue.unconfirmed.insert(key);
                }
                self.epoch.fetch_add(1, Ordering::SeqCst);
            }
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
    pub async fn read_confirmed(
        &self,
        snapshot: ConfigSnapshot,
    ) -> Option<(u64, Vec<tagma_core::health::ModelHealthRecord>)> {
        if self.shutdown.is_cancelled() || !self.confirmed() {
            return None;
        }
        let epoch = self.epoch();
        let permit = tokio::time::timeout(
            std::time::Duration::from_millis(250),
            self.read_slots.clone().acquire_owned(),
        )
        .await
        .ok()?
        .ok()?;
        let directory = self.directory.clone();
        let task = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            ConfigService::read_runtime_health(&directory, &snapshot)
        });
        let records = tokio::time::timeout(std::time::Duration::from_millis(500), task)
            .await
            .ok()?
            .ok()?
            .ok()?;
        if epoch != self.epoch() || !self.confirmed() {
            return None;
        }
        Some((epoch, records))
    }
    pub async fn settle(&self, budget: std::time::Duration) -> bool {
        tokio::time::timeout(budget, async {
            loop {
                if self.queue.lock().is_ok_and(|queue| !queue.running) {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .is_ok()
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
            queue.unconfirmed.retain(|(key, _)| keep(key));
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
        assert!(
            tracker
                .read_confirmed(config.read_snapshot().unwrap().1)
                .await
                .is_none(),
            "Persisted old rows cannot bypass an unconfirmed write"
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

    #[tokio::test]
    async fn delayed_health_write_does_not_refresh_an_expired_observation() {
        let temp = tempfile::tempdir().unwrap();
        let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
        let provider = config
            .save_provider(SaveProvider {
                protocol_version: 1,
                expected_revision: 0,
                id: None,
                name: "delayed fixture".into(),
                protocol: ProviderProtocol::OpenaiChatCompletions,
                base_url: "https://example.invalid/v1".into(),
                enabled: true,
                models: vec!["model".into()],
                credential: None,
            })
            .unwrap()
            .providers[0]
            .clone();
        let snapshot = config.read_snapshot().unwrap().1;
        let fingerprint = tagma_core::health::provider_fingerprint(&snapshot.providers[0]);
        let clock = Arc::new(AtomicU64::new(1000));
        let tracker = Tracker::with_clock(
            temp.path().to_owned(),
            CancellationToken::new(),
            Arc::new({
                let clock = clock.clone();
                move || Ok(clock.load(Ordering::SeqCst))
            }),
        );
        let gate = Arc::new(Mutex::new(()));
        let (tx, rx) = std::sync::mpsc::channel();
        *tracker.before_drain.lock().unwrap() = Some(Arc::new({
            let gate = gate.clone();
            move || {
                let _ = tx.send(());
                let _guard = gate.lock().unwrap();
            }
        }));
        let late = 1000 + tagma_core::health::HEALTH_TTL_MS + 1;
        {
            let _held = gate.lock().unwrap();
            tracker.observe(
                &provider.id,
                "model",
                &fingerprint,
                HealthObservation::InferenceSucceeded,
            );
            rx.recv_timeout(std::time::Duration::from_secs(2)).unwrap();
            clock.store(late, Ordering::SeqCst);
        }
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            while !tracker.confirmed() {
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
        let records = ConfigService::read_runtime_health(temp.path(), &snapshot).unwrap();
        let ready = records[0].is_ready(late);
        let selected = tagma_core::health::select_first_cloud(&snapshot, &records, late).is_some();
        println!(
            "SUP-006 observed_t0=1000 drain_t={late} persisted_success={:?} ready={ready} selected={selected}",
            records[0].inference_succeeded_ms
        );
        assert!(
            !ready,
            "Queue delay must not restart the five-minute health lifetime"
        );
        assert!(!selected);
        assert_eq!(records[0].inference_succeeded_ms, Some(1000));
        assert_eq!(records[0].view(late).inference, InferenceHealth::Stale);
    }
    #[tokio::test]
    async fn confirmed_reads_are_bounded_and_shutdown_is_not_an_acknowledgement() {
        let temp = tempfile::tempdir().unwrap();
        let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
        let shutdown = CancellationToken::new();
        let tracker = Tracker::new(temp.path().to_owned(), shutdown.clone());
        let snapshot = config.read_snapshot().unwrap().1;
        assert!(tracker.read_confirmed(snapshot.clone()).await.is_some());
        // A timed-out caller cannot create unbounded blocking readers.
        let held = tracker.read_slots.clone().acquire_owned().await.unwrap();
        assert!(tracker.read_confirmed(snapshot.clone()).await.is_none());
        assert_eq!(tracker.read_slots.available_permits(), 0);
        drop(held);
        assert!(tracker.read_confirmed(snapshot.clone()).await.is_some());
        shutdown.cancel();
        assert!(tracker.read_confirmed(snapshot).await.is_none());
        println!(
            "A14 health consumer: bounded single read slot, admission timeout, recovery and shutdown rejection verified"
        );
    }

    #[test]
    fn coalescing_preserves_scope_time_and_failure_precedence() {
        let mut pending = Pending::default();
        pending.merge(
            1100,
            HealthObservation::InferenceFailed(HealthFailure::Authentication),
        );
        pending.merge(1000, HealthObservation::InferenceSucceeded);
        pending.merge(1200, HealthObservation::CatalogSeen);
        pending.merge(1100, HealthObservation::InferenceSucceeded);
        pending.merge(
            1100,
            HealthObservation::InferenceFailed(HealthFailure::Timeout),
        );
        let events: Vec<_> = pending.events().collect();
        assert_eq!(events.len(), 2);
        assert!(events.iter().any(|(scope, event)| *scope == Scope::Catalog
            && event.at_ms == 1200
            && matches!(event.value, HealthObservation::CatalogSeen)));
        assert!(
            events
                .iter()
                .any(|(scope, event)| *scope == Scope::Inference
                    && event.at_ms == 1100
                    && matches!(
                        event.value,
                        HealthObservation::InferenceFailed(HealthFailure::Authentication)
                    ))
        );
    }
}
