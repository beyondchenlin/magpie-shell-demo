fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "application_view",
            "save_provider",
            "delete_provider",
            "reorder_providers",
        ]),
    ))
    .expect("Tauri build configuration failed");
}
