//! Adjacent owned candidate launcher; no screenshot, input or private IPC automation.
#![cfg_attr(windows, windows_subsystem = "windows")]
fn main() {
    let root = std::env::current_exe().unwrap().parent().unwrap().to_owned();
    let name = root.file_name().unwrap().to_string_lossy();
    assert!(name.starts_with("tagma-p0-s09-"));
    assert_eq!(std::fs::read_to_string(root.join("owner.txt")).unwrap(), "tagma-p0-s09/native/v1");
    let port: u16 = std::fs::read_to_string(root.join("port.txt")).unwrap().trim().parse().unwrap();
    assert_ne!(port, 9168);
    let mut command = std::process::Command::new(root.join("tagma-desktop.exe"));
    command.env("TAGMA_TEST_CONFIG_DIR", root.join("data"))
        .env("WEBVIEW2_USER_DATA_FOLDER", root.join("webview"))
        .env("TAGMA_TEST_WINDOW_TITLE", format!("Tagma 隔离测试 dev18 P0-S09 {}", &name[13..21]))
        .env("TAGMA_TEST_GATEWAY_PORT", port.to_string())
        .env_remove("TAGMA_TEST_INITIALIZE_TOKEN");
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command.spawn().unwrap();
}
