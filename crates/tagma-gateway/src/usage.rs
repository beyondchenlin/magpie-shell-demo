//! One bounded writer, acknowledged starts, and body-lifetime cancellation guards.
use std::{
    path::Path,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU32, Ordering},
        mpsc::{self, SyncSender},
    },
    thread::JoinHandle,
    time::{Duration, Instant},
};
use tagma_core::{
    usage::{AttemptStart, Completion, Outcome, RequestStart, Tokens, UsageStore},
    *,
};
use tokio::sync::oneshot;

const QUEUE: usize = 32;
const BUDGET: Duration = Duration::from_millis(800);
pub const FAILURE: &str = "USAGE_STORAGE_UNAVAILABLE";
fn unavailable() -> AppError {
    AppError::new(ErrorCode::UsageStorageUnavailable)
}
enum Operation {
    Request(RequestStart),
    Attempt(AttemptStart),
    Finish(Completion),
    Recover,
}
struct Message {
    operation: Operation,
    reply: Option<oneshot::Sender<AppResult<()>>>,
    deadline: Instant,
}
struct Shared {
    blocked: AtomicBool,
    pending: AtomicU32,
    #[cfg(test)]
    hook: Mutex<Option<Arc<TestHook>>>,
}
#[cfg(test)]
struct TestHook {
    finish: bool,
    entered: tokio::sync::Notify,
    release: std::sync::Barrier,
}
pub struct Ledger {
    sender: Mutex<Option<SyncSender<Message>>>,
    worker: Option<JoinHandle<()>>,
    shared: Arc<Shared>,
}
impl Drop for Ledger {
    fn drop(&mut self) {
        self.sender
            .get_mut()
            .unwrap_or_else(|p| p.into_inner())
            .take();
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}
impl Ledger {
    pub fn open(directory: &Path) -> AppResult<Arc<Self>> {
        let store = UsageStore::open(directory, tagma_core::health::now_ms()?)?;
        let (sender, receiver) = mpsc::sync_channel::<Message>(QUEUE);
        let shared = Arc::new(Shared {
            blocked: AtomicBool::new(false),
            pending: AtomicU32::new(0),
            #[cfg(test)]
            hook: Mutex::new(None),
        });
        let flags = shared.clone();
        let worker = std::thread::Builder::new()
            .name("tagma-usage-writer".into())
            .spawn(move || {
                let mut store = store;
                while let Ok(message) = receiver.recv() {
                    let is_start = matches!(
                        &message.operation,
                        Operation::Request(_) | Operation::Attempt(_)
                    );
                    // Expired/cancelled starts never create an orphan or dispatch grant.
                    if is_start
                        && (Instant::now() >= message.deadline
                            || message.reply.as_ref().is_some_and(|r| r.is_closed()))
                    {
                        flags.blocked.store(true, Ordering::SeqCst);
                        if let Some(reply) = message.reply {
                            let _ = reply.send(Err(unavailable()));
                        }
                        continue;
                    }
                    let fallback = match &message.operation {
                        Operation::Request(start) => {
                            Some((start.id.clone(), None, start.started_ms))
                        }
                        Operation::Attempt(start) => Some((
                            start.request_id.clone(),
                            Some(start.ordinal),
                            start.started_ms,
                        )),
                        _ => None,
                    };
                    let recovering = matches!(&message.operation, Operation::Recover);
                    #[cfg(test)]
                    let is_finish = matches!(&message.operation, Operation::Finish(_));
                    let mut result = match message.operation {
                        Operation::Request(start) if !flags.blocked.load(Ordering::SeqCst) => {
                            store.begin_request(&start)
                        }
                        Operation::Attempt(start) if !flags.blocked.load(Ordering::SeqCst) => {
                            store.begin_attempt(&start)
                        }
                        Operation::Request(_) | Operation::Attempt(_) => Err(unavailable()),
                        Operation::Finish(end) => store.finish(end),
                        Operation::Recover => store.retry_pending(),
                    };
                    flags
                        .pending
                        .store(store.pending_results() as u32, Ordering::SeqCst);
                    let state = store.state();
                    if !state.as_ref().is_ok_and(|state| !state.degraded) {
                        flags.blocked.store(true, Ordering::SeqCst);
                    }
                    if state.is_err() && result.is_ok() {
                        result = Err(unavailable());
                    }
                    if recovering && result.is_ok() {
                        flags.blocked.store(false, Ordering::SeqCst);
                    }
                    if result.as_ref().is_err_and(|e| {
                        message.reply.is_some() || e.code != ErrorCode::InvalidInput
                    }) {
                        flags.blocked.store(true, Ordering::SeqCst);
                    }
                    let began = result.is_ok() && is_start;
                    #[cfg(test)]
                    {
                        let hook = flags.hook.lock().unwrap().clone();
                        if let Some(hook) = hook
                            && ((hook.finish && is_finish)
                                || (!hook.finish
                                    && began
                                    && fallback
                                        .as_ref()
                                        .is_some_and(|(_, ordinal, _)| ordinal.is_some())))
                        {
                            hook.entered.notify_one();
                            hook.release.wait();
                        }
                    }
                    // An undelivered grant never licenses a send. Close it at
                    // its start instant so a queued cancellation cannot be
                    // overtaken by this late acknowledgement.
                    if let Some(reply) = message.reply
                        && reply.send(result).is_err()
                        && began
                        && let Some((id, ordinal, started)) = fallback
                    {
                        let result = store.finish(Completion {
                            request_id: id,
                            ordinal,
                            finished_ms: started,
                            outcome: Outcome::Interrupted,
                            error_code: Some("USAGE_START_UNCONFIRMED".into()),
                            tokens: Tokens::default(),
                        });
                        if result.is_err() {
                            flags.blocked.store(true, Ordering::SeqCst);
                        }
                    }
                    match store.state() {
                        Ok(status) => {
                            flags
                                .pending
                                .store(store.pending_results() as u32, Ordering::SeqCst);
                            if status.degraded {
                                flags.blocked.store(true, Ordering::SeqCst);
                            }
                        }
                        Err(_) => flags.blocked.store(true, Ordering::SeqCst),
                    }
                }
            })
            .map_err(|_| unavailable())?;
        Ok(Arc::new(Self {
            sender: Mutex::new(Some(sender)),
            worker: Some(worker),
            shared,
        }))
    }
    pub fn degraded(&self) -> bool {
        self.shared.blocked.load(Ordering::SeqCst)
    }
    pub fn pending(&self) -> u32 {
        self.shared.pending.load(Ordering::SeqCst)
    }
    fn enqueue(&self, message: Message) -> AppResult<()> {
        self.sender
            .lock()
            .map_err(|_| unavailable())?
            .as_ref()
            .ok_or_else(unavailable)?
            .try_send(message)
            .map_err(|_| {
                self.shared.blocked.store(true, Ordering::SeqCst);
                unavailable()
            })
    }
    async fn call(&self, operation: Operation) -> AppResult<()> {
        self.call_until(operation, tokio::time::Instant::now() + BUDGET)
            .await
    }
    async fn call_until(
        &self,
        operation: Operation,
        deadline: tokio::time::Instant,
    ) -> AppResult<()> {
        let budget = BUDGET.min(deadline.saturating_duration_since(tokio::time::Instant::now()));
        let (reply, receiver) = oneshot::channel();
        self.enqueue(Message {
            operation,
            reply: Some(reply),
            deadline: Instant::now() + budget,
        })?;
        tokio::time::timeout(budget, receiver)
            .await
            .map_err(|_| {
                self.shared.blocked.store(true, Ordering::SeqCst);
                unavailable()
            })?
            .map_err(|_| unavailable())?
    }
    pub async fn recover(&self) -> AppResult<()> {
        // Clearing happens in FIFO writer order, never after an acknowledgement
        // reaches a caller and could overtake a later failed result.
        self.call(Operation::Recover).await
    }
    pub async fn begin(
        self: &Arc<Self>,
        start: RequestStart,
        deadline: tokio::time::Instant,
    ) -> AppResult<Arc<TrackedRequest>> {
        if self.degraded() {
            return Err(unavailable());
        }
        let request = Arc::new(TrackedRequest {
            ledger: self.clone(),
            id: start.id.clone(),
            at: start.started_ms,
            clock: Instant::now(),
            deadline,
            finished: AtomicBool::new(false),
        });
        self.call_until(Operation::Request(start), deadline).await?;
        Ok(request)
    }
    fn abandoned(&self, end: Completion) {
        let _ = self.enqueue(Message {
            operation: Operation::Finish(end),
            reply: None,
            deadline: Instant::now() + BUDGET,
        });
    }
}
pub struct TrackedRequest {
    ledger: Arc<Ledger>,
    pub id: String,
    at: u64,
    clock: Instant,
    deadline: tokio::time::Instant,
    finished: AtomicBool,
}
impl TrackedRequest {
    fn now(&self) -> u64 {
        self.at
            .saturating_add(self.clock.elapsed().as_millis().min(i64::MAX as u128) as u64)
            .min(i64::MAX as u64)
    }
    fn completion(&self, ordinal: Option<u32>, code: Option<&str>, tokens: Tokens) -> Completion {
        let outcome = match code {
            None => Outcome::Succeeded,
            Some("CLIENT_CANCELLED" | "ACCESS_REVOKED" | "GATEWAY_STOPPING") => Outcome::Cancelled,
            _ => Outcome::Failed,
        };
        Completion {
            request_id: self.id.clone(),
            ordinal,
            finished_ms: self.now(),
            outcome,
            error_code: code.map(str::to_owned),
            tokens,
        }
    }
    pub async fn attempt(
        self: &Arc<Self>,
        ordinal: u32,
        provider_id: &str,
        model: &str,
    ) -> AppResult<Attempt> {
        let attempt = Attempt {
            request: self.clone(),
            ordinal,
            finished: false,
        };
        let start = AttemptStart {
            request_id: self.id.clone(),
            ordinal,
            provider_id: provider_id.into(),
            model: model.into(),
            started_ms: self.now(),
        };
        self.ledger
            .call_until(Operation::Attempt(start), self.deadline)
            .await?;
        Ok(attempt)
    }
    pub async fn finish(&self, code: Option<&str>) -> AppResult<()> {
        if self.finished.swap(true, Ordering::SeqCst) {
            return Ok(());
        }
        self.ledger
            .call_until(
                Operation::Finish(self.completion(None, code, Tokens::default())),
                self.deadline,
            )
            .await
    }
}
impl Drop for TrackedRequest {
    fn drop(&mut self) {
        if !self.finished.swap(true, Ordering::SeqCst) {
            self.ledger.abandoned(self.completion(
                None,
                Some("CLIENT_CANCELLED"),
                Tokens::default(),
            ));
        }
    }
}
pub struct Attempt {
    request: Arc<TrackedRequest>,
    ordinal: u32,
    finished: bool,
}
impl Attempt {
    pub async fn finish(&mut self, code: Option<&str>, tokens: Tokens) -> AppResult<()> {
        if self.finished {
            return Ok(());
        }
        self.finished = true;
        self.request
            .ledger
            .call_until(
                Operation::Finish(self.request.completion(Some(self.ordinal), code, tokens)),
                self.request.deadline,
            )
            .await
    }
    pub async fn finish_request(&self, code: Option<&str>) -> AppResult<()> {
        self.request.finish(code).await
    }
}
impl Drop for Attempt {
    fn drop(&mut self) {
        if !self.finished {
            self.request.ledger.abandoned(self.request.completion(
                Some(self.ordinal),
                Some("CLIENT_CANCELLED"),
                Tokens::default(),
            ));
        }
    }
}

pub fn tokens(value: &serde_json::Value) -> Tokens {
    let usage = &value["usage"];
    let count = |key: &str| usage[key].as_u64().filter(|n| *n <= i64::MAX as u64);
    Tokens {
        input: count("prompt_tokens"),
        output: count("completion_tokens"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn lost_attempt_start_acknowledgement_closes_both_started_records() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-ack-")
            .tempdir()
            .unwrap();
        let ledger = Ledger::open(temp.path()).unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let provider = uuid::Uuid::new_v4().to_string();
        let request = ledger
            .begin(
                RequestStart {
                    id: id.clone(),
                    provider_id: provider.clone(),
                    model: "ack-fixture".into(),
                    config_revision: 1,
                    team_revision: None,
                    started_ms: tagma_core::health::now_ms().unwrap(),
                },
                tokio::time::Instant::now() + Duration::from_secs(10),
            )
            .await
            .unwrap();
        let hook = Arc::new(TestHook {
            finish: false,
            entered: tokio::sync::Notify::new(),
            release: std::sync::Barrier::new(2),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let task = {
            let request = request.clone();
            tokio::spawn(async move { request.attempt(1, &provider, "ack-fixture").await })
        };
        hook.entered.notified().await;
        assert!(task.await.unwrap().is_err());
        drop(request);
        tokio::time::sleep(Duration::from_millis(20)).await;
        hook.release.wait();
        ledger.recover().await.unwrap();
        let db = rusqlite::Connection::open_with_flags(
            temp.path().join("usage.sqlite3"),
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        let running:i64=db.query_row("SELECT (SELECT count(*) FROM usage_requests WHERE outcome='running')+(SELECT count(*) FROM usage_attempts WHERE outcome='running')",[],|r|r.get(0)).unwrap();
        println!(
            "Usage lost committed-start ACK unit: unfinished records={running}; late ACK lifecycle guard recovery"
        );
        assert_eq!(
            running, 0,
            "late start ACK must not leave a logical request running after its cancellation"
        );
    }
    #[tokio::test]
    async fn accounting_ack_wait_respects_the_remaining_request_budget() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-usage-deadline-")
            .tempdir()
            .unwrap();
        let ledger = Ledger::open(temp.path()).unwrap();
        let request = ledger
            .begin(
                RequestStart {
                    id: uuid::Uuid::new_v4().to_string(),
                    provider_id: uuid::Uuid::new_v4().to_string(),
                    model: "deadline-fixture".into(),
                    config_revision: 1,
                    team_revision: None,
                    started_ms: tagma_core::health::now_ms().unwrap(),
                },
                tokio::time::Instant::now() + Duration::from_millis(150),
            )
            .await
            .unwrap();
        let hook = Arc::new(TestHook {
            finish: true,
            entered: Default::default(),
            release: std::sync::Barrier::new(2),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let task = tokio::spawn(async move { request.finish(None).await });
        hook.entered.notified().await;
        let result = tokio::time::timeout(Duration::from_millis(400), task).await;
        let degraded = ledger.degraded();
        hook.release.wait();
        ledger.recover().await.unwrap();
        assert!(matches!(result, Ok(Ok(Err(_)))));
        assert!(degraded);
        println!(
            "Usage accounting ACK:remaining150ms request budget ends wait while committed writer ACK is held;explicit recovery required"
        );
    }
}
