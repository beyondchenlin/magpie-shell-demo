//! Explicit local acceptance fixture, never packaged as ReachFlow or trusted by production.
use std::io::{Read, Write};
use tagma_runtime::packs::{PackCall, PackOperation, PackReply, PackReplyBody};
fn main() {
    let mut bytes = Vec::new();
    std::io::stdin()
        .take(32 * 1024)
        .read_to_end(&mut bytes)
        .unwrap();
    let call: PackCall = serde_json::from_slice(&bytes).unwrap();
    let mode = std::env::args().nth(1).unwrap_or_default();
    if std::env::var_os("TAGMA_PACK_TEST_SECRET").is_some() {
        std::process::exit(92);
    }
    match mode.as_str() {
        "crash" => std::process::exit(91),
        "hang" => std::thread::sleep(std::time::Duration::from_secs(15)),
        "flood" => {
            std::io::stdout()
                .write_all(&vec![b'x'; 128 * 1024 + 1])
                .unwrap();
            return;
        }
        "stderr-flood" => {
            std::io::stderr()
                .write_all(&vec![b'x'; 64 * 1024 + 1])
                .unwrap();
            return;
        }
        _ => {}
    }
    let body = match call.operation {
        PackOperation::Ping => PackReplyBody::Ready,
        PackOperation::LocalSample { text } => PackReplyBody::Result {
            text: format!("本机测试队员已处理：{text}"),
        },
    };
    let reply = PackReply {
        protocol_version: 1,
        request_id: if mode == "wrong-id" {
            uuid::Uuid::new_v4()
        } else {
            call.request_id
        },
        pack_id: call.pack_id,
        version: call.version,
        body,
    };
    println!("{}", serde_json::to_string(&reply).unwrap());
}
