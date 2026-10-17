fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "application_view",
            "save_provider",
            "delete_provider",
            "reorder_providers",
            "save_profile",
            "delete_profile",
            "start_gateway",
            "stop_gateway",
            "apply_gateway",
            "quit_application",
            "diagnostics_view",
            "recover_initialization",
        ]),
    ))
    .expect("Tauri build configuration failed");
}
