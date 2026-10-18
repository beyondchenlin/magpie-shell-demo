use super::*;
use ed25519_dalek::{Signer, SigningKey};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Cursor, Write},
    path::PathBuf,
    sync::{
        Arc, Barrier,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use zip::{CompressionMethod, ZipWriter, write::SimpleFileOptions};
const TARGET: PackTarget = PackTarget {
    os: PackOs::Windows,
    arch: PackArch::X86_64,
};
struct Fixture {
    root: tempfile::TempDir,
    download: PathBuf,
    stage: PathBuf,
}
struct Observer {
    stop: Arc<AtomicBool>,
    handle: Option<std::thread::JoinHandle<bool>>,
}
impl Observer {
    fn finish(mut self) -> bool {
        self.stop.store(true, Ordering::SeqCst);
        self.handle.take().unwrap().join().unwrap()
    }
}
impl Drop for Observer {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}
impl Fixture {
    fn new() -> Self {
        let root = tempfile::Builder::new()
            .prefix("tagma-pack-verify-")
            .tempdir()
            .unwrap();
        let download = root.path().join("download");
        let stage = root.path().join("stage");
        fs::create_dir(&download).unwrap();
        fs::create_dir(&stage).unwrap();
        fs::write(
            root.path().join("retained-active.bin"),
            b"retained old version",
        )
        .unwrap();
        fs::write(
            root.path().join("retained-output.txt"),
            b"retained user output",
        )
        .unwrap();
        println!(
            "Owned ZIP fixture:{};new private child files only,<=4MiB expanded,handles close then RAII cleanup;sentinel active/output never targeted",
            root.path().display()
        );
        Self {
            root,
            download,
            stage,
        }
    }
    fn clean(&self) {
        assert_eq!(fs::read_dir(&self.download).unwrap().count(), 0);
        assert_eq!(fs::read_dir(&self.stage).unwrap().count(), 0);
        assert_eq!(
            fs::read(self.root.path().join("retained-active.bin")).unwrap(),
            b"retained old version"
        );
        assert_eq!(
            fs::read(self.root.path().join("retained-output.txt")).unwrap(),
            b"retained user output"
        );
    }
    fn archive(
        &self,
        bytes: &[u8],
        maximum: u64,
        count: u32,
        control: &PackStageControl,
    ) -> StagedPackArchive {
        let mut stager =
            PackArchiveStager::new(proof(bytes, maximum, count), TARGET, &self.download).unwrap();
        for chunk in bytes.chunks(73) {
            stager.push(chunk, control).unwrap();
        }
        stager.finish(control).unwrap()
    }
}
fn control() -> PackStageControl {
    PackStageControl::new(Duration::from_secs(10)).unwrap()
}
fn error<T>(result: PackResult<T>) -> PackError {
    match result {
        Ok(_) => panic!("expected rejection"),
        Err(error) => error,
    }
}
fn proof(bytes: &[u8], maximum: u64, count: u32) -> VerifiedManifest {
    let key = SigningKey::from_bytes(&[19; 32]);
    let value = serde_json::json!({"contract_version":1,"id":"reachflow","version":"1.0.0","source":{"kind":"official","publisher":"test-publisher"},"issued_ms":1000,"expires_ms":90000,"artifacts":[{"target":{"os":"windows","arch":"x86_64"},"download":{"url":"https://packs.example.invalid/owned.zip","sha256":format!("{:x}",Sha256::digest(bytes)),"size_bytes":bytes.len(),"format":"zip"},"entry":{"protocol":"stdio_jsonl_v1","executable":"bin/runner.exe","arguments":[]},"resources":{"max_unpacked_bytes":maximum,"max_archive_entries":count,"memory_mib":256,"max_concurrency":1,"task_timeout_ms":10000},"permissions":{"network_hosts":[],"workspace":"none","browser":false,"subprocess":false},"health":{"protocol":"stdio_ping_v1","timeout_ms":500},"models":[]}]});
    let raw = serde_json::to_vec(&value).unwrap();
    let mut message = MANIFEST_SIGNATURE_DOMAIN.to_vec();
    message.extend_from_slice(&raw);
    PackTrustStore::new(vec![PackTrustRoot {
        key_id: "test-key".into(),
        publisher: "test-publisher".into(),
        public_key: key.verifying_key().to_bytes(),
        valid_from_ms: 1000,
        valid_until_ms: 100000,
    }])
    .unwrap()
    .verify("test-key", &raw, &key.sign(&message).to_bytes(), 10000)
    .unwrap()
}
fn preparation_trust() -> PackTrustStore {
    PackTrustStore::new(vec![PackTrustRoot {
        key_id: "test-key".into(),
        publisher: "test-publisher".into(),
        public_key: SigningKey::from_bytes(&[19; 32]).verifying_key().to_bytes(),
        valid_from_ms: 1000,
        valid_until_ms: 100000,
    }])
    .unwrap()
}
#[test]
fn prepared_actual_directory_publication_reopen_and_current_trust() {
    let f = Fixture::new();
    let bytes = zip(
        Some(("assets/readme.txt", "真实准备文件".as_bytes())),
        CompressionMethod::Deflated,
        None,
    );
    let config = uuid::Uuid::new_v4();
    let c = control();
    let extracted = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    let old = extracted.root_path().to_owned();
    let prepared = extracted.publish_prepared(&f.stage, config, &c).unwrap();
    let root = prepared.root_path().to_owned();
    assert!(!old.exists());
    assert_eq!(
        fs::read(root.join("payload/assets/readme.txt")).unwrap(),
        "真实准备文件".as_bytes()
    );
    let digest = prepared.manifest().sha256().to_owned();
    drop(prepared);
    assert!(root.exists()); // persistent, not deleted when the value closes
    let reopened = PreparedPack::reopen(&root, config, &preparation_trust(), 10000, &c).unwrap();
    assert_eq!(reopened.manifest().sha256(), digest);
    assert_eq!(reopened.target(), TARGET);
    assert_eq!(
        root.file_name().unwrap(),
        format!("prepared-{}", reopened.operation_id()).as_str()
    );
    assert_eq!(
        error(PreparedPack::reopen(
            &root,
            uuid::Uuid::new_v4(),
            &preparation_trust(),
            10000,
            &c
        )),
        PackError::InvalidPreparedPack
    );
    assert_eq!(
        error(PreparedPack::reopen(
            &root,
            config,
            &PackTrustStore::default(),
            10000,
            &c
        )),
        PackError::UntrustedPublisher
    );
    assert_eq!(
        error(PreparedPack::reopen(
            &root,
            config,
            &preparation_trust(),
            95000,
            &c
        )),
        PackError::ExpiredManifest
    );
    println!(
        "Prepared actual same-volume outer-directory publication:raw signed receipt+complete payload persist across close/reopen;current roots/time/config required;no installed/active pointer or process execution"
    );
}
#[test]
fn prepared_mutated_payload_or_receipt_is_rejected_and_preserved() {
    let f = Fixture::new();
    let bytes = zip(None, CompressionMethod::Stored, None);
    let config = uuid::Uuid::new_v4();
    let c = control();
    // Same length corruption after extraction must fail before publication.
    let extracted = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    fs::write(
        extracted.root_path().join("bin/runner.exe"),
        b"OWNED FAKE BINARY",
    )
    .unwrap();
    assert_eq!(
        error(extracted.publish_prepared(&f.stage, config, &c)),
        PackError::InvalidPreparedPack
    );
    f.clean();
    let prepared = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap()
        .publish_prepared(&f.stage, config, &c)
        .unwrap();
    let root = prepared.root_path();
    let payload = root.join("payload/bin/runner.exe");
    fs::write(&payload, b"OWNED FAKE BINARY").unwrap();
    assert_eq!(
        error(PreparedPack::reopen(
            root,
            config,
            &preparation_trust(),
            10000,
            &c
        )),
        PackError::InvalidPreparedPack
    );
    assert_eq!(fs::read(&payload).unwrap(), b"OWNED FAKE BINARY");
    fs::write(&payload, b"owned fake binary").unwrap();
    fs::write(root.join("payload/unexpected.txt"), b"preserve this").unwrap();
    assert_eq!(
        error(PreparedPack::reopen(
            root,
            config,
            &preparation_trust(),
            10000,
            &c
        )),
        PackError::InvalidPreparedPack
    );
    assert_eq!(
        fs::read(root.join("payload/unexpected.txt")).unwrap(),
        b"preserve this"
    );
    // No deletion as recovery. This test-owned file is removed to exercise the
    // next independent corruption of the same tiny owned fixture.
    fs::remove_file(root.join("payload/unexpected.txt")).unwrap();
    let receipt = root.join("prepared.json");
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&receipt).unwrap()).unwrap();
    value["installed"] = true.into();
    let corrupt = serde_json::to_vec(&value).unwrap();
    fs::write(&receipt, &corrupt).unwrap();
    assert_eq!(
        error(PreparedPack::reopen(
            root,
            config,
            &preparation_trust(),
            10000,
            &c
        )),
        PackError::InvalidPreparedPack
    );
    assert_eq!(fs::read(receipt).unwrap(), corrupt);
    println!(
        "Actual same-size payload corruption before/after publication,extra files,and unknown installed field rejected;read-only recovery preserves each corrupt artifact"
    );
}
#[test]
fn prepared_collision_cancel_and_commit_boundary_preserve_old_files() {
    use super::prepared::PreparationPoint;
    let f = Fixture::new();
    let bytes = zip(None, CompressionMethod::Stored, None);
    let config = uuid::Uuid::new_v4();
    let operation = uuid::Uuid::new_v4();
    let target = f.stage.join(format!("prepared-{operation}"));
    fs::write(&target, b"unknown retained destination").unwrap();
    let c = control();
    let extracted = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    assert_eq!(
        error(extracted.publish_inner(&f.stage, config, &c, operation, |_| {})),
        PackError::WriteFailed
    );
    assert_eq!(fs::read(&target).unwrap(), b"unknown retained destination");
    assert_eq!(fs::read_dir(&f.stage).unwrap().count(), 1);
    let extracted = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    assert_eq!(
        error(
            extracted.publish_inner(&f.stage, config, &c, uuid::Uuid::new_v4(), |p| {
                if matches!(p, PreparationPoint::Ready) {
                    c.cancel();
                }
            })
        ),
        PackError::Cancelled
    );
    assert_eq!(fs::read_dir(&f.stage).unwrap().count(), 1);
    let c = control();
    let extracted = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    let prepared = extracted
        .publish_inner(&f.stage, config, &c, uuid::Uuid::new_v4(), |p| {
            if matches!(p, PreparationPoint::Published) {
                c.cancel();
            }
        })
        .unwrap();
    assert!(prepared.root_path().join("prepared.json").exists());
    assert_eq!(fs::read(&target).unwrap(), b"unknown retained destination");
    assert_eq!(
        fs::read(f.root.path().join("retained-active.bin")).unwrap(),
        b"retained old version"
    );
    assert_eq!(
        fs::read(f.root.path().join("retained-output.txt")).unwrap(),
        b"retained user output"
    );
    println!(
        "No-replace collision preserves unknown target;cancel after real receipt sync cleans only private stage;post-publication cancel reports committed success,no replay/active switch"
    );
}
#[test]
fn prepared_real_process_exit_before_and_after_publication() {
    let parent = tempfile::Builder::new()
        .prefix("tagma-prepared-crash-")
        .tempdir()
        .unwrap();
    let config = uuid::Uuid::new_v4();
    for (point, code) in [("ready", 91), ("published", 92)] {
        let child_root = parent.path().join(point);
        fs::create_dir(&child_root).unwrap();
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "packs::archive_tests::preparation_crash_child",
                "--ignored",
                "--nocapture",
            ])
            .env("TAGMA_PREPARATION_CRASH_ROOT", &child_root)
            .env("TAGMA_PREPARATION_CRASH_POINT", point)
            .env("TAGMA_PREPARATION_CRASH_CONFIG", config.to_string())
            .status()
            .unwrap();
        assert_eq!(status.code(), Some(code));
        let stage = child_root.join("stage");
        let paths: Vec<_> = fs::read_dir(&stage)
            .unwrap()
            .map(|e| e.unwrap().path())
            .collect();
        assert_eq!(paths.len(), 1);
        let path = &paths[0];
        assert!(path.join("prepared.json").exists());
        assert_eq!(
            fs::read(path.join("payload/bin/runner.exe")).unwrap(),
            b"owned fake binary"
        );
        let result = PreparedPack::reopen(path, config, &preparation_trust(), 10000, &control());
        if point == "ready" {
            assert!(
                path.file_name()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .starts_with("tagma-pack-preparing-")
            );
            assert_eq!(error(result), PackError::InvalidPreparedPack);
            assert!(path.join("prepared.json").exists()); // unknown/incomplete preserved
        } else {
            assert!(result.is_ok());
        }
        assert_eq!(
            fs::read_dir(child_root.join("download")).unwrap().count(),
            0
        );
    }
    println!(
        "Real child exit91 after receipt sync/before rename leaves only uncallable private preparation,preserved on reopen;exit92 after atomic publication reopens complete prepared files;no unwind simulated as crash,no UI"
    );
}
#[test]
fn prepared_hardlinks_and_oversized_receipt_refused_without_recovery_cleanup() {
    let f = Fixture::new();
    let bytes = zip(None, CompressionMethod::Stored, None);
    let config = uuid::Uuid::new_v4();
    let c = control();
    let prepared = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap()
        .publish_prepared(&f.stage, config, &c)
        .unwrap();
    let outside = f.root.path().join("owned-outside-hardlink");
    fs::hard_link(
        prepared.root_path().join("payload/bin/runner.exe"),
        &outside,
    )
    .unwrap();
    assert_eq!(
        error(PreparedPack::reopen(
            prepared.root_path(),
            config,
            &preparation_trust(),
            10000,
            &c
        )),
        PackError::UnsafePath
    );
    assert_eq!(fs::read(&outside).unwrap(), b"owned fake binary");
    fs::remove_file(&outside).unwrap(); // only this test's new link
    let receipt = prepared.root_path().join("prepared.json");
    let file = fs::OpenOptions::new().write(true).open(&receipt).unwrap();
    file.set_len(8 * 1024 * 1024 + 1).unwrap();
    drop(file);
    assert_eq!(
        error(PreparedPack::reopen(
            prepared.root_path(),
            config,
            &preparation_trust(),
            10000,
            &c
        )),
        PackError::InvalidPreparedPack
    );
    assert_eq!(fs::metadata(&receipt).unwrap().len(), 8 * 1024 * 1024 + 1);
    println!(
        "Actual extra hardlink refused by opened-file link count;8MiB+1 receipt rejected by metadata before read,corrupt files preserved;only new fixture later RAII cleaned"
    );
}
#[test]
#[cfg(windows)]
#[ignore = "explicit actual C/D volume case,not a portable environment assumption"]
fn prepared_cross_volume_has_no_copy_fallback() {
    let f = Fixture::new();
    let target = tempfile::Builder::new()
        .prefix("tagma-prepared-volume-")
        .tempdir_in(std::env::current_dir().unwrap())
        .unwrap();
    let observation = observe_pack_space(target.path(), &f.stage).unwrap();
    assert!(!observation.space().unwrap().same_volume);
    let bytes = zip(None, CompressionMethod::Stored, None);
    let c = control();
    let extracted = f
        .archive(&bytes, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    assert_eq!(
        error(extracted.publish_prepared(target.path(), uuid::Uuid::new_v4(), &c)),
        PackError::WriteFailed
    );
    assert_eq!(fs::read_dir(target.path()).unwrap().count(), 0);
    f.clean();
    println!(
        "Actual C to D prepared directory move refused,no copy fallback/no extra retained archive/stage;sentinels untouched;installer must stage on its target volume"
    );
}
#[test]
#[ignore = "subprocess-only crash helper with explicitly supplied owned fixture"]
fn preparation_crash_child() {
    use super::prepared::PreparationPoint;
    let root = PathBuf::from(
        std::env::var_os("TAGMA_PREPARATION_CRASH_ROOT").expect("owned fixture required"),
    );
    let config =
        uuid::Uuid::parse_str(&std::env::var("TAGMA_PREPARATION_CRASH_CONFIG").unwrap()).unwrap();
    let point = std::env::var("TAGMA_PREPARATION_CRASH_POINT").unwrap();
    let download = root.join("download");
    let stage = root.join("stage");
    fs::create_dir(&download).unwrap();
    fs::create_dir(&stage).unwrap();
    let c = control();
    let bytes = zip(None, CompressionMethod::Stored, None);
    let mut stager = PackArchiveStager::new(proof(&bytes, 4096, 16), TARGET, &download).unwrap();
    stager.push(&bytes, &c).unwrap();
    let extracted = stager.finish(&c).unwrap().extract(&stage, &c).unwrap();
    extracted
        .publish_inner(&stage, config, &c, uuid::Uuid::new_v4(), |p| {
            match (point.as_str(), p) {
                ("ready", PreparationPoint::Ready) => std::process::exit(91),
                ("published", PreparationPoint::Published) => std::process::exit(92),
                _ => (),
            }
        })
        .unwrap();
    panic!("crash boundary not reached");
}
fn zip(extra: Option<(&str, &[u8])>, method: CompressionMethod, link: Option<&str>) -> Vec<u8> {
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(method);
    writer.add_directory("bin/", options).unwrap();
    writer.start_file("bin/runner.exe", options).unwrap();
    writer.write_all(b"owned fake binary").unwrap();
    if let Some((name, bytes)) = extra {
        writer.start_file(name, options).unwrap();
        writer.write_all(bytes).unwrap();
    }
    if let Some(target) = link {
        writer.add_symlink("inside-link", target, options).unwrap();
    }
    writer.finish().unwrap().into_inner()
}
fn unsafe_path(path: &str) -> Vec<u8> {
    let name = "x".repeat(path.len());
    let mut bytes = zip(
        Some((&name, b"owned extra")),
        CompressionMethod::Stored,
        None,
    );
    let positions: Vec<_> = bytes
        .windows(name.len())
        .enumerate()
        .filter_map(|(i, s)| (s == name.as_bytes()).then_some(i))
        .collect();
    assert_eq!(positions.len(), 2);
    for i in positions {
        bytes[i..i + name.len()].copy_from_slice(path.as_bytes());
    }
    bytes
}
fn central_positions(bytes: &[u8]) -> Vec<usize> {
    bytes
        .windows(4)
        .enumerate()
        .filter_map(|(i, s)| (s == b"PK\x01\x02").then_some(i))
        .collect()
}
fn filesystem_entries(path: &std::path::Path) -> usize {
    fs::read_dir(path)
        .unwrap()
        .map(|e| {
            let e = e.unwrap();
            1 + if e.file_type().unwrap().is_dir() {
                filesystem_entries(&e.path())
            } else {
                0
            }
        })
        .sum()
}

#[test]
fn actual_stored_and_deflated_zip_extract_to_fresh_capability_root_and_cleanup() {
    let f = Fixture::new();
    for method in [CompressionMethod::Stored, CompressionMethod::Deflated] {
        let bytes = zip(
            Some(("assets/readme.txt", "真实UTF8内容".as_bytes())),
            method,
            None,
        );
        let c = control();
        let extracted = f
            .archive(&bytes, 4096, 16, &c)
            .extract(&f.stage, &c)
            .unwrap();
        assert!(extracted.root_path().starts_with(&f.stage));
        assert_eq!(extracted.target(), TARGET);
        assert_eq!(extracted.manifest().manifest().version, "1.0.0");
        assert_eq!(
            fs::read(extracted.root_path().join("bin/runner.exe")).unwrap(),
            b"owned fake binary"
        );
        assert_eq!(
            fs::read_to_string(extracted.root_path().join("assets/readme.txt")).unwrap(),
            "真实UTF8内容"
        );
        assert_eq!(extracted.index().entries().len(), 3);
        drop(extracted);
        f.clean();
    }
    println!(
        "Actual ZIP Stored+Deflate:exact signed bytes hashed before parsing,real files/UTF8 in fresh private capability root;drop closes handles and removes only new files,active/output sentinels unchanged;no activation/execution"
    );
}
#[test]
fn actual_zip_traversal_aliases_and_symlinks_are_rejected_before_writes() {
    let f = Fixture::new();
    for path in [
        "../escape.txt",
        "/absolute.txt",
        "C:/outside.txt",
        "bin\\escape.txt",
        "a/../escape.txt",
        "a:stream",
        "NUL",
        "bin/CON.exe",
    ] {
        let bytes = unsafe_path(path);
        let c = control();
        assert_eq!(
            error(f.archive(&bytes, 4096, 16, &c).extract(&f.stage, &c)),
            PackError::UnsafePath,
            "{path}"
        );
        f.clean();
    }
    for target in ["bin/runner.exe", "../../retained-output.txt"] {
        let bytes = zip(None, CompressionMethod::Stored, Some(target));
        let c = control();
        assert_eq!(
            error(f.archive(&bytes, 4096, 16, &c).extract(&f.stage, &c)),
            PackError::UnsafePath
        );
        f.clean();
    }
    let bytes = zip(
        Some(("BIN/RUNNER.EXE", b"alias")),
        CompressionMethod::Stored,
        None,
    );
    let c = control();
    assert_eq!(
        error(f.archive(&bytes, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::InvalidArchiveIndex
    );
    f.clean();
    println!(
        "Actual ZIP names:relative traversal/absolute/Windows drive/backslash/ADS/device,case alias,and internal/external symlink entries rejected;0activation/outside writes"
    );
}
#[test]
fn actual_entry_count_declared_expansion_and_understated_size_are_bounded() {
    let f = Fixture::new();
    let bytes = zip(
        Some(("assets/large.bin", &[0; 8192])),
        CompressionMethod::Deflated,
        None,
    );
    let c = control();
    assert_eq!(
        error(f.archive(&bytes, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::ArchiveLimit
    );
    f.clean();
    assert_eq!(
        error(f.archive(&bytes, 16384, 1, &c).extract(&f.stage, &c)),
        PackError::ArchiveLimit
    );
    f.clean();
    let mut bytes = zip(None, CompressionMethod::Stored, None);
    let at = central_positions(&bytes)[1];
    bytes[at + 24..at + 28].copy_from_slice(&1u32.to_le_bytes());
    assert_eq!(
        error(f.archive(&bytes, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::ArchiveLimit
    );
    f.clean();
    println!(
        "Actual ZIP expansion/count rejected before stage;lying central size cannot permit extra actual output;new stage cleaned on failure"
    );
}
#[test]
fn actual_implicit_directories_count_against_the_signed_entry_budget() {
    let f = Fixture::new();
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
    writer.start_file("bin/runner.exe", options).unwrap();
    writer.write_all(b"owned fake binary").unwrap();
    writer.start_file("a/b/c/d/payload.txt", options).unwrap();
    writer.write_all(b"owned small payload").unwrap();
    let bytes = writer.finish().unwrap().into_inner();
    let c = control();
    let result = f.archive(&bytes, 4096, 2, &c).extract(&f.stage, &c);
    if let Ok(extracted) = &result {
        println!(
            "Implicit-directory before guard:ZIP raw entries={},actual root has additional bin and a/b/c/d parents,accepted with signed maximum2",
            extracted.index().entries().len()
        );
    }
    assert_eq!(error(result), PackError::ArchiveLimit);
    f.clean();
    let extracted = f
        .archive(&bytes, 4096, 7, &c)
        .extract(&f.stage, &c)
        .unwrap();
    assert_eq!(extracted.index().entries().len(), 2);
    assert_eq!(extracted.index().filesystem_entries(), 7);
    assert_eq!(filesystem_entries(extracted.root_path()), 7);
    assert_eq!(
        fs::read(extracted.root_path().join("a/b/c/d/payload.txt")).unwrap(),
        b"owned small payload"
    );
    drop(extracted);
    f.clean();
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    for name in ["bin/runner.exe", "Assets/a", "assets/b"] {
        writer.start_file(name, options).unwrap();
        writer.write_all(b"owned").unwrap();
    }
    let mixed = writer.finish().unwrap().into_inner();
    assert_eq!(
        error(f.archive(&mixed, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::InvalidArchiveIndex
    );
    f.clean();
    println!(
        "Actual ZIP2 files require7 filesystem entries with implicit parents;limit2 rejects before stage,exact7 succeeds/cleans;resource allocation allowance now covers the same entry budget"
    );
}
#[test]
fn hash_length_and_crc_failures_never_leave_a_callable_version() {
    let f = Fixture::new();
    let original = zip(None, CompressionMethod::Stored, None);
    let c = control();
    let mut stager =
        PackArchiveStager::new(proof(&original, 4096, 16), TARGET, &f.download).unwrap();
    stager.push(&original[..original.len() - 1], &c).unwrap();
    assert_eq!(error(stager.finish(&c)), PackError::ChecksumMismatch);
    f.clean();
    let mut altered = original.clone();
    altered[35] ^= 1;
    let mut stager =
        PackArchiveStager::new(proof(&original, 4096, 16), TARGET, &f.download).unwrap();
    stager.push(&altered, &c).unwrap();
    assert_eq!(error(stager.finish(&c)), PackError::ChecksumMismatch);
    f.clean();
    let mut corrupted = original;
    let at = central_positions(&corrupted)[1];
    corrupted[at + 16] ^= 1;
    assert_eq!(
        error(f.archive(&corrupted, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::InvalidArchive
    );
    f.clean();
    println!(
        "Actual staged bytes:truncated/changed SHA refused before ZIP;publisher-signed bad CRC refused during real read,partial stage removed;no installed/callable state exists"
    );
}
#[test]
fn metadata_preallocation_profile_and_earlier_fake_footers_fail_closed() {
    let f = Fixture::new();
    let mut fake = vec![0; 22];
    fake[..4].copy_from_slice(b"PK\x05\x06");
    fake[8..12].copy_from_slice(&[255; 4]);
    let original = zip(
        Some(("assets/fake-footer.bin", &fake)),
        CompressionMethod::Stored,
        None,
    );
    let c = control();
    let extracted = f
        .archive(&original, 4096, 16, &c)
        .extract(&f.stage, &c)
        .unwrap();
    assert_eq!(
        fs::read(extracted.root_path().join("assets/fake-footer.bin")).unwrap(),
        fake
    );
    drop(extracted);
    f.clean();
    let mut malformed = original.clone();
    let at = central_positions(&malformed)[0];
    malformed[at] = 0;
    assert_eq!(
        error(f.archive(&malformed, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::InvalidArchive
    );
    f.clean();
    let mut count = original.clone();
    let end = count.len() - 22;
    count[end + 8..end + 12].copy_from_slice(&[255; 4]);
    assert_eq!(
        error(f.archive(&count, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::ArchiveLimit
    );
    f.clean();
    let mut giant = original.clone();
    let end = giant.len() - 22;
    giant[end + 12..end + 16].copy_from_slice(&(4 * 1024 * 1024 + 1u32).to_le_bytes());
    assert_eq!(
        error(f.archive(&giant, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::ArchiveLimit
    );
    f.clean();
    let mut footer = original;
    let at = central_positions(&footer)[0];
    footer[at + 16..at + 20].copy_from_slice(b"PK\x05\x06");
    assert_eq!(
        error(f.archive(&footer, 4096, 16, &c).extract(&f.stage, &c)),
        PackError::UnsupportedArchive
    );
    f.clean();
    println!(
        "ZIP32 profile:EOCD count/4MiB central cap before library allocation;metadata-only reads hide earlier fake footer in payload,normal data still extracts exactly;bad central cannot fall back to fake huge-count archive;secondary metadata footers refused"
    );
}
#[test]
fn cancellation_and_deadline_cleanup_download_and_actual_partial_extraction() {
    let f = Fixture::new();
    let bytes = zip(None, CompressionMethod::Stored, None);
    let c = control();
    let mut stager = PackArchiveStager::new(proof(&bytes, 4096, 16), TARGET, &f.download).unwrap();
    stager.push(&bytes[..73], &c).unwrap();
    c.cancel();
    assert_eq!(stager.push(&[], &c), Err(PackError::Cancelled));
    assert_eq!(error(stager.finish(&c)), PackError::WriteFailed);
    f.clean();
    let expired = PackStageControl::new(Duration::from_millis(1)).unwrap();
    std::thread::sleep(Duration::from_millis(3));
    let mut stager = PackArchiveStager::new(proof(&bytes, 4096, 16), TARGET, &f.download).unwrap();
    assert_eq!(stager.push(&bytes, &expired), Err(PackError::TimedOut));
    drop(stager);
    f.clean();
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    writer.start_file("bin/runner.exe", options).unwrap();
    writer.write_all(b"owned fake binary").unwrap();
    for i in 0..100 {
        writer
            .start_file(format!("assets/file-{i}.bin"), options)
            .unwrap();
        writer.write_all(&[0; 32768]).unwrap();
    }
    let bytes = writer.finish().unwrap().into_inner();
    let c = control();
    let archive = f.archive(&bytes, 4 * 1024 * 1024, 256, &c);
    let stage = f.stage.clone();
    let cancel = c.clone();
    let ready = Arc::new(Barrier::new(2));
    let barrier = ready.clone();
    let stop = Arc::new(AtomicBool::new(false));
    let stopping = stop.clone();
    let observer = std::thread::spawn(move || {
        barrier.wait();
        let until = std::time::Instant::now() + Duration::from_secs(3);
        while !stopping.load(Ordering::SeqCst) && std::time::Instant::now() < until {
            for entry in fs::read_dir(&stage).unwrap().flatten() {
                if fs::metadata(entry.path().join("bin/runner.exe")).is_ok_and(|m| m.len() > 0) {
                    cancel.cancel();
                    return true;
                }
            }
            std::thread::sleep(Duration::from_micros(100));
        }
        false
    });
    let observer = Observer {
        stop,
        handle: Some(observer),
    };
    ready.wait();
    let result = archive.extract(&f.stage, &c);
    assert!(
        observer.finish(),
        "must observe actual written bytes before cancel"
    );
    assert_eq!(error(result), PackError::Cancelled);
    f.clean();
    println!(
        "Actual cancellation:partial byte download poisoned/cleaned;expired total deadline rejects;observer saw a real nonempty staged file then cancelled extraction,all handles/stage/archive removed,old active/user output retained;no running pack"
    );
}
