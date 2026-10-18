use ed25519_dalek::{Signer, SigningKey};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use tagma_core::packs::*;

const NOW: u64 = 10_000;
const ARCHIVE: &[u8] = b"owned synthetic archive bytes";
const TARGET: PackTarget = PackTarget {
    os: PackOs::Windows,
    arch: PackArch::X86_64,
};
fn signer() -> SigningKey {
    SigningKey::from_bytes(&[17; 32])
}
fn root(key_id: &str, publisher: &str) -> PackTrustRoot {
    PackTrustRoot {
        key_id: key_id.into(),
        publisher: publisher.into(),
        public_key: signer().verifying_key().to_bytes(),
        valid_from_ms: 1000,
        valid_until_ms: 100_000,
    }
}
fn trust() -> PackTrustStore {
    PackTrustStore::new(vec![root("test-root", "tagma-test")]).unwrap()
}
fn manifest() -> Value {
    json!({"contract_version":1,"id":"reachflow","version":"1.2.3","source":{"kind":"official","publisher":"tagma-test"},"issued_ms":2000,"expires_ms":90_000,
        "artifacts":[{"target":{"os":"windows","arch":"x86_64"},"download":{"url":"https://packages.example.invalid/reachflow.zip","sha256":format!("{:x}",Sha256::digest(ARCHIVE)),"size_bytes":ARCHIVE.len(),"format":"zip"},"entry":{"protocol":"stdio_jsonl_v1","executable":"bin/reachflow.exe","arguments":["--stdio"]},"resources":{"max_unpacked_bytes":104_857_600,"max_archive_entries":64,"memory_mib":256,"max_concurrency":2,"task_timeout_ms":120_000},"permissions":{"network_hosts":["research.example.invalid"],"workspace":"read_write","browser":true,"subprocess":false},"health":{"protocol":"stdio_ping_v1","timeout_ms":1000},"models":[{"id":"tagma/reachflow","display_name":"受控研究队员"}]}]})
}
fn signature(bytes: &[u8]) -> [u8; 64] {
    let mut message = MANIFEST_SIGNATURE_DOMAIN.to_vec();
    message.extend_from_slice(bytes);
    signer().sign(&message).to_bytes()
}
fn verify(value: &Value) -> PackResult<VerifiedManifest> {
    let bytes = serde_json::to_vec(value).unwrap();
    trust().verify("test-root", &bytes, &signature(&bytes), NOW)
}
fn verified() -> VerifiedManifest {
    verify(&manifest()).unwrap()
}
fn entry(path: &str, kind: ArchiveEntryKind, bytes: u64) -> ArchiveEntry {
    ArchiveEntry {
        path: path.into(),
        kind,
        unpacked_bytes: bytes,
    }
}
fn index() -> Vec<ArchiveEntry> {
    vec![
        entry("bin", ArchiveEntryKind::Directory, 0),
        entry("bin/reachflow.exe", ArchiveEntryKind::File, 128),
    ]
}

