use super::{read::*, *};
fn range() -> UsageRange {
    UsageRange {
        start_ms: DAY as f64,
        end_ms: (2 * DAY) as f64,
    }
}
fn requests_query() -> UsageRequestsQuery {
    UsageRequestsQuery {
        protocol_version: 1,
        range: range(),
        filter: Default::default(),
        cursor: None,
        limit: 2,
    }
}
fn summary_query(kind: UsageMetricKind) -> UsageSummaryQuery {
    UsageSummaryQuery {
        protocol_version: 1,
        range: range(),
        filter: Default::default(),
        kind,
        cursor: None,
        limit: 2,
    }
}
fn request(provider: &str, target: &str, at: u64) -> RequestStart {
    RequestStart {
        id: uuid::Uuid::new_v4().to_string(),
        provider_id: provider.into(),
        model: target.into(),
        config_revision: 7,
        team_revision: Some(2),
        started_ms: at,
    }
}
fn finish(store: &mut UsageStore, request: &RequestStart, ordinal: Option<u32>, tokens: Tokens) {
    store
        .finish(Completion {
            request_id: request.id.clone(),
            ordinal,
            finished_ms: request.started_ms + 1000,
            outcome: Outcome::Succeeded,
            error_code: None,
            tokens,
        })
        .unwrap();
}
fn step(
    store: &mut UsageStore,
    request: &RequestStart,
    ordinal: u32,
    provider: &str,
    target: &str,
    tokens: Tokens,
) {
    store
        .begin_attempt(&AttemptStart {
            request_id: request.id.clone(),
            ordinal,
            provider_id: provider.into(),
            model: target.into(),
            started_ms: request.started_ms
                + ordinal as u64 * 100
                + if ordinal > 1 { 1000 } else { 0 },
        })
        .unwrap();
    let at = request.started_ms + ordinal as u64 * 100 + if ordinal > 1 { 1000 } else { 0 };
    store
        .finish(Completion {
            request_id: request.id.clone(),
            ordinal: Some(ordinal),
            finished_ms: at + 100,
            outcome: Outcome::Succeeded,
            error_code: None,
            tokens,
        })
        .unwrap();
}

