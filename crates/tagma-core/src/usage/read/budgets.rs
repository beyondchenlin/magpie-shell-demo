//! Observations of retained registrations, not balances or dispatch limits.
use super::*;
use crate::budgets::{BudgetPeriod, BudgetRule};
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct BudgetObservation {
    pub rule_id: String,
    pub range: UsageRange,
    pub kind: UsageMetricKind,
    pub recorded_count: Option<String>,
    pub known_input_tokens: Option<String>,
    pub known_output_tokens: Option<String>,
    pub unknown_input_records: Option<String>,
    pub unknown_output_records: Option<String>,
    pub token_total: Option<String>,
    pub request_progress_bps: Option<u32>,
    pub token_progress_bps: Option<u32>,
    pub request_reached: Option<bool>,
    pub token_reached: Option<bool>,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct BudgetObservations {
    pub config_revision: u32,
    pub info: UsageReadInfo,
    /// Every total is over retained local registrations. There is no remaining
    /// allowance, price, provider balance or bill encoded in this projection.
    pub records: Vec<BudgetObservation>,
}
fn range(db: &Connection, period: BudgetPeriod, now: u64) -> AppResult<UsageRange> {
    let sql = match period {
        BudgetPeriod::UtcDay => {
            "SELECT CAST(strftime('%s',?1/1000,'unixepoch','start of day') AS INTEGER)*1000,CAST(strftime('%s',?1/1000,'unixepoch','start of day','+1 day') AS INTEGER)*1000"
        }
        BudgetPeriod::UtcMonth => {
            "SELECT CAST(strftime('%s',?1/1000,'unixepoch','start of month') AS INTEGER)*1000,CAST(strftime('%s',?1/1000,'unixepoch','start of month','+1 month') AS INTEGER)*1000"
        }
    };
    let range = db
        .query_row(sql, [time(now)?], |row| {
            Ok(UsageRange {
                start_ms: timestamp(row, 0)?,
                end_ms: timestamp(row, 1)?,
            })
        })
        .map_err(unavailable)?;
    range.validate(true)?;
    Ok(range)
}
fn decimal(value: &str) -> AppResult<u128> {
    value.parse().map_err(unavailable)
}
fn progress(value: Option<u128>, limit: Option<&str>) -> AppResult<(Option<u32>, Option<bool>)> {
    let (Some(value), Some(limit)) = (value, limit) else {
        return Ok((None, None));
    };
    let limit = crate::budgets::limit(limit).map_err(unavailable)? as u128;
    let reached = value >= limit;
    let bps = if reached {
        10000
    } else {
        (value * 10000 / limit) as u32
    };
    Ok((Some(bps), Some(reached)))
}
fn project(
    rule: &BudgetRule,
    range: UsageRange,
    total: Option<UsageSummaryTotals>,
) -> AppResult<BudgetObservation> {
    let count = total.as_ref().map(|total| total.total.clone());
    let tokens = match total
        .as_ref()
        .map(|total| (&total.input_total, &total.output_total))
    {
        Some((Some(input), Some(output))) => Some(
            decimal(input)?
                .checked_add(decimal(output)?)
                .ok_or_else(|| unavailable("budget token overflow"))?,
        ),
        _ => None,
    };
    let (request_progress_bps, request_reached) = progress(
        count.as_deref().map(decimal).transpose()?,
        rule.spec.request_limit.as_deref(),
    )?;
    let (token_progress_bps, token_reached) = progress(tokens, rule.spec.token_limit.as_deref())?;
    Ok(BudgetObservation {
        rule_id: rule.id.clone(),
        range,
        kind: rule.spec.scope.metric_kind(),
        recorded_count: count,
        known_input_tokens: total.as_ref().map(|t| t.input_known.clone()),
        known_output_tokens: total.as_ref().map(|t| t.output_known.clone()),
        unknown_input_records: total.as_ref().map(|t| t.input_unknown.clone()),
        unknown_output_records: total.as_ref().map(|t| t.output_unknown.clone()),
        token_total: tokens.map(|n| n.to_string()),
        request_progress_bps,
        token_progress_bps,
        request_reached,
        token_reached,
    })
}
fn observe_in(
    directory: &Path,
    source: Option<&Connection>,
    calendar: &Connection,
    rules: &[BudgetRule],
    revision: u32,
    now: u64,
    cancel: &UsageReadCancellation,
) -> AppResult<BudgetObservations> {
    let mut info = read_info(source, directory)?;
    info.observed_ms = now as f64;
    let mut records = Vec::with_capacity(rules.len());
    for rule in rules {
        cancel.check()?;
        let range = range(calendar, rule.spec.period, now)?;
        let total = if let Some(db) = source {
            let query = UsageSummaryQuery {
                protocol_version: PROTOCOL_VERSION,
                range: range.clone(),
                filter: rule.spec.scope.filter(),
                kind: rule.spec.scope.metric_kind(),
                cursor: None,
                limit: 1,
            };
            let (start, end) = range.validate(true)?;
            Some(totals(db, &query, start, end, cancel)?)
        } else {
            None
        };
        records.push(project(rule, range, total)?);
    }
    bounded(
        BudgetObservations {
            config_revision: revision,
            info,
            records,
        },
        cancel,
    )
}
pub fn observe(
    directory: &Path,
    rules: &[BudgetRule],
    config_revision: u32,
    now_ms: u64,
    cancel: &UsageReadCancellation,
) -> AppResult<BudgetObservations> {
    checked(cancel, || {
        crate::budgets::validate_rules(rules).map_err(unavailable)?;
        if now_ms as f64 > JS_MAX {
            return Err(invalid());
        }
        if let Some(mut db) = open(directory, cancel)? {
            let tx = db.transaction().map_err(unavailable)?;
            observe_in(
                directory,
                Some(&tx),
                &tx,
                rules,
                config_revision,
                now_ms,
                cancel,
            )
        } else {
            // Calendar arithmetic only, with no persistent tables or fake ledger.
            let memory = Connection::open_in_memory().map_err(unavailable)?;
            cancel.bind(&memory)?;
            memory
                .execute_batch("PRAGMA cache_size=-512;PRAGMA temp_store=MEMORY;")
                .map_err(unavailable)?;
            observe_in(
                directory,
                None,
                &memory,
                rules,
                config_revision,
                now_ms,
                cancel,
            )
        }
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        budgets::{BudgetScope, BudgetSpec},
        usage::{AttemptStart, Completion, Outcome, RequestStart, Tokens, UsageStore},
    };
    const NOW: u64 = 1709208000000;
    const TODAY: u64 = 1709164800000;
    fn rule(
        scope: BudgetScope,
        period: BudgetPeriod,
        requests: Option<&str>,
        tokens: Option<&str>,
    ) -> BudgetRule {
        BudgetRule {
            id: uuid::Uuid::new_v4().to_string(),
            spec: BudgetSpec {
                name: "owned soft observation".into(),
                scope,
                period,
                request_limit: requests.map(str::to_owned),
                token_limit: tokens.map(str::to_owned),
            },
        }
    }
    fn request(store: &mut UsageStore, at: u64, provider: &str, model: &str, team: bool) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        store
            .begin_request(&RequestStart {
                id: id.clone(),
                provider_id: provider.into(),
                model: model.into(),
                config_revision: 7,
                team_revision: team.then_some(1),
                started_ms: at,
            })
            .unwrap();
        id
    }
    fn attempt(
        store: &mut UsageStore,
        id: &str,
        ordinal: u32,
        at: u64,
        provider: &str,
        model: &str,
        tokens: Tokens,
    ) {
        store
            .begin_attempt(&AttemptStart {
                request_id: id.into(),
                ordinal,
                provider_id: provider.into(),
                model: model.into(),
                started_ms: at,
            })
            .unwrap();
        store
            .finish(Completion {
                request_id: id.into(),
                ordinal: Some(ordinal),
                finished_ms: at + 1,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens,
            })
            .unwrap();
    }
    fn finish(store: &mut UsageStore, id: String, at: u64) {
        store
            .finish(Completion {
                request_id: id,
                ordinal: None,
                finished_ms: at,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens::default(),
            })
            .unwrap();
    }
    #[test]
    fn utc_periods_and_missing_storage_are_unknown_and_never_initialize() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-budget-observe-")
            .tempdir()
            .unwrap();
        let rules = vec![
            rule(
                BudgetScope::AllAttempts,
                BudgetPeriod::UtcDay,
                Some("10"),
                Some("20"),
            ),
            rule(
                BudgetScope::AllAttempts,
                BudgetPeriod::UtcMonth,
                Some("10"),
                None,
            ),
        ];
        let report = observe(temp.path(), &rules, 9, NOW, &Default::default()).unwrap();
        assert_eq!(report.config_revision, 9);
        assert_eq!(report.info.observed_ms, NOW as f64);
        assert!(matches!(
            report.info.availability,
            UsageAvailability::NotCreated
        ));
        assert_eq!(report.records[0].range.start_ms, TODAY as f64);
        assert_eq!(report.records[0].range.end_ms, 1709251200000.0);
        assert_eq!(report.records[1].range.start_ms, 1706745600000.0);
        assert_eq!(report.records[1].range.end_ms, 1709251200000.0);
        for row in report.records {
            assert_eq!(row.recorded_count, None);
            assert_eq!(row.token_total, None);
            assert_eq!(row.request_progress_bps, None);
            assert_eq!(row.token_reached, None);
        }
        let december = observe(temp.path(), &rules, 9, 1735646400000, &Default::default()).unwrap();
        assert_eq!(december.records[1].range.start_ms, 1733011200000.0);
        assert_eq!(december.records[1].range.end_ms, 1735689600000.0);
        assert_eq!(std::fs::read_dir(temp.path()).unwrap().count(), 0);
        println!(
            "Budget observations:no store ->unknown counts/tokens/ratios,zero files;UTC leap February29 and December/year boundary verified,one pinned observation time"
        );
    }
    #[test]
    fn scopes_separate_team_requests_and_actual_attempts_and_unknowns_hide_token_ratio() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-budget-observe-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), NOW).unwrap();
        let a = uuid::Uuid::new_v4().to_string();
        let b = uuid::Uuid::new_v4().to_string();
        let id = request(&mut store, TODAY + 100, &b, "tagma/budget-team", true);
        attempt(
            &mut store,
            &id,
            1,
            TODAY + 110,
            &a,
            "review",
            Tokens {
                input: Some(2),
                output: Some(1),
            },
        );
        attempt(
            &mut store,
            &id,
            2,
            TODAY + 120,
            &b,
            "answer",
            Tokens {
                input: Some(3),
                output: Some(2),
            },
        );
        finish(&mut store, id, TODAY + 130);
        let id = request(&mut store, TODAY - DAY + 100, &a, "solo", false);
        attempt(
            &mut store,
            &id,
            1,
            TODAY - DAY + 110,
            &a,
            "review",
            Tokens {
                input: None,
                output: Some(0),
            },
        );
        finish(&mut store, id, TODAY - DAY + 120);
        let rules = vec![
            rule(
                BudgetScope::AllAttempts,
                BudgetPeriod::UtcDay,
                Some("3"),
                Some("16"),
            ),
            rule(
                BudgetScope::AllAttempts,
                BudgetPeriod::UtcMonth,
                Some("2"),
                Some("8"),
            ),
            rule(
                BudgetScope::Team {
                    public_id: "tagma/budget-team".into(),
                },
                BudgetPeriod::UtcDay,
                Some("1"),
                Some("8"),
            ),
            rule(
                BudgetScope::Model {
                    provider_id: a.clone(),
                    model_id: "review".into(),
                },
                BudgetPeriod::UtcDay,
                Some("4"),
                Some("3"),
            ),
            rule(
                BudgetScope::Provider { provider_id: b },
                BudgetPeriod::UtcDay,
                None,
                Some("10"),
            ),
        ];
        let before = std::fs::read(temp.path().join("usage.sqlite3")).unwrap();
        let report = observe(temp.path(), &rules, 12, NOW, &Default::default()).unwrap();
        assert_eq!(report.info.generation.as_deref(), Some("0"));
        assert_eq!(report.records[0].recorded_count.as_deref(), Some("2"));
        assert_eq!(report.records[0].token_total.as_deref(), Some("8"));
        assert_eq!(report.records[0].request_progress_bps, Some(6666));
        assert_eq!(report.records[0].token_progress_bps, Some(5000));
        assert_eq!(report.records[1].recorded_count.as_deref(), Some("3"));
        assert_eq!(report.records[1].token_total, None);
        assert_eq!(report.records[1].token_progress_bps, None);
        assert_eq!(report.records[1].request_reached, Some(true));
        assert_eq!(report.records[1].known_input_tokens.as_deref(), Some("5"));
        assert_eq!(
            report.records[1].unknown_input_records.as_deref(),
            Some("1")
        );
        assert_eq!(report.records[2].kind, UsageMetricKind::Request);
        assert_eq!(report.records[2].recorded_count.as_deref(), Some("1"));
        assert_eq!(report.records[2].token_total.as_deref(), Some("8"));
        assert_eq!(report.records[3].token_total.as_deref(), Some("3"));
        assert_eq!(report.records[4].token_total.as_deref(), Some("5"));
        assert_eq!(
            std::fs::read(temp.path().join("usage.sqlite3")).unwrap(),
            before
        );
        let id = request(&mut store, TODAY + 200, &a, "inflight", false);
        store
            .begin_attempt(&AttemptStart {
                request_id: id,
                ordinal: 1,
                provider_id: a,
                model: "review".into(),
                started_ms: TODAY + 210,
            })
            .unwrap();
        let report = observe(temp.path(), &rules, 12, NOW, &Default::default()).unwrap();
        assert_eq!(report.records[0].recorded_count.as_deref(), Some("3"));
        assert_eq!(report.records[0].token_total, None);
        assert_eq!(report.records[0].token_progress_bps, None);
        assert_eq!(
            report.records[0].unknown_input_records.as_deref(),
            Some("1")
        );
        assert_eq!(report.records[2].token_total.as_deref(), Some("8"));
        println!(
            "Budget scopes:UTC day2attempts/token8 vs month3/unknown;team1logical/token8,model/provider actual steps3/5tokens;inflight adds known registration with unknown tokens,no false0ratio;main DB unchanged by observation"
        );
    }
    #[test]
    fn exact_large_tokens_bounded_report_and_literal_filters_do_not_invent_balance() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-budget-observe-")
            .tempdir()
            .unwrap();
        let mut store = UsageStore::open(temp.path(), NOW).unwrap();
        let provider = uuid::Uuid::new_v4().to_string();
        for n in 0..3 {
            let provider = if n == 0 {
                provider.clone()
            } else {
                uuid::Uuid::new_v4().to_string()
            };
            let id = request(
                &mut store,
                TODAY + 100 + n * 20,
                &provider,
                "synthetic-large",
                false,
            );
            attempt(
                &mut store,
                &id,
                1,
                TODAY + 101 + n * 20,
                &provider,
                &"\"".repeat(256),
                Tokens {
                    input: Some(i64::MAX as u64),
                    output: Some(i64::MAX as u64),
                },
            );
            finish(&mut store, id, TODAY + 102 + n * 20);
        }
        let mut rules: Vec<_> = (0..32)
            .map(|_| {
                rule(
                    BudgetScope::AllAttempts,
                    BudgetPeriod::UtcMonth,
                    Some("9223372036854775807"),
                    Some("9223372036854775807"),
                )
            })
            .collect();
        rules[31].spec.scope = BudgetScope::Model {
            provider_id: provider,
            model_id: "' OR 1=1--".into(),
        };
        let report = observe(temp.path(), &rules, 77, NOW, &Default::default()).unwrap();
        assert_eq!(
            report.records[0].known_input_tokens.as_deref(),
            Some("27670116110564327421")
        );
        assert_eq!(
            report.records[0].token_total.as_deref(),
            Some("55340232221128654842")
        );
        assert_eq!(report.records[0].token_progress_bps, Some(10000));
        assert_eq!(report.records[0].token_reached, Some(true));
        assert_eq!(report.records[31].recorded_count.as_deref(), Some("0"));
        let json = serde_json::to_vec(&report).unwrap();
        assert!(json.len() <= 48 * 1024);
        assert!(!String::from_utf8(json.clone()).unwrap().contains("balance"));
        assert_eq!(report.records.len(), 32);
        println!(
            "Budget report:32rows={}bytes under48KiB,6*i64MAX token total exact55340232221128654842;clamped ratio only,counts not truncated;literal bound model filter matches0;no balance/bill/remaining field",
            json.len()
        );
    }
    #[test]
    fn unknown_or_cancelled_queries_are_never_repaired_or_empty_success() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-budget-observe-")
            .tempdir()
            .unwrap();
        let path = temp.path().join("usage.sqlite3");
        let db = Connection::open(&path).unwrap();
        db.execute_batch("CREATE TABLE personal(value);INSERT INTO personal VALUES(1);")
            .unwrap();
        drop(db);
        let before = std::fs::read(&path).unwrap();
        let rules = vec![rule(
            BudgetScope::AllAttempts,
            BudgetPeriod::UtcDay,
            Some("1"),
            None,
        )];
        assert_eq!(
            observe(temp.path(), &rules, 1, NOW, &Default::default())
                .unwrap_err()
                .code,
            ErrorCode::UsageQueryUnavailable
        );
        assert_eq!(std::fs::read(path).unwrap(), before);
        let cancel = UsageReadCancellation::default();
        cancel.cancel();
        assert_eq!(
            observe(temp.path(), &rules, 1, NOW, &cancel)
                .unwrap_err()
                .code,
            ErrorCode::UsageQueryCancelled
        );
        println!(
            "Budget read safety:unknown owned-shape source refused/preserved,already-cancelled query exits without source work;no fabricated empty success"
        );
    }
}