#[test]
fn signed_manifest_binds_exact_bytes_identity_contract_and_platform() {
    let bytes = serde_json::to_vec(&manifest()).unwrap();
    let proof = trust()
        .verify("test-root", &bytes, &signature(&bytes), NOW)
        .unwrap();
    assert_eq!(proof.manifest().id, "reachflow");
    assert_eq!(proof.manifest().version, "1.2.3");
    assert_eq!(proof.sha256(), format!("{:x}", Sha256::digest(&bytes)));
    assert_eq!(proof.key_id(), "test-root");
    assert_eq!(proof.verified_ms(), NOW);
    assert_eq!(
        proof.artifact(TARGET).unwrap().entry.executable,
        "bin/reachflow.exe"
    );
    assert_eq!(
        proof.artifact(PackTarget {
            os: PackOs::Macos,
            arch: PackArch::Aarch64
        }),
        Err(PackError::UnsupportedPlatform)
    );
    println!(
        "Pack admission:actual Ed25519 strict/domain-separated signature over exact UTF8 bytes ->immutable proof,identity/semver/platform/permissions/models retained;no download/install/execute"
    );
}
#[test]
fn signature_root_publisher_and_domain_cannot_be_supplied_or_rebound_by_pack() {
    let bytes = serde_json::to_vec(&manifest()).unwrap();
    let sig = signature(&bytes);
    assert_eq!(
        PackTrustStore::default()
            .verify("test-root", &bytes, &sig, NOW)
            .unwrap_err(),
        PackError::UntrustedPublisher
    );
    assert_eq!(
        trust().verify("unknown", &bytes, &sig, NOW).unwrap_err(),
        PackError::UntrustedPublisher
    );
    for signature in [
        vec![0; 64],
        sig[..63].to_vec(),
        signer().sign(&bytes).to_bytes().to_vec(),
        SigningKey::from_bytes(&[18; 32])
            .sign(&[MANIFEST_SIGNATURE_DOMAIN, bytes.as_slice()].concat())
            .to_bytes()
            .to_vec(),
    ] {
        assert_eq!(
            trust()
                .verify("test-root", &bytes, &signature, NOW)
                .unwrap_err(),
            PackError::InvalidSignature
        );
    }
    let mut changed = bytes.clone();
    changed.push(b' ');
    assert_eq!(
        trust()
            .verify("test-root", &changed, &sig, NOW)
            .unwrap_err(),
        PackError::InvalidSignature
    );
    assert_eq!(
        PackTrustStore::new(vec![root("test-root", "someone-else")])
            .unwrap()
            .verify("test-root", &bytes, &sig, NOW)
            .unwrap_err(),
        PackError::UntrustedPublisher
    );
    let mut community = manifest();
    community["source"]["kind"] = json!("community");
    assert_eq!(
        verify(&community).unwrap_err(),
        PackError::UntrustedPublisher
    );
    let mut embedded = manifest();
    embedded["source"]["public_key"] = json!("attacker supplied");
    assert_eq!(verify(&embedded).unwrap_err(), PackError::InvalidManifest);
    println!(
        "Pack trust negatives:empty/unknown root,wrong/truncated/zero signature,missing domain,changed raw bytes,issuer mismatch,community/self-key all refused;no bypass flag"
    );
}
#[test]
fn key_registry_and_signed_validity_windows_fail_closed() {
    assert!(matches!(
        PackTrustStore::new(vec![
            root("test-root", "tagma-test"),
            root("test-root", "tagma-test")
        ]),
        Err(PackError::UntrustedPublisher)
    ));
    let mut weak = root("test-root", "tagma-test");
    weak.public_key = [0; 32];
    assert!(matches!(
        PackTrustStore::new(vec![weak]),
        Err(PackError::UntrustedPublisher)
    ));
    let mut invalid = root("test-root", "tagma-test");
    invalid.valid_until_ms = invalid.valid_from_ms;
    assert!(matches!(
        PackTrustStore::new(vec![invalid]),
        Err(PackError::UntrustedPublisher)
    ));
    let bytes = serde_json::to_vec(&manifest()).unwrap();
    let sig = signature(&bytes);
    for now in [0, 100_000, u64::MAX] {
        assert_eq!(
            trust().verify("test-root", &bytes, &sig, now).unwrap_err(),
            PackError::UntrustedPublisher
        );
    }
    for now in [1999, 90_000] {
        assert_eq!(
            trust().verify("test-root", &bytes, &sig, now).unwrap_err(),
            PackError::ExpiredManifest
        );
    }
    assert!(trust().verify("test-root", &bytes, &sig, 2000).is_ok());
    assert!(trust().verify("test-root", &bytes, &sig, 89_999).is_ok());
}
#[test]
fn bounded_schema_rejects_unknown_duplicate_malformed_and_unsafe_metadata() {
    let cases: [(&str, Value); 21] = [
        ("/contract_version", json!(2)),
        ("/id", json!("../reachflow")),
        ("/version", json!("latest")),
        ("/version", json!("1.2.3+alias")),
        ("/source/publisher", json!("UpperCase")),
        ("/expires_ms", json!(2000)),
        ("/artifacts/0/target/os", json!("android")),
        (
            "/artifacts/0/download/url",
            json!("http://packages.example.invalid/a.zip"),
        ),
        (
            "/artifacts/0/download/url",
            json!("https://127.0.0.1/a.zip"),
        ),
        (
            "/artifacts/0/download/url",
            json!("https://user:pass@packages.example.invalid/a.zip"),
        ),
        (
            "/artifacts/0/download/url",
            json!("https://packages.example.invalid/a.zip?key=untrusted"),
        ),
        (
            "/artifacts/0/download/size_bytes",
            json!(MAX_ARCHIVE_BYTES + 1),
        ),
        ("/artifacts/0/download/sha256", json!("f".repeat(63))),
        (
            "/artifacts/0/entry/executable",
            json!("C:/external/install.ps1"),
        ),
        ("/artifacts/0/entry/arguments", json!(["--stdio\ncmd"])),
        (
            "/artifacts/0/resources/max_unpacked_bytes",
            json!(MAX_UNPACKED_BYTES + 1),
        ),
        ("/artifacts/0/resources/max_concurrency", json!(9)),
        ("/artifacts/0/resources/task_timeout_ms", json!(0)),
        (
            "/artifacts/0/permissions/network_hosts",
            json!(["*.example.invalid"]),
        ),
        ("/artifacts/0/health/timeout_ms", json!(10_001)),
        ("/artifacts/0/models/0/id", json!("tagma/someone-else")),
    ];
    for (pointer, bad) in cases {
        let mut value = manifest();
        *value.pointer_mut(pointer).unwrap() = bad;
        assert!(verify(&value).is_err(), "{pointer}");
    }
    let mut duplicate = manifest();
    duplicate["artifacts"]
        .as_array_mut()
        .unwrap()
        .push(manifest()["artifacts"][0].clone());
    assert_eq!(verify(&duplicate).unwrap_err(), PackError::InvalidManifest);
    let mut unknown = manifest();
    unknown["install_script"] = json!("C:/external.ps1");
    assert_eq!(verify(&unknown).unwrap_err(), PackError::InvalidManifest);
    let bytes = serde_json::to_vec(&manifest()).unwrap();
    let mut duplicate = b"{\"contract_version\":1,".to_vec();
    duplicate.extend_from_slice(&bytes[1..]);
    assert_eq!(
        trust()
            .verify("test-root", &duplicate, &signature(&duplicate), NOW)
            .unwrap_err(),
        PackError::InvalidManifest
    );
    assert_eq!(
        PackManifest::parse(&vec![b' '; MAX_MANIFEST_BYTES + 1]),
        Err(PackError::InvalidManifest)
    );
    assert_eq!(PackManifest::parse(b""), Err(PackError::InvalidManifest));
}
#[test]
fn portable_paths_reject_traversal_devices_aliases_and_external_roots() {
    for path in [
        "bin/reachflow.exe",
        "assets/report-template.json",
        ".config/default.json",
        "bin/a_b-1",
    ] {
        assert_eq!(validate_pack_path(path), Ok(()));
    }
    for path in [
        "",
        "/tmp/x",
        "../x",
        "a/../x",
        "a/./x",
        "a//x",
        "a/",
        "C:/x",
        "C:x",
        "\\\\host\\share",
        "bin\\x",
        "a:stream",
        "%2e%2e/x",
        "a./x",
        "a /x",
        "NUL",
        "con.exe",
        "bin/AUX.txt",
        "COM1.exe",
        "lpt9/data",
        "a\0b",
        "é/x",
        "a\nb",
    ] {
        assert_eq!(
            validate_pack_path(path),
            Err(PackError::UnsafePath),
            "{path:?}"
        );
    }
    assert_eq!(
        validate_pack_path(&"x".repeat(241)),
        Err(PackError::UnsafePath)
    );
}
#[test]
fn archive_index_rejects_all_links_aliases_prefix_collisions_and_expansion_limits() {
    let proof = verified();
    let valid = proof.validate_archive_index(TARGET, index()).unwrap();
    assert_eq!(valid.total_bytes(), 128);
    assert_eq!(valid.entries().len(), 2);
    assert_eq!(valid.filesystem_entries(), 2);
    let shared = proof
        .validate_archive_index(
            TARGET,
            vec![
                entry("bin/reachflow.exe", ArchiveEntryKind::File, 1),
                entry("assets/a", ArchiveEntryKind::File, 1),
                entry("assets/b", ArchiveEntryKind::File, 1),
            ],
        )
        .unwrap();
    assert_eq!(
        shared.filesystem_entries(),
        5,
        "shared implicit parents count once"
    );
    let with_directory = proof
        .validate_archive_index(
            TARGET,
            vec![
                entry("bin/reachflow.exe", ArchiveEntryKind::File, 1),
                entry("assets", ArchiveEntryKind::Directory, 0),
                entry("assets/a", ArchiveEntryKind::File, 1),
                entry("assets/b", ArchiveEntryKind::File, 1),
            ],
        )
        .unwrap();
    assert_eq!(
        with_directory.filesystem_entries(),
        5,
        "explicit parent is not double charged"
    );
    assert_eq!(
        proof
            .validate_archive_index(
                TARGET,
                vec![
                    entry("bin/reachflow.exe", ArchiveEntryKind::File, 1),
                    entry("Assets/a", ArchiveEntryKind::File, 1),
                    entry("assets/b", ArchiveEntryKind::File, 1)
                ]
            )
            .unwrap_err(),
        PackError::InvalidArchiveIndex
    );
    for kind in [
        ArchiveEntryKind::Symlink,
        ArchiveEntryKind::Hardlink,
        ArchiveEntryKind::Other,
    ] {
        let mut values = index();
        values.push(entry("inside-link", kind, 0));
        assert_eq!(
            proof.validate_archive_index(TARGET, values).unwrap_err(),
            PackError::UnsafePath
        );
    }
    let mut aliases = index();
    aliases.push(entry("BIN/REACHFLOW.EXE", ArchiveEntryKind::File, 1));
    assert_eq!(
        proof.validate_archive_index(TARGET, aliases).unwrap_err(),
        PackError::InvalidArchiveIndex
    );
    let conflict = vec![
        entry("bin/reachflow.exe", ArchiveEntryKind::File, 128),
        entry("bin", ArchiveEntryKind::File, 0),
    ];
    assert_eq!(
        proof.validate_archive_index(TARGET, conflict).unwrap_err(),
        PackError::InvalidArchiveIndex
    );
    assert_eq!(
        proof
            .validate_archive_index(TARGET, vec![entry("bin", ArchiveEntryKind::Directory, 1)])
            .unwrap_err(),
        PackError::UnsafePath
    );
    assert_eq!(
        proof
            .validate_archive_index(
                TARGET,
                vec![entry("bin/reachflow.exe", ArchiveEntryKind::Directory, 0)]
            )
            .unwrap_err(),
        PackError::InvalidArchiveIndex
    );
    assert_eq!(
        proof
            .validate_archive_index(
                TARGET,
                vec![entry("bin/reachflow.exe", ArchiveEntryKind::File, 0)]
            )
            .unwrap_err(),
        PackError::InvalidArchiveIndex
    );
    assert_eq!(
        proof
            .validate_archive_index(
                TARGET,
                vec![entry(
                    "bin/reachflow.exe",
                    ArchiveEntryKind::File,
                    104_857_601
                )]
            )
            .unwrap_err(),
        PackError::ArchiveLimit
    );
    assert_eq!(
        proof
            .validate_archive_index(
                TARGET,
                (0..65)
                    .map(|i| entry(&format!("f{i}"), ArchiveEntryKind::File, 1))
                    .collect()
            )
            .unwrap_err(),
        PackError::ArchiveLimit
    );
    let mut malicious = index();
    malicious.push(entry("../outside", ArchiveEntryKind::File, 1));
    assert_eq!(
        proof.validate_archive_index(TARGET, malicious).unwrap_err(),
        PackError::UnsafePath
    );
    println!(
        "Pack archive METADATA only:portable traversal/absolute/device/alias paths,all link types,file-prefix collisions,count/expanded size bounds refused;no real extraction or filesystem-race claim"
    );
}
#[test]
fn checksum_is_incremental_exact_and_poisoned_after_an_oversized_download() {
    let proof = verified();
    let mut hash = proof.archive_checksum(TARGET).unwrap();
    for bytes in ARCHIVE.chunks(3) {
        hash.push(bytes).unwrap();
    }
    let digest = hash.finish().unwrap();
    assert_eq!(digest.size_bytes(), ARCHIVE.len() as u64);
    assert_eq!(digest.target(), TARGET);
    assert_eq!(digest.sha256(), format!("{:x}", Sha256::digest(ARCHIVE)));
    let mut truncated = proof.archive_checksum(TARGET).unwrap();
    truncated.push(&ARCHIVE[..ARCHIVE.len() - 1]).unwrap();
    assert_eq!(truncated.finish(), Err(PackError::ChecksumMismatch));
    let mut changed = proof.archive_checksum(TARGET).unwrap();
    changed.push(&vec![b'x'; ARCHIVE.len()]).unwrap();
    assert_eq!(changed.finish(), Err(PackError::ChecksumMismatch));
    let mut oversized = proof.archive_checksum(TARGET).unwrap();
    oversized.push(ARCHIVE).unwrap();
    assert_eq!(oversized.push(b"x"), Err(PackError::ArchiveLimit));
    assert_eq!(oversized.push(b""), Err(PackError::ArchiveLimit));
    assert_eq!(oversized.finish(), Err(PackError::ArchiveLimit));
}
#[test]
fn space_plan_accounts_for_temp_stage_existing_versions_and_same_volume_without_double_charge() {
    let proof = verified();
    let gib = 1024 * 1024 * 1024;
    let mib = 1024 * 1024;
    let separate = proof
        .plan_install_space(
            TARGET,
            40 * mib,
            PackVolumeSpace {
                target_allocation_unit_bytes: 4096,
                temp_allocation_unit_bytes: 4096,
                target_available_bytes: 12 * gib,
                temp_available_bytes: 11 * gib,
                same_volume: false,
            },
        )
        .unwrap();
    assert!(separate.fits());
    assert_eq!(separate.additional_target_bytes, 101 * mib + 64 * 8192);
    assert_eq!(separate.additional_temp_bytes, 3 * 4096);
    assert_eq!(
        separate.logical_peak_bytes,
        140 * mib + ARCHIVE.len() as u64
    );
    let full_temp = proof
        .plan_install_space(
            TARGET,
            40 * mib,
            PackVolumeSpace {
                target_allocation_unit_bytes: 4096,
                temp_allocation_unit_bytes: 4096,
                target_available_bytes: 12 * gib,
                temp_available_bytes: 10 * gib,
                same_volume: false,
            },
        )
        .unwrap();
    assert!(!full_temp.fits());
    assert_eq!(full_temp.temp_shortfall_bytes, 3 * 4096);
    assert_eq!(full_temp.target_shortfall_bytes, 0);
    let shared = proof
        .plan_install_space(
            TARGET,
            500 * gib,
            PackVolumeSpace {
                target_allocation_unit_bytes: 4096,
                temp_allocation_unit_bytes: 4096,
                target_available_bytes: 10 * gib,
                temp_available_bytes: 12 * gib,
                same_volume: true,
            },
        )
        .unwrap();
    assert!(!shared.fits());
    assert_eq!(
        shared.target_shortfall_bytes,
        101 * mib + 64 * 8192 + 3 * 4096
    );
    assert_eq!(shared.target_shortfall_bytes, shared.temp_shortfall_bytes);
    let fits = proof
        .plan_install_space(
            TARGET,
            500 * gib,
            PackVolumeSpace {
                target_allocation_unit_bytes: 4096,
                temp_allocation_unit_bytes: 4096,
                target_available_bytes: 11 * gib,
                temp_available_bytes: 11 * gib,
                same_volume: true,
            },
        )
        .unwrap();
    assert!(
        fits.fits(),
        "retained existing data already reduced actual free space"
    );
    assert_eq!(
        proof.plan_install_space(
            TARGET,
            u64::MAX,
            PackVolumeSpace {
                target_allocation_unit_bytes: 4096,
                temp_allocation_unit_bytes: 4096,
                target_available_bytes: u64::MAX,
                temp_available_bytes: u64::MAX,
                same_volume: false
            }
        ),
        Err(PackError::ArithmeticOverflow)
    );
    assert_eq!(
        proof.plan_install_space(
            TARGET,
            0,
            PackVolumeSpace {
                target_available_bytes: 12 * gib,
                temp_available_bytes: 12 * gib,
                target_allocation_unit_bytes: 0,
                temp_allocation_unit_bytes: 4096,
                same_volume: false
            }
        ),
        Err(PackError::InvalidSpaceObservation)
    );
    println!(
        "Pack space arithmetic only:download onTemp+unpack/stage onTarget+retained old versions;atomic switch no second copy,existing bytes not double-charged;shared volumes combine needs,allocation overhead estimated from host units,logical bytes distinct;each relevant disk retains10GiB;shortfall/overflow explicit;no disk fill/download"
    );
}
