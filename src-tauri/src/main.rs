#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tagma_core::{credentials::SystemCredentials, *};
use tauri::{Manager, State, WebviewWindow};

struct Application {
    config: AppResult<ConfigService>,
}

fn local(window: &WebviewWindow) -> AppResult<()> {
    let url = window
        .url()
        .map_err(|_| AppError::new(ErrorCode::InternalError))?;
    let bundled = url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost");
    let dev =
        cfg!(debug_assertions) && url.host_str() == Some("localhost") && url.port() == Some(1420);
    if window.label() == "main" && (bundled || dev) {
        Ok(())
    } else {
        Err(AppError::new(ErrorCode::InvalidInput))
    }
}

fn config<'a>(window: &WebviewWindow, app: &'a Application) -> AppResult<&'a ConfigService> {
    local(window)?;
    app.config.as_ref().map_err(Clone::clone)
}

#[tauri::command]
async fn application_view(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<ApplicationView> {
    check_protocol(protocol_version)?;
    let config = config(&window, &app)?;
    Ok(ApplicationView {
        product_version: PRODUCT_VERSION.into(),
        config: config.view()?,
        runtime: RuntimeStatus {
            state: RuntimeState::Stopped,
            instance_id: None,
            effective_revision: None,
            address: None,
            owned: false,
            error: None,
        },
    })
}

#[tauri::command]
async fn save_provider(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: SaveProvider,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_provider(input)
}

#[tauri::command]
async fn delete_provider(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionCommand,
) -> AppResult<ConfigView> {
    config(&window, &app)?.delete_provider(input)
}

#[tauri::command]
async fn reorder_providers(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: ReorderProviders,
) -> AppResult<ConfigView> {
    config(&window, &app)?.reorder_providers(input)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let directory = if cfg!(debug_assertions) {
                std::env::var_os("TAGMA_TEST_CONFIG_DIR")
                    .map(std::path::PathBuf::from)
                    .map(Ok)
                    .unwrap_or_else(|| app.path().app_config_dir())
            } else {
                app.path().app_config_dir()
            };
            let config = directory
                .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))
                .and_then(|directory| ConfigService::open(&directory, Arc::new(SystemCredentials)));
            // Configuration failures remain visible in the native window; never fake an empty success.
            app.manage(Application { config });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            application_view,
            save_provider,
            delete_provider,
            reorder_providers
        ])
        .run(tauri::generate_context!())
        .expect("Tagma native host failed");
}
