//! Explicitly owned native fixture only; never a migration/recovery command for
//! user data. No system credential access, no UI automation or app launch.
use std::{path::PathBuf, sync::Arc};
use tagma_core::{credentials::CredentialStore, *};
struct NoKeys;
impl CredentialStore for NoKeys {
    fn set(&self, _: &str, _: &str) -> AppResult<()> {
        panic!("fixture must not create keys")
    }
    fn get(&self, _: &str) -> AppResult<zeroize::Zeroizing<String>> {
        panic!("fixture must not read keys")
    }
    fn delete(&self, _: &str) -> AppResult<()> {
        panic!("fixture must not delete keys")
    }
}
fn main() {
    let mut args = std::env::args_os().skip(1);
    let root = PathBuf::from(args.next().expect("fixture root"));
    let mode = args.next().expect("fixture mode");
    let root = root.canonicalize().expect("existing owned fixture");
    assert!(
        root.file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("tagma-hotfix-s01-")
    );
    assert_eq!(
        std::fs::read_to_string(root.join("owner.txt")).unwrap(),
        "tagma-hotfix-s01/native/v1"
    );
    if mode == "create" {
        for (name, bad) in [("data", false), ("error-data", true)] {
            let dir = root.join(name);
            std::fs::create_dir(&dir).unwrap();
            let db = rusqlite::Connection::open(dir.join("config.sqlite3")).unwrap();
            db.execute_batch(include_str!("../tests/fixtures/original-schema1.sql"))
                .unwrap();
            if bad {
                db.execute("UPDATE revisions SET snapshot='{'", []).unwrap();
            }
        }
    } else if mode == "enable-owned-loopback" {
        let port: u16 = std::fs::read_to_string(root.join("port.txt"))
            .unwrap()
            .trim()
            .parse()
            .unwrap();
        assert_ne!(port, 9168);
        let service = ConfigService::open(&root.join("data"), Arc::new(NoKeys)).unwrap();
        let revision = service.view().unwrap().desired_revision;
        service
            .save_gateway(SaveGateway {
                protocol_version: PROTOCOL_VERSION,
                expected_revision: revision,
                port,
                auth_enabled: false,
            })
            .unwrap();
    } else {
        panic!("unknown fixture mode")
    }
    println!("owned fixture prepared;no system keys/user data/UI accessed");
}
