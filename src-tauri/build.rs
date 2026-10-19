fn main() {
    internal_pack();
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "save_pack_result",
            "list_pack_results",
            "read_pack_result",
            "pack_market",
            "review_pack",
            "install_pack",
            "invoke_pack",
            "manage_pack",
            "cancel_pack",
            "send_chat",
            "cancel_chat",
            "application_view",
            "save_provider",
            "save_provider_timeouts",
            "delete_provider",
            "reorder_providers",
            "save_profile",
            "save_first_cloud_order",
            "probe_provider",
            "cancel_probe",
            "save_team",
            "publish_team",
            "set_team_enabled",
            "delete_team",
            "delete_profile",
            "save_gateway",
            "initialize_gateway_token",
            "reveal_gateway_token",
            "revoke_access",
            "rotate_gateway_token",
            "start_gateway",
            "stop_gateway",
            "apply_gateway",
            "quit_application",
            "confirm_quit",
            "diagnostics_view",
            "usage_requests",
            "usage_details",
            "usage_summary",
            "recover_usage",
            "usage_context",
            "save_budget",
            "delete_budget",
            "usage_budgets",
            "prepare_usage_clear",
            "clear_usage",
            "recover_initialization",
        ]),
    ))
    .expect("Tauri build configuration failed");
}

fn internal_pack() {
    use std::{env, fs, path::PathBuf};
    println!("cargo:rerun-if-env-changed=TAGMA_INTERNAL_PACK_DIR");
    let out = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR"));
    if let Some(dir) = env::var_os("TAGMA_INTERNAL_PACK_DIR") {
        assert_eq!(
            env::var("PROFILE").as_deref(),
            Ok("debug"),
            "internal packs are debug-only"
        );
        let dir = PathBuf::from(dir);
        for (name, limit) in [
            ("internal-pack.json", 400_000),
            ("internal-pack.zip", 32 * 1024 * 1024),
        ] {
            let path = dir.join(name);
            println!("cargo:rerun-if-changed={}", path.display());
            let bytes = fs::read(path).expect("read internal package");
            assert!(bytes.len() <= limit, "internal package bound");
            fs::write(out.join(name), bytes).expect("embed internal package");
        }
    } else {
        fs::write(out.join("internal-pack.json"), b"null").expect("empty internal catalogue");
        fs::write(out.join("internal-pack.zip"), b"").expect("empty internal archive");
    }
}
