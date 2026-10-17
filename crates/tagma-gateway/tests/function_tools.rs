//! Actual owned sidecar and loopback only; never executes a returned function.
use axum::{
    Json, Router,
    body::{Body, Bytes},
    extract::Request,
    response::IntoResponse,
    routing::post,
};
use futures_util::FutureExt;
use serde_json::{Value, json};
use std::{
    convert::Infallible,
    path::Path,
    sync::{Arc, Mutex},
    time::Duration,
};
use tagma_core::{credentials::SystemCredentials, teams::*, *};
use tagma_runtime::GatewayManager;
struct Server(tokio::task::JoinHandle<()>);
impl Drop for Server {
    fn drop(&mut self) {
        self.0.abort();
    }
}
fn port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}
fn call() -> Value {
    json!({"id":"owned_call","type":"function","function":{"name":"owned_write_file","arguments":"{\"owned_arg_sentinel\":\"你好\"}"}})
}
fn input(prompt: &str, stream: bool) -> Value {
    json!({"model":"tool-model","messages":[{"role":"user","content":prompt}],"stream":stream,"tools":[{"type":"function","function":{"name":"owned_write_file","description":"Only the caller can choose to execute this","parameters":{"type":"object","properties":{"owned_arg_sentinel":{"type":"string"}},"required":["owned_arg_sentinel"],"additionalProperties":false},"strict":true}}],"tool_choice":"auto","parallel_tool_calls":false,"stream_options":null})
}