#[test]
fn readonly_pages_details_and_totals_separate_requests_attempts_and_unknown_tokens() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-read-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let a = uuid::Uuid::new_v4().to_string();
    let b = uuid::Uuid::new_v4().to_string();
    let mut ids = Vec::new();
    for _ in 0..5 {
        let req = request(&b, "tagma/read-test@2", DAY + 10000);
        store.begin_request(&req).unwrap();
        step(
            &mut store,
            &req,
            1,
            &a,
            "alpha",
            Tokens {
                input: Some(5),
                output: Some(7),
            },
        );
        step(
            &mut store,
            &req,
            2,
            &b,
            "beta",
            Tokens {
                input: None,
                output: Some(3),
            },
        );
        store
            .finish(Completion {
                request_id: req.id.clone(),
                ordinal: None,
                finished_ms: req.started_ms + 2000,
                outcome: Outcome::Succeeded,
                error_code: None,
                tokens: Tokens::default(),
            })
            .unwrap();
        ids.push(req.id);
    }
    let failed = request(&b, "tagma/read-test@2", DAY + 20000);
    store.begin_request(&failed).unwrap();
    store
        .finish(Completion {
            request_id: failed.id.clone(),
            ordinal: None,
            finished_ms: failed.started_ms + 100,
            outcome: Outcome::Failed,
            error_code: Some("UPSTREAM_AUTH_FAILED".into()),
            tokens: Tokens::default(),
        })
        .unwrap();
    ids.push(failed.id.clone());
    let open = request(&b, "tagma/read-test@2", DAY + 30000);
    store.begin_request(&open).unwrap();
    store
        .begin_attempt(&AttemptStart {
            request_id: open.id.clone(),
            ordinal: 1,
            provider_id: a.clone(),
            model: "alpha".into(),
            started_ms: open.started_ms + 1,
        })
        .unwrap();
    ids.push(open.id.clone());
    let outside = request(&b, "outside", 2 * DAY);
    store.begin_request(&outside).unwrap();
    finish(&mut store, &outside, None, Tokens::default());
    let before = fs::read(temp.path().join("usage.sqlite3")).unwrap();
    let cancel = UsageReadCancellation::default();
    let mut query = requests_query();
    let mut got = Vec::new();
    loop {
        let page = read::requests(temp.path(), query.clone(), &cancel).unwrap();
        assert!(matches!(
            page.info.availability,
            UsageAvailability::Available
        ));
        assert!(page.records.len() <= 2);
        got.extend(page.records.into_iter().map(|r| r.request_id));
        if page.next_cursor.is_none() {
            break;
        }
        query.cursor = page.next_cursor;
    }
    assert_eq!(got.len(), 7);
    assert_eq!(
        got.iter().collect::<std::collections::HashSet<_>>().len(),
        7
    );
    ids.sort();
    got.sort();
    assert_eq!(
        ids, got,
        "same-timestamp keyset pages must neither skip nor duplicate requests"
    );
    let detail = read::details(
        temp.path(),
        UsageDetailsQuery {
            protocol_version: 1,
            request_id: ids
                .iter()
                .find(|id| **id != failed.id && **id != open.id)
                .unwrap()
                .clone(),
        },
        &cancel,
    )
    .unwrap();
    assert_eq!(detail.attempts.len(), 2);
    assert_eq!(detail.attempts[0].provider_id, a);
    assert_eq!(detail.attempts[1].provider_id, b);
    assert_eq!(detail.record.as_ref().unwrap().input_tokens, None);
    assert_eq!(detail.record.unwrap().output_tokens.as_deref(), Some("10"));
    let mut filter = requests_query();
    filter.filter.error_code = Some("UPSTREAM_AUTH_FAILED".into());
    let filtered = read::requests(temp.path(), filter, &cancel).unwrap();
    assert_eq!(filtered.records.len(), 1);
    assert_eq!(filtered.records[0].request_id, failed.id);
    let logical = read::summary(
        temp.path(),
        summary_query(UsageMetricKind::Request),
        &cancel,
    )
    .unwrap()
    .totals
    .unwrap();
    assert_eq!(logical.total, "7");
    assert_eq!(logical.completed, "6");
    assert_eq!(logical.unfinished, "1");
    assert_eq!(logical.input_known, "0");
    assert_eq!(logical.input_unknown, "7");
    assert_eq!(logical.input_total, None);
    assert_eq!(logical.output_known, "50");
    assert_eq!(logical.output_unknown, "2");
    let attempts = read::summary(
        temp.path(),
        summary_query(UsageMetricKind::Attempt),
        &cancel,
    )
    .unwrap()
    .totals
    .unwrap();
    assert_eq!(attempts.total, "11");
    assert_eq!(attempts.completed, "10");
    assert_eq!(attempts.unfinished, "1");
    assert_eq!(attempts.input_known, "25");
    assert_eq!(attempts.input_unknown, "6");
    assert_eq!(attempts.output_known, "50");
    assert_eq!(attempts.output_total, None);
    assert_eq!(fs::read(temp.path().join("usage.sqlite3")).unwrap(), before);
    assert!(!temp.path().join("config.sqlite3").exists());
    println!(
        "Usage read:7 logical/11attempt records including unfinished1;unknown totals stay null;same-time pages no duplicates;detail original targets/revisions and error filter verified;main DB unchanged"
    );
}
#[test]
fn decimal_totals_do_not_round_large_tokens_and_literal_filters_are_bounded() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-read-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let provider = uuid::Uuid::new_v4().to_string();
    for index in 0..3 {
        let model = format!("large-{index}");
        let req = request(&provider, &model, DAY + 10000);
        store.begin_request(&req).unwrap();
        step(
            &mut store,
            &req,
            1,
            &provider,
            &model,
            Tokens {
                input: Some(i64::MAX as u64),
                output: Some(0),
            },
        );
        finish(&mut store, &req, None, Tokens::default());
    }
    let cancel = UsageReadCancellation::default();
    let data = read::summary(
        temp.path(),
        summary_query(UsageMetricKind::Attempt),
        &cancel,
    )
    .unwrap();
    let totals = data.totals.unwrap();
    let exact = (i64::MAX as u128 * 3).to_string();
    assert_eq!(totals.input_total.as_deref(), Some(exact.as_str()));
    assert_eq!(totals.output_total.as_deref(), Some("0"));
    assert_eq!(totals.input_unknown, "0");
    assert!(
        serde_json::to_string(&totals)
            .unwrap()
            .contains(&format!("\"{exact}\""))
    );
    let mut cursor = summary_query(UsageMetricKind::Attempt);
    let mut models = Vec::new();
    loop {
        let page = read::summary(temp.path(), cursor.clone(), &cancel).unwrap();
        models.extend(page.records.into_iter().map(|r| r.model));
        if page.next_cursor.is_none() {
            break;
        }
        cursor.cursor = page.next_cursor;
    }
    models.sort();
    assert_eq!(models, ["large-0", "large-1", "large-2"]);
    let model = "x' OR 1=1 --";
    let req = request(&provider, model, DAY + 30000);
    store.begin_request(&req).unwrap();
    finish(&mut store, &req, None, Tokens::default());
    let mut query = requests_query();
    query.filter.model = Some(model.into());
    let data = read::requests(temp.path(), query, &cancel).unwrap();
    assert_eq!(data.records.len(), 1);
    assert_eq!(data.records[0].request_id, req.id);
    println!(
        "Usage read exact decimal tokens:3*i64::MAX preserved as {exact},known zero remains explicit;summary keyset and literal SQL-bound model filter verified"
    );
}
#[test]
fn absent_unknown_and_invalid_queries_never_initialize_or_invent_empty_success() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-read-")
        .tempdir()
        .unwrap();
    let cancel = UsageReadCancellation::default();
    let page = read::summary(
        temp.path(),
        summary_query(UsageMetricKind::Request),
        &cancel,
    )
    .unwrap();
    assert!(matches!(
        page.info.availability,
        UsageAvailability::NotCreated
    ));
    assert!(page.totals.is_none());
    assert_eq!(fs::read_dir(temp.path()).unwrap().count(), 0);
    let mut query = requests_query();
    query.limit = 33;
    assert_eq!(
        read::requests(temp.path(), query, &cancel)
            .unwrap_err()
            .code,
        ErrorCode::InvalidInput
    );
    let mut partial = summary_query(UsageMetricKind::Attempt);
    partial.range.start_ms += 1.0;
    assert!(read::summary(temp.path(), partial, &cancel).is_err());
    let mut unsupported = summary_query(UsageMetricKind::Request);
    unsupported.filter.error_code = Some("UPSTREAM_ERROR".into());
    assert!(read::summary(temp.path(), unsupported, &cancel).is_err());
    fs::write(
        temp.path().join("usage-initialization.json"),
        b"owned pending marker fixture",
    )
    .unwrap();
    assert!(read::requests(temp.path(), requests_query(), &cancel).is_err());
    fs::remove_file(temp.path().join("usage-initialization.json")).unwrap();
    fs::write(
        temp.path().join("usage.sqlite3"),
        b"unknown preserve fixture",
    )
    .unwrap();
    let original = fs::read(temp.path().join("usage.sqlite3")).unwrap();
    assert_eq!(
        read::requests(temp.path(), requests_query(), &cancel)
            .unwrap_err()
            .code,
        ErrorCode::UsageQueryUnavailable
    );
    assert_eq!(
        fs::read(temp.path().join("usage.sqlite3")).unwrap(),
        original
    );
    cancel.cancel();
    assert_eq!(
        read::requests(temp.path(), requests_query(), &cancel)
            .unwrap_err()
            .code,
        ErrorCode::UsageQueryCancelled
    );
    println!(
        "Usage read:not-created is explicit unknown availability;pending/unknown stores refused and preserved;invalid or unsupported filters rejected;cancelled query does not open a store"
    );
}
#[test]
fn escaped_page_fields_and_sixteen_attempt_details_stay_within_response_bounds() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-read-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let provider = uuid::Uuid::new_v4().to_string();
    let target = "\\\"".repeat(128);
    for index in 0..33 {
        let req = request(&provider, &target, DAY + 10000 + index);
        store.begin_request(&req).unwrap();
        finish(&mut store, &req, None, Tokens::default());
    }
    let mut query = requests_query();
    query.limit = 32;
    let cancel = UsageReadCancellation::default();
    let page = read::requests(temp.path(), query, &cancel).unwrap();
    assert_eq!(page.records.len(), 32);
    assert!(page.next_cursor.is_some());
    assert!(serde_json::to_vec(&page).unwrap().len() <= 48 * 1024);
    let req = request(&provider, &target, DAY + 50000);
    store.begin_request(&req).unwrap();
    for ordinal in 1..=16 {
        step(
            &mut store,
            &req,
            ordinal,
            &provider,
            &target,
            Tokens::default(),
        );
    }
    store
        .finish(Completion {
            request_id: req.id.clone(),
            ordinal: None,
            finished_ms: req.started_ms + 3000,
            outcome: Outcome::Succeeded,
            error_code: None,
            tokens: Tokens::default(),
        })
        .unwrap();
    let detail = read::details(
        temp.path(),
        UsageDetailsQuery {
            protocol_version: 1,
            request_id: req.id,
        },
        &cancel,
    )
    .unwrap();
    assert_eq!(detail.attempts.len(), 16);
    assert!(serde_json::to_vec(&detail).unwrap().len() <= 48 * 1024);
    println!(
        "Usage read bounds:32 escaped maximum-model fields and16 attempt details fit48KiB response;next page cursor retained"
    );
}
#[test]
fn contradictory_rows_are_unavailable_and_are_not_repaired_by_reading() {
    let temp = tempfile::Builder::new()
        .prefix("tagma-usage-read-")
        .tempdir()
        .unwrap();
    let mut store = UsageStore::open(temp.path(), DAY).unwrap();
    let provider = uuid::Uuid::new_v4().to_string();
    let req = request(&provider, "corrupt-fixture", DAY + 10000);
    store.begin_request(&req).unwrap();
    finish(&mut store, &req, None, Tokens::default());
    store
        .db
        .execute(
            "UPDATE usage_requests SET error_code='UPSTREAM_ERROR' WHERE id=?1",
            [&req.id],
        )
        .unwrap();
    let cancel = UsageReadCancellation::default();
    assert_eq!(
        read::requests(temp.path(), requests_query(), &cancel)
            .unwrap_err()
            .code,
        ErrorCode::UsageQueryUnavailable
    );
    let code: String = store
        .db
        .query_row("SELECT error_code FROM usage_requests", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        code, "UPSTREAM_ERROR",
        "reader must preserve the contradictory source row"
    );
    store
        .db
        .execute(
            "UPDATE usage_daily SET input_unknown=count+1 WHERE kind='request'",
            [],
        )
        .unwrap();
    assert_eq!(
        read::summary(
            temp.path(),
            summary_query(UsageMetricKind::Request),
            &cancel
        )
        .unwrap_err()
        .code,
        ErrorCode::UsageQueryUnavailable
    );
    println!(
        "Usage read integrity:contradictory success/error or unknown-count>count yields unavailable,preserves source,never fake empty/zero"
    );
}
