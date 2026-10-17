// Desktop builds, including internal debug installers, never allocate a console.
#![cfg_attr(windows, windows_subsystem = "windows")]

use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use tagma_core::{credentials::SystemCredentials, *};
use tagma_runtime::GatewayManager;
use tauri::{Manager, State, WebviewWindow};
mod chat;

struct Application {
    config: AppResult<ConfigService>,
    runtime: Option<Arc<GatewayManager>>,
    quitting: AtomicBool,
    tray: bool,
    directory: Option<std::path::PathBuf>,
    chat: chat::ChatBridge,
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
        runtime: if let Some(runtime) = &app.runtime {
            runtime.status().await
        } else {
            RuntimeStatus {
                state: RuntimeState::Stopped,
                instance_id: None,
                effective_revision: None,
                address: None,
                owned: false,
                error: None,
            }
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

#[tauri::command]
async fn save_profile(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: SaveAppProfile,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_profile(input)
}

#[tauri::command]
async fn save_team(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: teams::SaveTeam,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_team(input)
}
#[tauri::command]
async fn publish_team(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionCommand,
) -> AppResult<ConfigView> {
    config(&window, &app)?.publish_team(input)
}
#[tauri::command]
async fn set_team_enabled(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: teams::SetTeamEnabled,
) -> AppResult<ConfigView> {
    config(&window, &app)?.set_team_enabled(input)
}
#[tauri::command]
async fn delete_team(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionCommand,
) -> AppResult<ConfigView> {
    config(&window, &app)?.delete_team(input)
}

#[tauri::command]
async fn delete_profile(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionCommand,
) -> AppResult<ConfigView> {
    config(&window, &app)?.delete_profile(input)
}

#[tauri::command]
async fn save_gateway(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: SaveGateway,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_gateway(input)
}
#[tauri::command]
async fn initialize_gateway_token(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionInput,
) -> AppResult<ConfigView> {
    config(&window, &app)?.initialize_gateway_token(input)
}
#[tauri::command]
async fn reveal_gateway_token(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<String> {
    Ok(config(&window, &app)?
        .reveal_gateway_token(protocol_version)?
        .to_string())
}

fn gateway<'a>(window: &WebviewWindow, app: &'a Application) -> AppResult<&'a Arc<GatewayManager>> {
    config(window, app)?;
    app.runtime
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::GatewayUnavailable))
}

#[tauri::command]
async fn send_chat(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: tagma_core::chat::StartChat,
    on_event: tauri::ipc::Channel<tagma_core::chat::ChatEvent>,
) -> AppResult<()> {
    check_protocol(input.protocol_version)?;
    let service = config(&window, &app)?;
    let view = service.view()?;
    if view.desired_revision != input.expected_revision {
        return Err(AppError::new(ErrorCode::ConfigConflict));
    }
    let runtime = gateway(&window, &app)?.status().await;
    if !matches!(runtime.state, RuntimeState::Running)
        || runtime.effective_revision != Some(input.expected_revision)
    {
        return Err(AppError::new(ErrorCode::ConfigApplyFailed));
    }
    let access_token = if view.gateway.auth_enabled {
        Some(service.reveal_gateway_token(PROTOCOL_VERSION)?)
    } else {
        None
    };
    app.chat
        .start(
            input,
            runtime
                .address
                .ok_or_else(|| AppError::new(ErrorCode::GatewayUnavailable))?,
            access_token,
            on_event,
        )
        .await
}
#[tauri::command]
async fn cancel_chat(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    request_id: String,
) -> AppResult<()> {
    check_protocol(protocol_version)?;
    local(&window)?;
    app.chat.cancel(&request_id)
}

#[tauri::command]
async fn start_gateway(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<RuntimeStatus> {
    check_protocol(protocol_version)?;
    let port = config(&window, &app)?.view()?.gateway.port;
    gateway(&window, &app)?.start(gateway_port(port)).await
}
#[tauri::command]
async fn stop_gateway(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<RuntimeStatus> {
    check_protocol(protocol_version)?;
    gateway(&window, &app)?.stop().await
}
#[tauri::command]
async fn apply_gateway(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<RuntimeStatus> {
    check_protocol(protocol_version)?;
    gateway(&window, &app)?.apply().await
}
#[tauri::command]
async fn quit_application(window: WebviewWindow, protocol_version: u32) -> AppResult<()> {
    check_protocol(protocol_version)?;
    local(&window)?;
    window.app_handle().exit(0);
    Ok(())
}

#[tauri::command]
async fn diagnostics_view(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<tagma_core::diagnostics::DiagnosticBundle> {
    check_protocol(protocol_version)?;
    local(&window)?;
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::StorageUnavailable))?;
    let config = app
        .config
        .as_ref()
        .ok()
        .and_then(|service| service.view().ok());
    let runtime = if let Some(manager) = &app.runtime {
        manager.status().await
    } else {
        RuntimeStatus {
            state: RuntimeState::Failed,
            instance_id: None,
            effective_revision: None,
            address: None,
            owned: false,
            error: app.config.as_ref().err().cloned(),
        }
    };
    let recent = tagma_core::diagnostics::recent(directory);
    let manifest = tagma_runtime::ipc::read_manifest(directory).ok();
    Ok(tagma_core::diagnostics::DiagnosticBundle {
        product_version: PRODUCT_VERSION.into(),
        protocol_version: PROTOCOL_VERSION,
        platform: std::env::consts::OS.into(),
        architecture: std::env::consts::ARCH.into(),
        supported_schema_version: SCHEMA_VERSION,
        config_schema_version: config.as_ref().map(|view| view.schema_version),
        desired_revision: config.map(|view| view.desired_revision),
        console_attached: tagma_core::diagnostics::console_attached(),
        sidecar_console_attached: manifest
            .filter(|manifest| Some(&manifest.instance_id) == runtime.instance_id.as_ref())
            .map(|manifest| manifest.console_attached),
        runtime,
        logging_available: recent.is_ok()
            && app
                .runtime
                .as_ref()
                .is_some_and(|manager| manager.logging_available()),
        max_log_bytes: tagma_core::diagnostics::MAX_LOG_BYTES as u32,
        max_log_files: tagma_core::diagnostics::MAX_LOG_FILES as u32,
        telemetry_enabled: false,
        recent_events: recent.unwrap_or_default(),
        initialization_recovery: tagma_core::recovery::initialization_plan(directory)
            .ok()
            .flatten(),
    })
}

#[tauri::command]
async fn recover_initialization(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RecoverInitialization,
) -> AppResult<RecoveryOutcome> {
    local(&window)?;
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::StorageUnavailable))?;
    tagma_core::recovery::archive_initialization_record(directory, input)
}