#[tokio::test]
async fn actual_function_calls_round_trip_and_fragment_without_gateway_execution() {
    let seen = Arc::new(Mutex::new(Vec::<Value>::new()));
    let upstream=Router::new().fallback(post({let seen=seen.clone();move|request:Request|{let seen=seen.clone();async move{
        let bytes=axum::body::to_bytes(request.into_body(),128*1024).await.unwrap();let value:Value=serde_json::from_slice(&bytes).unwrap();seen.lock().unwrap().push(value.clone());
        if value["messages"].as_array().unwrap().last().unwrap()["role"]=="tool"{return Json(json!({"model":"tool-model","choices":[{"index":0,"message":{"role":"assistant","content":"caller result received"},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":1}})).into_response();}
        if value["stream"]==true{
            let bad=value["messages"][0]["content"]=="bad-stream";
            let mut events=vec![json!({"choices":[{"index":0,"delta":{"role":"assistant","content":"tool preface","tool_calls":[{"index":if bad{33}else{0},"id":"owned_call","type":"function","function":{"name":"owned_write_file","arguments":""}}]},"finish_reason":null}]})];
            for fragment in ["{\"owned_arg_sentinel\":", "\"你", "好\"}"]{events.push(json!({"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":fragment}}]},"finish_reason":null}]}));}
            events.push(json!({"choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}));events.push(json!({"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}));
            let mut encoded=events.into_iter().map(|event|format!("data: {event}\r\n\r\n")).collect::<String>();encoded.push_str("data: [DONE]\r\n\r\n");
            return ([("content-type","text/event-stream")],Body::from_stream(async_stream::stream!{for byte in encoded.into_bytes(){yield Ok::<_,Infallible>(Bytes::from(vec![byte]));tokio::task::yield_now().await;}})).into_response();
        }
        let preface=value["messages"][0]["content"]=="preface";
        Json(json!({"model":"tool-model","choices":[{"index":0,"message":{"role":"assistant","content":if preface{json!("tool preface")}else{Value::Null},"tool_calls":[call()]},"finish_reason":if preface{"length"}else{"tool_calls"}}],"usage":{"prompt_tokens":2,"completion_tokens":1}})).into_response()
    }}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let up = listener.local_addr().unwrap().port();
    let _server = Server(tokio::spawn(async move {
        axum::serve(listener, upstream).await.unwrap();
    }));
    let temp = tempfile::Builder::new()
        .prefix("tagma-function-http-")
        .tempdir()
        .unwrap();
    let config = ConfigService::open(temp.path(), Arc::new(SystemCredentials)).unwrap();
    let port = port();
    config
        .save_gateway(SaveGateway {
            protocol_version: 1,
            expected_revision: 0,
            port,
            auth_enabled: false,
        })
        .unwrap();
    let view = config
        .save_provider(SaveProvider {
            protocol_version: 1,
            expected_revision: 1,
            id: None,
            name: "owned tool upstream".into(),
            protocol: ProviderProtocol::OpenaiChatCompletions,
            base_url: format!("http://127.0.0.1:{up}/v1"),
            enabled: true,
            models: vec!["tool-model".into()],
            credential: None,
        })
        .unwrap();
    let target = CloudTarget {
        provider_id: view.providers[0].id.clone(),
        model_id: "tool-model".into(),
    };
    let team = config
        .save_team(SaveTeam {
            protocol_version: 1,
            expected_revision: 2,
            id: None,
            slug: "tool-fixture".into(),
            recipe: TeamRecipe {
                display_name: "Owned tool fixture".into(),
                brain: TeamBrain::Explicit {
                    target: target.clone(),
                },
                routing: TeamRouting::Manual,
                steps: vec![TeamStep {
                    target: TeamStepTarget::CloudModel {
                        target: target.into(),
                    },
                    input: TeamStepInput::OriginalMessages,
                    output: TeamStepOutput::FinalAnswer,
                    timeout_ms: 2000,
                    failure: TeamFailurePolicy::Abort,
                    side_effect: TeamSideEffect::OutboundModelRequest,
                }],
                total_timeout_ms: 2000,
            },
        })
        .unwrap()
        .teams[0]
        .team
        .id
        .clone();
    config
        .publish_team(RevisionCommand {
            protocol_version: 1,
            expected_revision: 3,
            id: team,
        })
        .unwrap();
    let manager = GatewayManager::new(temp.path(), Path::new(env!("CARGO_BIN_EXE_tagma-gateway")));
    manager.start(port).await.unwrap();
    let result=std::panic::AssertUnwindSafe(async{
        let client=reqwest::Client::builder().no_proxy().timeout(Duration::from_secs(5)).build().unwrap();let endpoint=format!("http://127.0.0.1:{port}/v1/chat/completions");
        let mut first=input("first",false);first.as_object_mut().unwrap().remove("stream_options");
        let response=client.post(&endpoint).json(&first).send().await.unwrap();assert_eq!(response.status(),200);assert_eq!(response.headers()["x-tagma-config-revision"],"4");let first_id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let answer:Value=response.json().await.unwrap();assert_eq!(answer["choices"][0]["message"]["tool_calls"][0],call());assert_eq!(seen.lock().unwrap()[0],first);
        let mut preface=first.clone();preface["messages"][0]["content"]=json!("preface");let response=client.post(&endpoint).json(&preface).send().await.unwrap();assert_eq!(response.status(),200);assert_eq!(response.json::<Value>().await.unwrap()["choices"][0]["finish_reason"],"length");
        let mut stream=input("stream",true);stream["stream_options"]=json!({"include_usage":true});let response=client.post(&endpoint).json(&stream).send().await.unwrap();assert_eq!(response.status(),200);let stream_id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let text=response.text().await.unwrap();assert!(text.ends_with("data: [DONE]\n\n"));assert!(!text.contains("UPSTREAM_PROTOCOL_ERROR"));
        let mut decoder=tagma_core::chat::SseDecoder::default();let events=decoder.push(text.as_bytes()).unwrap();let mut arguments=String::new();for event in events{if let Ok(value)=serde_json::from_str::<Value>(&event)&&let Some(parts)=value["choices"][0]["delta"]["tool_calls"].as_array(){for part in parts{if let Some(fragment)=part["function"]["arguments"].as_str(){arguments.push_str(fragment);}}}}assert_eq!(arguments,call()["function"]["arguments"].as_str().unwrap());
        tokio::time::timeout(Duration::from_secs(3),async{loop{let response=client.get(format!("http://127.0.0.1:{port}/v1/models")).send().await.unwrap();let confirmed=response.headers()["x-tagma-health-writes-confirmed"]=="true";response.bytes().await.unwrap();if confirmed{break;}tokio::time::sleep(Duration::from_millis(10)).await;}}).await.unwrap();
        assert!(config.view().unwrap().model_health.iter().all(|health|health.inference!=health::InferenceHealth::Ready),"tool calls with textual prefaces are not a completed text answer for first_cloud");
        let mut round=first.clone();round["messages"]=json!([{"role":"user","content":"first"},answer["choices"][0]["message"].clone(),{"role":"tool","tool_call_id":"owned_call","content":"the caller chose this result"}]);let response=client.post(&endpoint).json(&round).send().await.unwrap();assert_eq!(response.status(),200);assert_eq!(response.json::<Value>().await.unwrap()["choices"][0]["message"]["content"],"caller result received");assert_eq!(seen.lock().unwrap()[3],round);
        let before=seen.lock().unwrap().len();let mut team=first.clone();team["model"]=json!("tagma/tool-fixture");let response=client.post(&endpoint).json(&team).send().await.unwrap();assert_eq!(response.status(),400);assert!(response.text().await.unwrap().contains("UNSUPPORTED_TEAM_TOOLS"));assert_eq!(seen.lock().unwrap().len(),before);
        let mut orphan=first.clone();orphan["messages"]=json!([{"role":"tool","tool_call_id":"orphan","content":"bad"}]);let response=client.post(&endpoint).json(&orphan).send().await.unwrap();assert_eq!(response.status(),400);response.bytes().await.unwrap();assert_eq!(seen.lock().unwrap().len(),before);
        stream["messages"][0]["content"]=json!("bad-stream");let response=client.post(&endpoint).json(&stream).send().await.unwrap();let bad_id=response.headers()["x-tagma-request-id"].to_str().unwrap().to_owned();let bad=response.text().await.unwrap();assert!(bad.contains("UPSTREAM_PROTOCOL_ERROR"));assert!(!bad.contains("[DONE]"));
        let reader=tagma_runtime::usage::UsageReader::default();for (id,tokens,state) in [(first_id,("2","1"),"succeeded"),(stream_id,("3","2"),"succeeded")]{let row=reader.details(temp.path(),usage::read::UsageDetailsQuery{protocol_version:1,request_id:id}).await.unwrap().record.unwrap();assert_eq!(row.input_tokens.as_deref(),Some(tokens.0));assert_eq!(row.output_tokens.as_deref(),Some(tokens.1));assert_eq!(format!("{:?}",row.state).to_lowercase(),state);}
        let bad_row=reader.details(temp.path(),usage::read::UsageDetailsQuery{protocol_version:1,request_id:bad_id}).await.unwrap().record.unwrap();assert_eq!(bad_row.error_code.as_deref(),Some("UPSTREAM_PROTOCOL_ERROR"));
        assert!(!temp.path().join("owned_arg_sentinel").exists());
        for suffix in ["","-wal"]{if let Ok(bytes)=std::fs::read(temp.path().join(format!("usage.sqlite3{suffix}"))){let needle=b"owned_arg_sentinel";assert!(!bytes.windows(needle.len()).any(|part|part==needle));}}
        println!("Function actual HTTP:exact definitions/choice/parallel/request history preserved,nonstream null text+opaque calls,byte-fragmented UTF8/CRLF SSE arguments reconstructed by caller,DONE after tokens3/2 durable;nonstream length+preface and stream preface+tools never mark text Ready after confirmed health flush;caller-only result turn;team/orphan0sends,bad tool index ->error/noDONE+failed ledger;no tool execution or arguments in usage DB");
    }).catch_unwind().await;
    let stopped = manager.stop().await;
    if let Err(error) = result {
        std::panic::resume_unwind(error);
    }
    stopped.unwrap();
}
