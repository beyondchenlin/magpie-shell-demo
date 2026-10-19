#![cfg_attr(windows, windows_subsystem = "console")]
use std::io::{Read, Write};
use tagma_runtime::{
    packs::{PackCall, PackOperation, PackReply, PackReplyBody},
    reachflow,
};
#[tokio::main]
async fn main() {
    let mut bytes = zeroize::Zeroizing::new(Vec::new());
    if std::io::stdin()
        .take(32 * 1024 + 1)
        .read_to_end(&mut bytes)
        .is_err()
        || bytes.len() > 32 * 1024
    {
        std::process::exit(2)
    }
    let Ok(call) = serde_json::from_slice::<PackCall>(&bytes) else {
        std::process::exit(2)
    };
    if call.protocol_version != 1
        || call.pack_id != "reachflow"
        || call.version != env!("CARGO_PKG_VERSION")
    {
        std::process::exit(2)
    }
    let body = match &call.operation {
        PackOperation::Ping => PackReplyBody::Ready,
        PackOperation::LocalSample { text } => match reachflow::local_sample(text) {
            Ok(text) => PackReplyBody::Result { text },
            Err(code) => PackReplyBody::Failed { code: code.into() },
        },
        PackOperation::ReachFlow { request } => match reachflow::execute(request).await {
            Ok(text) => PackReplyBody::Result { text },
            Err(code) => PackReplyBody::Failed { code: code.into() },
        },
    };
    let reply = PackReply {
        protocol_version: 1,
        request_id: call.request_id,
        pack_id: call.pack_id,
        version: call.version,
        body,
    };
    let Ok(mut encoded) = serde_json::to_vec(&reply) else {
        std::process::exit(2)
    };
    encoded.push(b'\n');
    if std::io::stdout().write_all(&encoded).is_err() {
        std::process::exit(2)
    }
}
