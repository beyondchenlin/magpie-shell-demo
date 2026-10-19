//! Adapter for ReachFlow's existing confirmed collection and task APIs.
//! No draft confirmation, budget override, browser authorization or retry here.
use futures_util::StreamExt;
use serde_json::{Value, json};
use std::time::Duration;
use tagma_core::packs::{ReachFlowAction, ReachFlowRequest};

pub const LOCAL_SAMPLE: &str =
    "Tagma ReachFlow 固定素材：书店、咖啡店、修理店。仅验证本地队员协议，不执行采集。";
pub fn local_sample(text: &str) -> Result<String, &'static str> {
    if text != LOCAL_SAMPLE {
        return Err("REACHFLOW_SAMPLE_INVALID");
    }
    Ok(json!({"mode":"local_fixed_sample","network_used":false,"sources":[{"id":"fixture-1","title":"书店"},{"id":"fixture-2","title":"咖啡店"},{"id":"fixture-3","title":"修理店"}],"note":"本地固定素材及协议试跑通过；未调用研究服务或模型，未产生真实研究成果。"}).to_string())
}
pub async fn execute(request: &ReachFlowRequest) -> Result<String, &'static str> {
    let base = request.validate().map_err(|_| "REACHFLOW_INVALID_INPUT")?;
    let client = reqwest::Client::builder()
        .https_only(true)
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|_| "REACHFLOW_UNAVAILABLE")?;
    execute_with(&client, base.as_str(), request).await
}
async fn execute_with(
    client: &reqwest::Client,
    base: &str,
    input: &ReachFlowRequest,
) -> Result<String, &'static str> {
    let root = format!("{}v1/workspaces/{}", base, input.workspace_id);
    let (builder,mutation,expected_id)=match &input.action {
        ReachFlowAction::StartCollection{draft_id,confirmation_id,plan_digest,engine_selection_revision,idempotency_key}=>(
            client.post(format!("{root}/collection-drafts/{draft_id}/start")).header("Idempotency-Key",idempotency_key)
                .json(&json!({"confirmation_id":confirmation_id,"plan_digest":plan_digest,"engine_selection_revision":engine_selection_revision})),true,None),
        ReachFlowAction::TaskStatus{task_id}=>(client.get(format!("{root}/tasks/{task_id}")),false,Some(task_id)),
        ReachFlowAction::TaskReport{task_id}=>(client.get(format!("{root}/tasks/{task_id}/report")),false,Some(task_id)),
        ReachFlowAction::CancelTask{task_id}=>(client.post(format!("{root}/tasks/{task_id}/cancel")).json(&json!({"reason":"User requested cancellation in Tagma"})),true,Some(task_id)),
    };
    let unknown = if mutation {
        "REACHFLOW_RESULT_UNCONFIRMED"
    } else {
        "REACHFLOW_UNAVAILABLE"
    };
    let response = builder
        .bearer_auth(&input.access_token)
        .send()
        .await
        .map_err(|_| unknown)?;
    if !response.status().is_success() {
        return Err(match response.status().as_u16() {
            401 | 403 => "REACHFLOW_AUTH_REQUIRED",
            409 | 422 => "REACHFLOW_CONFIRMATION_REQUIRED",
            404 if matches!(input.action, ReachFlowAction::TaskReport { .. }) => {
                "REACHFLOW_REPORT_UNAVAILABLE"
            }
            _ => unknown,
        });
    }
    let mut data = Vec::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| unknown)?;
        if data.len() + chunk.len() > 256 * 1024 {
            return Err(unknown);
        }
        data.extend_from_slice(&chunk);
    }
    let value: Value = serde_json::from_slice(&data).map_err(|_| unknown)?;
    if let ReachFlowAction::TaskReport { task_id } = &input.action {
        let report = value.get("report").ok_or(unknown)?;
        let report_id = report
            .get("report_id")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty() && s.len() <= 128)
            .ok_or(unknown)?;
        let document = report.get("document").ok_or(unknown)?.to_string();
        let mut end = document.len().min(8192);
        while !document.is_char_boundary(end) {
            end -= 1;
        }
        return Ok(json!({"mode":"reachflow_report","task_id":task_id,"workspace_id":input.workspace_id,
            "report_id":report_id,"result_id":report.get("result_id").and_then(Value::as_str).unwrap_or(""),
            "document_preview":&document[..end],"preview_truncated":end<document.len(),
            "location":format!("ReachFlow / workspace {} / task {} / report",input.workspace_id,task_id)
        }).to_string());
    }
    let task = value.get("task").ok_or(unknown)?;
    let id = task
        .get("task_id")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty() && s.len() <= 128)
        .ok_or(unknown)?;
    let workspace = task
        .get("workspace_id")
        .and_then(Value::as_str)
        .ok_or(unknown)?;
    let state = task
        .get("state")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty() && s.len() <= 128)
        .ok_or(unknown)?;
    if workspace != input.workspace_id || expected_id.is_some_and(|expected| expected != id) {
        return Err(unknown);
    }
    // Whitelist metadata; never relay service credentials, prompts or raw errors.
    let gallery = task.get("gallery_preview");
    let count = |key: &str| gallery.and_then(|g| g.get(key)).and_then(Value::as_u64);
    Ok(json!({"mode":"reachflow_service","task_id":id,"workspace_id":workspace,"state":state,
        "candidate_count":count("candidate_count"),"final_count":count("final_count"),"failed_count":count("failed_count"),
        "location":format!("ReachFlow / workspace {workspace} / task {id}"),
        "cancellation_requested":matches!(input.action,ReachFlowAction::CancelTask{..}),
        "note":"服务返回的任务状态；收到取消响应不等于任务已取消。可单独查看任务报告；没有本地成果路径声明。"}).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        io::{Read, Write},
        sync::{Arc, Mutex},
    };
    fn request(action: ReachFlowAction) -> ReachFlowRequest {
        ReachFlowRequest {
            service_url: "https://service.example.invalid".into(),
            workspace_id: "owned-workspace".into(),
            access_token: "synthetic-test-token".into(),
            action,
        }
    }
    fn server(
        responses: Vec<(u16, Value)>,
    ) -> (String, Arc<Mutex<Vec<String>>>, std::thread::JoinHandle<()>) {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        listener.set_nonblocking(true).unwrap();
        let received = Arc::new(Mutex::new(Vec::new()));
        let output = received.clone();
        let thread = std::thread::spawn(move || {
            for (status, value) in responses {
                let start = std::time::Instant::now();
                let mut stream = loop {
                    match listener.accept() {
                        Ok((s, _)) => break s,
                        Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            assert!(start.elapsed() < Duration::from_secs(5));
                            std::thread::sleep(Duration::from_millis(5));
                        }
                        Err(e) => panic!("{e}"),
                    }
                };
                stream.set_nonblocking(false).unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(2)))
                    .unwrap();
                stream
                    .set_write_timeout(Some(Duration::from_secs(2)))
                    .unwrap();
                let mut bytes = Vec::new();
                let mut buf = [0u8; 1024];
                loop {
                    let n = stream.read(&mut buf).unwrap();
                    assert!(n > 0);
                    bytes.extend_from_slice(&buf[..n]);
                    assert!(bytes.len() < 16384);
                    if let Some(end) = bytes.windows(4).position(|w| w == b"\r\n\r\n") {
                        let header = String::from_utf8_lossy(&bytes[..end]);
                        let len = header
                            .lines()
                            .find_map(|line| {
                                line.to_ascii_lowercase()
                                    .strip_prefix("content-length:")
                                    .map(|n| n.trim().parse::<usize>().unwrap())
                            })
                            .unwrap_or(0);
                        if bytes.len() >= end + 4 + len {
                            break;
                        }
                    }
                }
                output
                    .lock()
                    .unwrap()
                    .push(String::from_utf8(bytes).unwrap());
                let body = value.to_string();
                let response = format!(
                    "HTTP/1.1 {status} Test\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                stream.write_all(response.as_bytes()).unwrap();
            }
        });
        (format!("http://{address}/"), received, thread)
    }
    #[tokio::test]
    async fn confirmed_start_status_and_remote_cancel_preserve_service_contract() {
        let task = |state| json!({"task":{"task_id":"owned-task","workspace_id":"owned-workspace","state":state,"gallery_preview":{"candidate_count":4,"final_count":2,"failed_count":1},"private_field":"not-forwarded"}});
        let (base, received, thread) = server(vec![
            (201, task("running")),
            (200, task("running")),
            (
                200,
                json!({"report":{"report_id":"report-1","result_id":"result-1","document":{"summary":"example result"},"private_field":"not-forwarded"}}),
            ),
            (202, task("cancelling")),
        ]);
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap();
        let start = request(ReachFlowAction::StartCollection {
            draft_id: "owned-draft".into(),
            confirmation_id: "confirmed-by-service".into(),
            plan_digest: "a".repeat(64),
            engine_selection_revision: 3,
            idempotency_key: "owned-key".into(),
        });
        assert!(start.validate().is_ok());
        let started = execute_with(&client, &base, &start).await.unwrap();
        assert!(started.contains("owned-task"));
        assert!(!started.contains("private_field"));
        let status = request(ReachFlowAction::TaskStatus {
            task_id: "owned-task".into(),
        });
        let status_result = execute_with(&client, &base, &status).await.unwrap();
        assert!(status_result.contains("running"));
        assert!(status_result.contains("\"final_count\":2"));
        let report = request(ReachFlowAction::TaskReport {
            task_id: "owned-task".into(),
        });
        let report_result = execute_with(&client, &base, &report).await.unwrap();
        assert!(report_result.contains("report-1"));
        assert!(report_result.contains("example result"));
        assert!(!report_result.contains("private_field"));
        let cancel = request(ReachFlowAction::CancelTask {
            task_id: "owned-task".into(),
        });
        let result = execute_with(&client, &base, &cancel).await.unwrap();
        assert!(result.contains("cancelling"));
        assert!(!result.contains("\"state\":\"cancelled\""));
        thread.join().unwrap();
        let calls = received.lock().unwrap();
        assert_eq!(calls.len(), 4);
        assert!(calls[0].starts_with(
            "POST /v1/workspaces/owned-workspace/collection-drafts/owned-draft/start "
        ));
        assert!(
            calls[0]
                .to_lowercase()
                .contains("idempotency-key: owned-key")
        );
        let body: Value = serde_json::from_str(calls[0].split_once("\r\n\r\n").unwrap().1).unwrap();
        assert_eq!(
            body,
            json!({"confirmation_id":"confirmed-by-service","plan_digest":"a".repeat(64),"engine_selection_revision":3})
        );
        assert!(calls[1].starts_with("GET /v1/workspaces/owned-workspace/tasks/owned-task "));
        assert!(
            calls[2].starts_with("GET /v1/workspaces/owned-workspace/tasks/owned-task/report ")
        );
        assert!(
            calls[3].starts_with("POST /v1/workspaces/owned-workspace/tasks/owned-task/cancel ")
        );
    }
    #[tokio::test]
    async fn denied_or_mismatched_response_is_not_a_successful_task() {
        let (base, _, thread) = server(vec![
            (403, json!({"error":"private service detail"})),
            (
                200,
                json!({"task":{"task_id":"other-task","workspace_id":"other","state":"done"}}),
            ),
            (404, json!({"error":"no report"})),
        ]);
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap();
        let input = request(ReachFlowAction::TaskStatus {
            task_id: "owned-task".into(),
        });
        assert_eq!(
            execute_with(&client, &base, &input).await.unwrap_err(),
            "REACHFLOW_AUTH_REQUIRED"
        );
        assert_eq!(
            execute_with(&client, &base, &input).await.unwrap_err(),
            "REACHFLOW_UNAVAILABLE"
        );
        let report = request(ReachFlowAction::TaskReport {
            task_id: "owned-task".into(),
        });
        assert_eq!(
            execute_with(&client, &base, &report).await.unwrap_err(),
            "REACHFLOW_REPORT_UNAVAILABLE"
        );
        thread.join().unwrap();
    }
    #[test]
    fn offline_sample_and_validation_do_not_imply_real_collection() {
        let result = local_sample(LOCAL_SAMPLE).unwrap();
        assert!(result.contains("\"network_used\":false"));
        assert!(local_sample("collect paid content").is_err());
        let mut input = request(ReachFlowAction::TaskStatus {
            task_id: "../other".into(),
        });
        assert!(input.validate().is_err());
        input.action = ReachFlowAction::TaskStatus {
            task_id: "owned-task".into(),
        };
        input.service_url = "http://service.example.invalid".into();
        assert!(input.validate().is_err());
        assert!(!format!("{input:?}").contains("synthetic-test-token"));
    }
}
