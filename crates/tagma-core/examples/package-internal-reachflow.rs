//! Produce an explicitly internal signed offline bundle; never a production root.
//! Signing seed exists only in memory. Rebuilding yields a new public identity.
use ed25519_dalek::{Signer, SigningKey};
use sha2::{Digest, Sha256};
use std::{
    io::{Cursor, Write},
    path::PathBuf,
};
use tagma_core::packs::{MANIFEST_SIGNATURE_DOMAIN, PackManifest, SignedManifestRecord};

fn main() {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    assert_eq!(
        args.len(),
        2,
        "binary path and new output directory required"
    );
    let binary = std::fs::read(&args[0]).expect("read adapter");
    assert!(binary.len() < 24 * 1024 * 1024 && binary.starts_with(b"MZ"));
    let out = PathBuf::from(&args[1]);
    std::fs::create_dir(&out).expect("new output directory only");
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    zip.start_file(
        "tagma-reachflow.exe",
        zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated),
    )
    .unwrap();
    zip.write_all(&binary).unwrap();
    let archive = zip.finish().unwrap().into_inner();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    let mut seed = zeroize::Zeroizing::new([0u8; 32]);
    getrandom::fill(seed.as_mut()).expect("OS randomness");
    let key = SigningKey::from_bytes(&seed);
    let manifest = serde_json::json!({"contract_version":1,"id":"reachflow","version":env!("CARGO_PKG_VERSION"),
        "source":{"kind":"official","publisher":"tagma-internal"},"issued_ms":now-1000,"expires_ms":now+7*86400000u64,
        "artifacts":[{"target":{"os":"windows","arch":"x86_64"},"download":{"url":"https://internal.invalid/reachflow.zip","sha256":format!("{:x}",Sha256::digest(&archive)),"size_bytes":archive.len(),"format":"zip"},
        "entry":{"protocol":"stdio_jsonl_v1","executable":"tagma-reachflow.exe","arguments":[]},
        "resources":{"max_unpacked_bytes":binary.len()+4096,"max_archive_entries":4,"memory_mib":128,"max_concurrency":1,"task_timeout_ms":30000},
        "permissions":{"network_hosts":[],"workspace":"none","browser":false,"subprocess":false},
        "health":{"protocol":"stdio_ping_v1","timeout_ms":5000},"models":[{"id":"tagma/reachflow","display_name":"ReachFlow 内部本地试跑"}]}]});
    let raw = serde_json::to_vec(&manifest).unwrap();
    PackManifest::parse(&raw).expect("valid contract");
    let mut message = MANIFEST_SIGNATURE_DOMAIN.to_vec();
    message.extend_from_slice(&raw);
    let record = SignedManifestRecord {
        record_version: 1,
        key_id: "tagma-internal-local".into(),
        manifest_utf8: String::from_utf8(raw).unwrap(),
        signature_hex: key
            .sign(&message)
            .to_bytes()
            .iter()
            .map(|v| format!("{v:02x}"))
            .collect(),
    };
    let catalogue = serde_json::json!({"root":{"key_id":"tagma-internal-local","publisher":"tagma-internal",
        "public_key":key.verifying_key().to_bytes(),"valid_from_ms":now-2000,"valid_until_ms":now+7*86400000u64},"record":record});
    std::fs::write(
        out.join("internal-pack.json"),
        serde_json::to_vec_pretty(&catalogue).unwrap(),
    )
    .unwrap();
    std::fs::write(out.join("internal-pack.zip"), archive).unwrap();
    println!(
        "Internal offline bundle created; no private key persisted; no production release claim."
    );
}
