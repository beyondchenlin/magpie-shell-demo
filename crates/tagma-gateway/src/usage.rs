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
use tagma_core::usage::{
    clear::{UsageClearPlan, UsageClearReceipt},
    read::UsageRange,
};
use tagma_core::{
    usage::{AttemptStart, Completion, Outcome, RequestStart, Tokens, UsageStore},
    *,
};
use tokio::sync::oneshot;

const QUEUE: usize = 32;
const BUDGET: Duration = Duration::from_millis(800);
#[cfg(not(test))]
const IDLE_RETENTION: Duration = Duration::from_secs(60);
#[cfg(test)]
const IDLE_RETENTION: Duration = Duration::from_millis(50);
pub const FAILURE: &str = "USAGE_STORAGE_UNAVAILABLE";
fn unavailable() -> AppError {
    AppError::new(ErrorCode::UsageStorageUnavailable)
}
enum Operation {
    Request(RequestStart),
    Attempt(AttemptStart),
    Finish(Completion),
    Recover,
    Manage(Management),
}
enum Management {
    Preview {
        range: UsageRange,
        reply: oneshot::Sender<AppResult<UsageClearPlan>>,
    },
    Clear {
        plan: UsageClearPlan,
        reply: oneshot::Sender<AppResult<UsageClearReceipt>>,
    },
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
enum HookPhase {
    AttemptCommitted,
    FinishCommitted,
    BeforeRecover,
    ClearCommitted,
}
#[cfg(test)]
#[derive(Default)]
struct TestLatch {
    released: Mutex<bool>,
    ready: std::sync::Condvar,
}
#[cfg(test)]
impl TestLatch {
    fn wait(&self) {
        let guard = self.released.lock().unwrap_or_else(|p| p.into_inner());
        drop(
            self.ready
                .wait_timeout_while(guard, Duration::from_secs(3), |released| !*released),
        );
    }
    fn open(&self) {
        *self.released.lock().unwrap_or_else(|p| p.into_inner()) = true;
        self.ready.notify_all();
    }
}
#[cfg(test)]
struct TestHook {
    phase: HookPhase,
    completed: tokio::sync::Notify,
    entered: tokio::sync::Notify,
    release: TestLatch,
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
                loop {
                    let message = match receiver.recv_timeout(IDLE_RETENTION) {
                        Ok(message) => message,
                        Err(mpsc::RecvTimeoutError::Disconnected) => break,
                        Err(mpsc::RecvTimeoutError::Timeout) => {
                            idle_retention(&mut store, &flags, tagma_core::health::now_ms());
                            continue;
                        }
                    };
                    let operation = match message.operation {
                        Operation::Manage(Management::Preview { range, reply }) => {
                            management_result(
                                &mut store,
                                &flags,
                                reply,
                                message.deadline,
                                false,
                                move |store| {
                                    store.prepare_clear(range, tagma_core::health::now_ms()?)
                                },
                            );
                            continue;
                        }
                        Operation::Manage(Management::Clear { plan, reply }) => {
                            management_result(
                                &mut store,
                                &flags,
                                reply,
                                message.deadline,
                                true,
                                move |store| store.clear(&plan, tagma_core::health::now_ms()?),
                            );
                            continue;
                        }
                        operation => operation,
                    };
                    let message = Message {
                        operation,
                        ..message
                    };
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
                    {
                        let hook = flags.hook.lock().unwrap().clone();
                        if let Some(hook) = hook
                            && recovering
                            && matches!(hook.phase, HookPhase::BeforeRecover)
                        {
                            hook.entered.notify_one();
                            hook.release.wait();
                        }
                    }
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
                        Operation::Manage(_) => {
                            unreachable!("management handled before inference ledger operations")
                        }
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
                            && ((matches!(hook.phase, HookPhase::FinishCommitted) && is_finish)
                                || (matches!(hook.phase, HookPhase::AttemptCommitted)
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
                    #[cfg(test)]
                    {
                        let hook = flags.hook.lock().unwrap().clone();
                        if let Some(hook) = hook
                            && recovering
                            && matches!(hook.phase, HookPhase::BeforeRecover)
                        {
                            hook.completed.notify_one();
                        }
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
    async fn management<T>(
        &self,
        clear: bool,
        operation: impl FnOnce(oneshot::Sender<AppResult<T>>) -> Management,
    ) -> AppResult<T> {
        let (reply, receiver) = oneshot::channel();
        let message = Message {
            operation: Operation::Manage(operation(reply)),
            reply: None,
            deadline: Instant::now() + BUDGET,
        };
        {
            let guard = self
                .sender
                .lock()
                .map_err(|_| management_unconfirmed(clear))?;
            let sender = guard
                .as_ref()
                .ok_or_else(|| management_unconfirmed(clear))?;
            sender.try_send(message).map_err(|error| match error {
                mpsc::TrySendError::Full(_) => AppError::new(ErrorCode::UsageClearBusy),
                mpsc::TrySendError::Disconnected(_) => management_unconfirmed(clear),
            })?;
        }
        // Waiting expiry does not imply that an already-running clear rolled
        // back. Its durable receipt can be queried by replaying the SAME plan.
        tokio::time::timeout(BUDGET, receiver)
            .await
            .map_err(|_| management_unconfirmed(clear))?
            .map_err(|_| management_unconfirmed(clear))?
    }
    pub async fn prepare_clear(&self, range: UsageRange) -> AppResult<UsageClearPlan> {
        self.management(false, |reply| Management::Preview { range, reply })
            .await
    }
    pub async fn clear(&self, plan: UsageClearPlan) -> AppResult<UsageClearReceipt> {
        self.management(true, |reply| Management::Clear { plan, reply })
            .await
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
fn idle_retention(store: &mut UsageStore, flags: &Shared, now: AppResult<u64>) {
    // No automatic recovery or pending-result replay from a timer. Existing
    // degradation stays fenced until the explicit private recovery command.
    if flags.blocked.load(Ordering::SeqCst) {
        return;
    }
    let result = now.and_then(|now| store.maintain(now));
    flags
        .pending
        .store(store.pending_results() as u32, Ordering::SeqCst);
    if result.is_err() || !store.state().is_ok_and(|state| !state.degraded) {
        flags.blocked.store(true, Ordering::SeqCst);
    }
}
fn management_unconfirmed(clear: bool) -> AppError {
    AppError::new(if clear {
        ErrorCode::UsageClearUnconfirmed
    } else {
        ErrorCode::UsageQueryUnavailable
    })
}
fn management_result<T>(
    store: &mut UsageStore,
    flags: &Shared,
    reply: oneshot::Sender<AppResult<T>>,
    deadline: Instant,
    clear: bool,
    work: impl FnOnce(&mut UsageStore) -> AppResult<T>,
) {
    let result = if reply.is_closed() || Instant::now() >= deadline {
        Err(management_unconfirmed(clear))
    } else if flags.blocked.load(Ordering::SeqCst) {
        Err(AppError::new(ErrorCode::UsageClearBusy))
    } else {
        work(store)
    };
    #[cfg(test)]
    {
        let hook = flags.hook.lock().unwrap().clone();
        if let Some(hook) = hook
            && clear
            && result.is_ok()
            && matches!(hook.phase, HookPhase::ClearCommitted)
        {
            hook.entered.notify_one();
            hook.release.wait();
            hook.completed.notify_one();
        }
    }
    flags
        .pending
        .store(store.pending_results() as u32, Ordering::SeqCst);
    if !store.state().is_ok_and(|state| !state.degraded) {
        flags.blocked.store(true, Ordering::SeqCst);
    }
    // Busy/changed/preview timeout never turn healthy inference accounting off.
    // Preserve the actual operation result separately from subsequent status.
    let _ = reply.send(result);
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
    async fn idle_writer_expires_owned_details_without_any_new_dispatch() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-idle-retention-")
            .tempdir()
            .unwrap();
        let now = tagma_core::health::now_ms().unwrap();
        let start = now - 30 * 86_400_000 + 2000;
        let mut store = UsageStore::open(temp.path(), now).unwrap();
        let request = RequestStart {
            id: uuid::Uuid::new_v4().to_string(),
            provider_id: uuid::Uuid::new_v4().to_string(),
            model: "owned idle fixture".into(),
            config_revision: 1,
            team_revision: None,
            started_ms: start,
        };
        store.begin_request(&request).unwrap();
        store
            .finish(Completion {
                request_id: request.id,
                ordinal: None,
                finished_ms: start + 1,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens::default(),
            })
            .unwrap();
        drop(store);
        let ledger = Ledger::open(temp.path()).unwrap();
        let count = || {
            let db = rusqlite::Connection::open_with_flags(
                temp.path().join("usage.sqlite3"),
                rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
            )
            .unwrap();
            db.query_row("SELECT count(*) FROM usage_requests", [], |row| {
                row.get::<_, i64>(0)
            })
            .unwrap()
        };
        assert_eq!(count(), 1);
        tokio::time::timeout(Duration::from_secs(5), async {
            while count() != 0 {
                tokio::time::sleep(Duration::from_millis(30)).await;
            }
        })
        .await
        .unwrap();
        assert!(!ledger.shared.blocked.load(Ordering::SeqCst));
        let db = rusqlite::Connection::open_with_flags(
            temp.path().join("usage.sqlite3"),
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .unwrap();
        assert_eq!(
            db.query_row("SELECT sum(count) FROM usage_daily", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
        drop(db);
        drop(ledger);
        println!(
            "Real idle writer timer path:owned detail crosses30days then disappears with no dispatch/management/new request;daily1 retained,healthy;test timer50ms,production60s;worker joins on drop"
        );
    }
    #[test]
    fn idle_retention_never_replays_pending_results_or_clears_a_failure_fence() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-idle-retention-")
            .tempdir()
            .unwrap();
        let now = tagma_core::health::now_ms().unwrap();
        let mut store = UsageStore::open(temp.path(), now).unwrap();
        let request = RequestStart {
            id: uuid::Uuid::new_v4().to_string(),
            provider_id: uuid::Uuid::new_v4().to_string(),
            model: "owned idle pending".into(),
            config_revision: 1,
            team_revision: None,
            started_ms: now,
        };
        store.begin_request(&request).unwrap();
        let db = rusqlite::Connection::open(temp.path().join("usage.sqlite3")).unwrap();
        db.execute_batch("CREATE TRIGGER owned_idle_fail BEFORE UPDATE ON usage_requests BEGIN SELECT RAISE(ABORT,'owned result fault');END;").unwrap();
        assert!(
            store
                .finish(Completion {
                    request_id: request.id,
                    ordinal: None,
                    finished_ms: now + 1,
                    outcome: Outcome::Succeeded,
                    error_code: None,
                    tokens: Tokens::default()
                })
                .is_err()
        );
        db.execute_batch("DROP TRIGGER owned_idle_fail").unwrap();
        let flags = Shared {
            blocked: AtomicBool::new(true),
            pending: AtomicU32::new(1),
            hook: Mutex::new(None),
        };
        idle_retention(&mut store, &flags, Ok(now + 60000));
        assert_eq!(store.pending_results(), 1);
        assert!(store.state().unwrap().degraded);
        assert!(flags.blocked.load(Ordering::SeqCst));
        store.retry_pending().unwrap();
        flags.blocked.store(false, Ordering::SeqCst);
        idle_retention(
            &mut store,
            &flags,
            Err(AppError::new(ErrorCode::InternalError)),
        );
        assert!(flags.blocked.load(Ordering::SeqCst));
        idle_retention(&mut store, &flags, Ok(now + 60000));
        assert!(flags.blocked.load(Ordering::SeqCst));
        println!(
            "Idle tick:existing pending1 never retried despite removed storage fault;clock failure fences healthy store and later tick cannot silently recover"
        );
    }
    #[tokio::test]
    async fn full_or_abandoned_management_never_mutates_or_blocks_accounting() {
        // Isolated bounded channel proves full-management behavior, without a
        // storage worker or queueing inference on an unrelated application.
        let (sender, receiver) = mpsc::sync_channel(1);
        sender
            .try_send(Message {
                operation: Operation::Recover,
                reply: None,
                deadline: Instant::now() + BUDGET,
            })
            .unwrap();
        let stub = Ledger {
            sender: Mutex::new(Some(sender)),
            worker: None,
            shared: Arc::new(Shared {
                blocked: AtomicBool::new(false),
                pending: AtomicU32::new(0),
                hook: Mutex::new(None),
            }),
        };
        let range = UsageRange {
            start_ms: 0.0,
            end_ms: 86_400_000.0,
        };
        assert_eq!(
            stub.prepare_clear(range).await.unwrap_err().code,
            ErrorCode::UsageClearBusy
        );
        assert!(!stub.degraded());
        drop(stub);
        drop(receiver);
        let temp = tempfile::Builder::new()
            .prefix("tagma-clear-abandoned-")
            .tempdir()
            .unwrap();
        let ledger = Ledger::open(temp.path()).unwrap();
        let now = tagma_core::health::now_ms().unwrap();
        let day = 86_400_000;
        let end = now / day * day;
        let range = UsageRange {
            start_ms: (end - day) as f64,
            end_ms: end as f64,
        };
        let plan = ledger.prepare_clear(range.clone()).await.unwrap();
        let hook = Arc::new(TestHook {
            phase: HookPhase::BeforeRecover,
            entered: Default::default(),
            release: Default::default(),
            completed: Default::default(),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let recovering = {
            let ledger = ledger.clone();
            tokio::spawn(async move { ledger.recover().await })
        };
        tokio::time::timeout(Duration::from_secs(2), hook.entered.notified())
            .await
            .unwrap();
        let (reply, expired) = oneshot::channel();
        ledger
            .sender
            .lock()
            .unwrap()
            .as_ref()
            .unwrap()
            .try_send(Message {
                operation: Operation::Manage(Management::Clear {
                    plan: plan.clone(),
                    reply,
                }),
                reply: None,
                deadline: Instant::now() - Duration::from_millis(1),
            })
            .unwrap();
        let (reply, closed) = oneshot::channel();
        drop(closed);
        ledger
            .sender
            .lock()
            .unwrap()
            .as_ref()
            .unwrap()
            .try_send(Message {
                operation: Operation::Manage(Management::Clear { plan, reply }),
                reply: None,
                deadline: Instant::now() + BUDGET,
            })
            .unwrap();
        *ledger.shared.hook.lock().unwrap() = None;
        hook.release.open();
        recovering.await.unwrap().unwrap();
        assert_eq!(
            tokio::time::timeout(Duration::from_secs(1), expired)
                .await
                .unwrap()
                .unwrap()
                .unwrap_err()
                .code,
            ErrorCode::UsageClearUnconfirmed
        );
        assert_eq!(ledger.prepare_clear(range).await.unwrap().generation, "0");
        assert!(!ledger.degraded());
        drop(ledger);
        println!(
            "Usage management:full bounded channel ->busy without fence;actual writer skips expired and preclosed clear before mutation,epoch remains0,healthy accounting retained"
        );
    }
    #[tokio::test]
    async fn management_busy_and_changed_do_not_fence_healthy_inference() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-clear-management-")
            .tempdir()
            .unwrap();
        let ledger = Ledger::open(temp.path()).unwrap();
        let now = tagma_core::health::now_ms().unwrap();
        let day = 86_400_000;
        let end = now / day * day;
        let range = UsageRange {
            start_ms: (end - day) as f64,
            end_ms: end as f64,
        };
        let plan = ledger.prepare_clear(range.clone()).await.unwrap();
        let request = ledger
            .begin(
                RequestStart {
                    id: uuid::Uuid::new_v4().to_string(),
                    provider_id: uuid::Uuid::new_v4().to_string(),
                    model: "clear-busy".into(),
                    config_revision: 1,
                    team_revision: None,
                    started_ms: now,
                },
                tokio::time::Instant::now() + Duration::from_secs(10),
            )
            .await
            .unwrap();
        assert_eq!(
            ledger.prepare_clear(range.clone()).await.unwrap_err().code,
            ErrorCode::UsageClearBusy
        );
        assert!(!ledger.degraded());
        assert_eq!(
            ledger.clear(plan.clone()).await.unwrap_err().code,
            ErrorCode::UsageClearBusy
        );
        assert!(!ledger.degraded());
        request.finish(None).await.unwrap();
        assert_eq!(
            ledger.clear(plan).await.unwrap_err().code,
            ErrorCode::UsageClearChanged
        );
        assert!(!ledger.degraded());
        let plan = ledger.prepare_clear(range).await.unwrap();
        ledger.clear(plan).await.unwrap();
        assert!(!ledger.degraded());
        ledger.shared.blocked.store(true, Ordering::SeqCst);
        assert_eq!(
            ledger
                .prepare_clear(UsageRange {
                    start_ms: (end - day) as f64,
                    end_ms: end as f64
                })
                .await
                .unwrap_err()
                .code,
            ErrorCode::UsageClearBusy,
            "unconfirmed admission flags also require explicit recovery"
        );
        ledger.recover().await.unwrap();
        assert!(!ledger.degraded());
        drop(request);
        drop(ledger);
        println!(
            "Usage management:running request ->busy,changed preview ->changed;neither blocks healthy accounting;new preview clear succeeds"
        );
    }
    #[tokio::test]
    async fn clear_wait_timeout_keeps_durable_receipt_without_replaying_deletion() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-clear-late-")
            .tempdir()
            .unwrap();
        let now = tagma_core::health::now_ms().unwrap();
        let day = 86_400_000;
        let end = now / day * day;
        {
            let mut store = UsageStore::open(temp.path(), now).unwrap();
            let id = uuid::Uuid::new_v4().to_string();
            store
                .begin_request(&RequestStart {
                    id: id.clone(),
                    provider_id: uuid::Uuid::new_v4().to_string(),
                    model: "owned-clear-late".into(),
                    config_revision: 1,
                    team_revision: None,
                    started_ms: end - day + 100,
                })
                .unwrap();
            store
                .finish(Completion {
                    request_id: id,
                    ordinal: None,
                    finished_ms: end - day + 200,
                    outcome: Outcome::Succeeded,
                    error_code: None,
                    tokens: Tokens::default(),
                })
                .unwrap();
        }
        let ledger = Ledger::open(temp.path()).unwrap();
        let plan = ledger
            .prepare_clear(UsageRange {
                start_ms: (end - day) as f64,
                end_ms: end as f64,
            })
            .await
            .unwrap();
        assert_eq!(plan.requests, "1");
        let hook = Arc::new(TestHook {
            phase: HookPhase::ClearCommitted,
            entered: Default::default(),
            release: Default::default(),
            completed: Default::default(),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let pending = {
            let ledger = ledger.clone();
            let plan = plan.clone();
            tokio::spawn(async move { ledger.clear(plan).await })
        };
        tokio::time::timeout(Duration::from_secs(2), hook.entered.notified())
            .await
            .unwrap();
        let result = pending.await.unwrap();
        assert_eq!(result.unwrap_err().code, ErrorCode::UsageClearUnconfirmed);
        assert!(!ledger.degraded());
        *ledger.shared.hook.lock().unwrap() = None;
        hook.release.open();
        tokio::time::timeout(Duration::from_secs(1), hook.completed.notified())
            .await
            .unwrap();
        let receipt = ledger.clear(plan.clone()).await.unwrap();
        assert_eq!(receipt.plan, plan);
        assert_eq!(receipt.generation, "1");
        assert!(!ledger.degraded());
        let db = rusqlite::Connection::open(temp.path().join("usage.sqlite3")).unwrap();
        assert_eq!(
            db.query_row::<u32, _, _>("SELECT count(*) FROM usage_requests", [], |row| row.get(0))
                .unwrap(),
            0
        );
        drop(db);
        drop(ledger);
        println!(
            "Usage clear ACK:actual delete+epoch+receipt commit precedes800ms caller timeout;timeout remains unconfirmed,accounting healthy;same plan retry retrieves generation1 without replay"
        );
    }
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
            phase: HookPhase::AttemptCommitted,
            completed: Default::default(),
            entered: tokio::sync::Notify::new(),
            release: Default::default(),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let task = {
            let request = request.clone();
            tokio::spawn(async move { request.attempt(1, &provider, "ack-fixture").await })
        };
        tokio::time::timeout(Duration::from_secs(2), hook.entered.notified())
            .await
            .unwrap();
        assert!(task.await.unwrap().is_err());
        drop(request);
        tokio::time::sleep(Duration::from_millis(20)).await;
        hook.release.open();
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
            phase: HookPhase::FinishCommitted,
            completed: Default::default(),
            entered: Default::default(),
            release: Default::default(),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let task = tokio::spawn(async move { request.finish(None).await });
        tokio::time::timeout(Duration::from_secs(2), hook.entered.notified())
            .await
            .unwrap();
        let result = tokio::time::timeout(Duration::from_millis(400), task).await;
        let degraded = ledger.degraded();
        hook.release.open();
        ledger.recover().await.unwrap();
        assert!(matches!(result, Ok(Ok(Err(_)))));
        assert!(degraded);
        println!(
            "Usage accounting ACK:remaining150ms request budget ends wait while committed writer ACK is held;explicit recovery required"
        );
    }
    #[tokio::test]
    async fn recovery_timeout_retains_operation_failure_after_late_writer_completion() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-recovery-late-")
            .tempdir()
            .unwrap();
        let ledger = Ledger::open(temp.path()).unwrap();
        let request = ledger
            .begin(
                RequestStart {
                    id: uuid::Uuid::new_v4().to_string(),
                    provider_id: uuid::Uuid::new_v4().to_string(),
                    model: "recovery-late-fixture".into(),
                    config_revision: 1,
                    team_revision: None,
                    started_ms: tagma_core::health::now_ms().unwrap(),
                },
                tokio::time::Instant::now() + Duration::from_secs(10),
            )
            .await
            .unwrap();
        let db = rusqlite::Connection::open(temp.path().join("usage.sqlite3")).unwrap();
        db.execute_batch("CREATE TRIGGER owned_fail_recovery_result BEFORE UPDATE ON usage_requests BEGIN SELECT RAISE(ABORT,'owned recovery fixture'); END;").unwrap();
        assert!(request.finish(None).await.is_err());
        assert_eq!(ledger.pending(), 1);
        db.execute_batch("DROP TRIGGER owned_fail_recovery_result")
            .unwrap();
        drop(db);
        let hook = Arc::new(TestHook {
            phase: HookPhase::BeforeRecover,
            entered: Default::default(),
            release: Default::default(),
            completed: Default::default(),
        });
        *ledger.shared.hook.lock().unwrap() = Some(hook.clone());
        let task = {
            let ledger = ledger.clone();
            tokio::spawn(async move { ledger.recover().await })
        };
        tokio::time::timeout(Duration::from_secs(2), hook.entered.notified())
            .await
            .unwrap();
        let result = task.await.unwrap();
        assert!(result.is_err());
        hook.release.open();
        tokio::time::timeout(Duration::from_secs(1), hook.completed.notified())
            .await
            .unwrap();
        assert!(!ledger.degraded());
        assert_eq!(ledger.pending(), 0);
        assert!(
            result.is_err(),
            "a later clean snapshot cannot turn the timed-out operation into a successful acknowledgement"
        );
        println!(
            "SUP-008 bounded writer race:recover operation timed out/Err;writer later completed actual pending1->0 and degraded=false;original operation Err preserved for reply"
        );
    }
}