fn gateway_port(configured: u16) -> u16 {
    if cfg!(debug_assertions)
        && let Some(port) = std::env::var("TAGMA_TEST_GATEWAY_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
    {
        return port;
    }
    configured
}

fn tray(app: &tauri::App) -> bool {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
    };
    let create = || -> tauri::Result<()> {
        let show = MenuItem::with_id(app, "show", "Tagma", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出 Tagma / Quit", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show, &quit])?;
        let mut builder = TrayIconBuilder::with_id("tagma")
            .tooltip("Tagma")
            .menu(&menu)
            .on_menu_event(|app, event| match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            });
        if let Some(icon) = app.default_window_icon() {
            builder = builder.icon(icon.clone());
        }
        builder.build(app)?;
        Ok(())
    };
    create().is_ok()
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
            let runtime = directory.as_ref().ok().and_then(|directory| {
                let executable = std::env::current_exe().ok()?;
                let name = if cfg!(windows) {
                    "tagma-gateway.exe"
                } else {
                    "tagma-gateway"
                };
                let manager = GatewayManager::new(directory, &executable.parent()?.join(name));
                #[cfg(debug_assertions)]
                let manager = {
                    let mut manager = manager;
                    if std::env::var_os("TAGMA_TEST_CONFIG_DIR").is_some()
                        && std::env::var_os("TAGMA_TEST_GATEWAY_PORT").is_some()
                    {
                        manager.allow_fixture_port_override();
                    }
                    manager
                };
                Some(Arc::new(manager))
            });
            let local_directory = directory.as_ref().ok().cloned();
            if let Some(directory) = &local_directory {
                let _ = tagma_core::diagnostics::record(
                    directory,
                    tagma_core::diagnostics::Component::Desktop,
                    tagma_core::diagnostics::Event::Starting,
                    None,
                    None,
                );
            }
            let config = directory
                .map_err(|_| AppError::new(ErrorCode::StorageUnavailable))
                .and_then(|directory| ConfigService::open(&directory, Arc::new(SystemCredentials)))
                .and_then(|config| {
                    // Synthetic debug fixtures explicitly initialize/clean credentials in their tests.
                    if !(cfg!(debug_assertions)
                        && std::env::var_os("TAGMA_TEST_CONFIG_DIR").is_some()
                        && std::env::var("TAGMA_TEST_INITIALIZE_TOKEN").as_deref() != Ok("1"))
                    {
                        let view = config.view()?;
                        if view.gateway.auth_enabled && !view.gateway.has_access_token {
                            config.initialize_gateway_token(RevisionInput {
                                protocol_version: PROTOCOL_VERSION,
                                expected_revision: view.desired_revision,
                            })?;
                        }
                    }
                    Ok(config)
                });
            // Configuration failures remain visible in the native window; never fake an empty success.
            let tray = tray(app);
            if let (Some(directory), Err(error)) = (&local_directory, &config) {
                let _ = tagma_core::diagnostics::record(
                    directory,
                    tagma_core::diagnostics::Component::Desktop,
                    tagma_core::diagnostics::Event::ConfigurationUnavailable,
                    Some(error.code.clone()),
                    None,
                );
            }
            if config.is_ok()
                && let Some(runtime) = runtime.clone()
            {
                let configured = config
                    .as_ref()
                    .ok()
                    .and_then(|service| service.view().ok())
                    .map(|view| view.gateway.port)
                    .unwrap_or(9168);
                tauri::async_runtime::spawn(async move {
                    let _ = runtime.start(gateway_port(configured)).await;
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
                    loop {
                        interval.tick().await;
                        runtime.supervise().await;
                    }
                });
            }
            app.manage(Application {
                config,
                runtime,
                quitting: AtomicBool::new(false),
                tray,
                directory: local_directory,
                chat: chat::ChatBridge::new()?,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_chat,
            cancel_chat,
            save_profile,
            save_team,
            publish_team,
            set_team_enabled,
            delete_team,
            delete_profile,
            save_gateway,
            initialize_gateway_token,
            reveal_gateway_token,
            application_view,
            save_provider,
            delete_provider,
            reorder_providers,
            start_gateway,
            stop_gateway,
            apply_gateway,
            quit_application,
            diagnostics_view,
            recover_initialization
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event
                && window.app_handle().state::<Application>().tray
            {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("Tagma native host failed")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                let state = app.state::<Application>();
                if !state.quitting.swap(true, Ordering::SeqCst) {
                    api.prevent_exit();
                    let runtime = state.runtime.clone();
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Some(runtime) = runtime {
                            let _ = runtime.stop().await;
                        }
                        handle.exit(0);
                    });
                }
            }
        });
}
