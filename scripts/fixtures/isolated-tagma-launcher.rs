//! Launch only adjacent owned debug fixture files. UI interaction uses sky.
#![cfg_attr(windows, windows_subsystem = "windows")]
fn main() {
    let root=std::env::current_exe().unwrap().parent().unwrap().to_owned();
    assert!(root.file_name().unwrap().to_string_lossy().starts_with("tagma-hotfix-s01-"));
    assert_eq!(std::fs::read_to_string(root.join("owner.txt")).unwrap(),"tagma-hotfix-s01/native/v1");
    let mode=std::fs::read_to_string(root.join("mode.txt")).unwrap();
    let error=match mode.trim(){"success"=>false,"failure"=>true,_=>panic!("fixture mode")};
    let port:u16=std::fs::read_to_string(root.join("port.txt")).unwrap().trim().parse().unwrap();assert_ne!(port,9168);
    let title=format!("Tagma 隔离测试 dev17 {} {}",if error{"错误态"}else{"升级恢复"},root.file_name().unwrap().to_string_lossy().trim_start_matches("tagma-hotfix-s01-").chars().take(8).collect::<String>());
    let mut command=std::process::Command::new(root.join("tagma-desktop.exe"));
    command.env("TAGMA_TEST_CONFIG_DIR",root.join(if error{"error-data"}else{"data"}))
        .env("WEBVIEW2_USER_DATA_FOLDER",root.join(if error{"error-webview"}else{"webview"}))
        .env("TAGMA_TEST_WINDOW_TITLE",title).env("TAGMA_TEST_GATEWAY_PORT",port.to_string())
        .env_remove("TAGMA_TEST_INITIALIZE_TOKEN");
    #[cfg(windows)]{use std::os::windows::process::CommandExt;command.creation_flags(0x08000000);}
    command.spawn().unwrap();
}
