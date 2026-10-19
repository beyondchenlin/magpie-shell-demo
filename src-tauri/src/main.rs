// Desktop builds, including internal debug installers, never allocate a console.
#![cfg_attr(windows, windows_subsystem = "windows")]

use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use tagma_core::{credentials::SystemCredentials, *};
use tagma_runtime::GatewayManager;
use tauri::{Emitter, Manager, State, WebviewWindow};
mod chat;
mod packs;
mod startup;

struct Application {
    installation: AppResult<tagma_runtime::installation::InstallationLease>,
    config: AppResult<ConfigService>,
    runtime: Option<Arc<GatewayManager>>,
    quitting: AtomicBool,
    exit_confirmed: AtomicBool,
    exit_ready: AtomicBool,
    tray: bool,
    directory: Option<std::path::PathBuf>,
    chat: chat::ChatBridge,
    usage_reader: tagma_runtime::usage::UsageReader,
    packs: std::sync::Mutex<Option<Arc<packs::PackBridge>>>,
}

fn pack_bridge(
    window: &WebviewWindow,
    app: &Application,
) -> Result<Arc<packs::PackBridge>, tagma_core::packs::PackUiError> {
    let service = config(window, app).map_err(|_| tagma_core::packs::PackUiError {
        code: "PACK_UNAVAILABLE".into(),
    })?;
    let mut state = app
        .packs
        .lock()
        .map_err(|_| tagma_core::packs::PackUiError {
            code: "PACK_UNAVAILABLE".into(),
        })?;
    if let Some(bridge) = state.as_ref() {
        return Ok(bridge.clone());
    }
    let bridge = Arc::new(packs::PackBridge::new(
        app.directory
            .as_deref()
            .ok_or(tagma_core::packs::PackUiError {
                code: "PACK_UNAVAILABLE".into(),
            })?,
        service,
    )?);
    *state = Some(bridge.clone());
    Ok(bridge)
}
fn pack_protocol(version: u32) -> Result<(), tagma_core::packs::PackUiError> {
    check_protocol(version).map_err(|_| tagma_core::packs::PackUiError {
        code: "INCOMPATIBLE_VERSION".into(),
    })
}
#[tauri::command]
async fn list_pack_results(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    directory: String,
) -> Result<Vec<tagma_core::packs::SavedPackResult>, tagma_core::packs::PackUiError> {
    pack_protocol(protocol_version)?;
    config(&window, &app).map_err(|_| tagma_core::packs::PackUiError {
        code: "RESULT_READ_FAILED".into(),
    })?;
    tauri::async_runtime::spawn_blocking(move || {
        tagma_runtime::pack_result::list(std::path::Path::new(&directory))
    })
    .await
    .map_err(|_| tagma_core::packs::PackUiError {
        code: "RESULT_READ_FAILED".into(),
    })?
    .map_err(|code| tagma_core::packs::PackUiError { code: code.into() })
}
#[tauri::command]
async fn read_pack_result(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    directory: String,
    name: String,
) -> Result<String, tagma_core::packs::PackUiError> {
    pack_protocol(protocol_version)?;
    config(&window, &app).map_err(|_| tagma_core::packs::PackUiError {
        code: "RESULT_READ_FAILED".into(),
    })?;
    tauri::async_runtime::spawn_blocking(move || {
        tagma_runtime::pack_result::read(std::path::Path::new(&directory), &name)
    })
    .await
    .map_err(|_| tagma_core::packs::PackUiError {
        code: "RESULT_READ_FAILED".into(),
    })?
    .map_err(|code| tagma_core::packs::PackUiError { code: code.into() })
}
#[tauri::command]
async fn save_pack_result(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    directory: String,
    raw: String,
) -> Result<String, tagma_core::packs::PackUiError> {
    let fail = |code: &str| tagma_core::packs::PackUiError { code: code.into() };
    pack_protocol(protocol_version)?;
    config(&window, &app).map_err(|_| fail("RESULT_SAVE_FAILED"))?;
    let config = app
        .directory
        .clone()
        .ok_or_else(|| fail("RESULT_SAVE_FAILED"))?;
    let install = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(std::path::Path::to_path_buf))
        .ok_or_else(|| fail("RESULT_SAVE_FAILED"))?;
    tauri::async_runtime::spawn_blocking(move || {
        tagma_runtime::pack_result::save(std::path::Path::new(&directory), &raw, &[config, install])
    })
    .await
    .map_err(|_| fail("RESULT_SAVE_FAILED"))?
    .map_err(fail)
}
#[tauri::command]
fn pack_market(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> Result<tagma_core::packs::PackMarketView, tagma_core::packs::PackUiError> {
    pack_protocol(protocol_version)?;
    pack_bridge(&window, &app)?.view()
}
#[tauri::command]
async fn review_pack(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    record: String,
) -> Result<tagma_core::packs::PackReviewView, tagma_core::packs::PackUiError> {
    pack_protocol(protocol_version)?;
    let bridge = pack_bridge(&window, &app)?;
    bridge.review(
        app.config
            .as_ref()
            .map_err(|_| tagma_core::packs::PackUiError {
                code: "PACK_UNAVAILABLE".into(),
            })?,
        &record,
    )
}
#[tauri::command]
async fn install_pack(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: tagma_core::packs::ConfirmPackInstall,
    on_event: tauri::ipc::Channel<tagma_core::packs::PackTaskEvent>,
) -> Result<ConfigView, tagma_core::packs::PackUiError> {
    pack_protocol(input.protocol_version)?;
    let bridge = pack_bridge(&window, &app)?;
    bridge
        .install(
            app.config
                .as_ref()
                .map_err(|_| tagma_core::packs::PackUiError {
                    code: "PACK_UNAVAILABLE".into(),
                })?,
            input,
            on_event,
        )
        .await
}
#[tauri::command]
async fn manage_pack(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: tagma_core::packs::ManagePack,
    on_event: tauri::ipc::Channel<tagma_core::packs::PackTaskEvent>,
) -> Result<ConfigView, tagma_core::packs::PackUiError> {
    pack_protocol(input.protocol_version)?;
    let bridge = pack_bridge(&window, &app)?;
    bridge
        .manage(
            app.config
                .as_ref()
                .map_err(|_| tagma_core::packs::PackUiError {
                    code: "PACK_UNAVAILABLE".into(),
                })?,
            input,
            on_event,
        )
        .await
}
#[tauri::command]
async fn uninstall_pack(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: tagma_core::packs::UninstallPack,
    on_event: tauri::ipc::Channel<tagma_core::packs::PackTaskEvent>,
) -> Result<ConfigView, tagma_core::packs::PackUiError> {
    pack_protocol(input.protocol_version)?;
    let bridge=pack_bridge(&window,&app)?;
    let handle=window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let app=handle.state::<Application>();
        let config=app.config.as_ref().map_err(|_|tagma_core::packs::PackUiError{code:"PACK_UNAVAILABLE".into()})?;
        bridge.uninstall(config,input,on_event)
    }).await.map_err(|_|tagma_core::packs::PackUiError{code:"PACK_UNAVAILABLE".into()})?
}
#[tauri::command]
async fn invoke_pack(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: tagma_core::packs::InvokePack,
    on_event: tauri::ipc::Channel<tagma_core::packs::PackTaskEvent>,
) -> Result<(), tagma_core::packs::PackUiError> {
    pack_protocol(input.protocol_version)?;
    let bridge = pack_bridge(&window, &app)?;
    bridge
        .call(
            app.config
                .as_ref()
                .map_err(|_| tagma_core::packs::PackUiError {
                    code: "PACK_UNAVAILABLE".into(),
                })?,
            input,
            on_event,
        )
        .await
}
#[tauri::command]
fn cancel_pack(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    task_id: String,
) -> Result<(), tagma_core::packs::PackUiError> {
    pack_protocol(protocol_version)?;
    pack_bridge(&window, &app)?.cancel(&task_id)
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
                usage_degraded: None,
                usage_pending_results: None,
                security_revision: None,
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
fn save_provider_timeouts(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: timeouts::SaveProviderTimeouts,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_provider_timeouts(input)
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
async fn save_first_cloud_order(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: SaveFirstCloudOrder,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_first_cloud_order(input)
}

#[tauri::command]
async fn probe_provider(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: catalog::ProbeProvider,
) -> AppResult<ConfigView> {
    let config = config(&window, &app)?;
    gateway(&window, &app)?.probe_provider(input).await?;
    config.view()
}
#[tauri::command]
async fn cancel_probe(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    request_id: String,
) -> AppResult<()> {
    check_protocol(protocol_version)?;
    gateway(&window, &app)?.cancel_probe(request_id).await
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

#[tauri::command]
async fn revoke_access(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: security::RevokeAccess,
) -> AppResult<ConfigView> {
    let config = config(&window, &app)?;
    let receipt = config.revoke_access(input)?;
    if let Some(runtime) = &app.runtime {
        let _ = runtime.confirm_security(receipt.revision).await;
    }
    config.view()
}
#[tauri::command]
async fn rotate_gateway_token(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: security::RotateGatewayToken,
) -> AppResult<ConfigView> {
    let config = config(&window, &app)?;
    let saved = config.rotate_gateway_token(input)?;
    if let Some(runtime) = &app.runtime {
        let _ = runtime.apply().await;
        let _ = runtime.confirm_security(saved.security.revision).await;
    }
    config.view()
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
async fn confirm_quit(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<()> {
    check_protocol(protocol_version)?;
    local(&window)?;
    app.exit_confirmed.store(true, Ordering::SeqCst);
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
            usage_degraded: None,
            usage_pending_results: None,
            security_revision: None,
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
        initialization_recovery: if app.installation.is_ok() {
            tagma_core::recovery::initialization_plan(directory)
                .ok()
                .flatten()
        } else {
            None
        },
    })
}
#[tauri::command]
async fn usage_requests(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: usage::read::UsageRequestsQuery,
) -> AppResult<usage::read::UsageRequestsView> {
    local(&window)?;
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::UsageQueryUnavailable))?;
    app.usage_reader.requests(directory, input).await
}
#[tauri::command]
async fn usage_details(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: usage::read::UsageDetailsQuery,
) -> AppResult<usage::read::UsageDetailsView> {
    local(&window)?;
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::UsageQueryUnavailable))?;
    app.usage_reader.details(directory, input).await
}
#[tauri::command]
async fn usage_summary(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: usage::read::UsageSummaryQuery,
) -> AppResult<usage::read::UsageSummaryView> {
    local(&window)?;
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::UsageQueryUnavailable))?;
    app.usage_reader.summary(directory, input).await
}
#[tauri::command]
async fn recover_usage(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<RuntimeStatus> {
    check_protocol(protocol_version)?;
    gateway(&window, &app)?.recover_usage().await
}
#[tauri::command]
async fn usage_context(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
) -> AppResult<usage::read::UsageReadInfo> {
    check_protocol(protocol_version)?;
    local(&window)?;
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::UsageQueryUnavailable))?;
    app.usage_reader.metadata(directory).await
}
#[tauri::command]
fn save_budget(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: budgets::SaveBudget,
) -> AppResult<ConfigView> {
    config(&window, &app)?.save_budget(input)
}
#[tauri::command]
fn delete_budget(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionCommand,
) -> AppResult<ConfigView> {
    config(&window, &app)?.delete_budget(input)
}
#[tauri::command]
async fn usage_budgets(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RevisionInput,
) -> AppResult<usage::read::budgets::BudgetObservations> {
    check_protocol(input.protocol_version)?;
    let (revision, snapshot) = config(&window, &app)?.read_snapshot()?;
    if revision != input.expected_revision {
        return Err(AppError::new(ErrorCode::ConfigConflict));
    }
    let directory = app
        .directory
        .as_ref()
        .ok_or_else(|| AppError::new(ErrorCode::UsageQueryUnavailable))?;
    app.usage_reader
        .budget_observations(directory, snapshot.budgets, revision)
        .await
}
#[tauri::command]
async fn prepare_usage_clear(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    range: usage::read::UsageRange,
) -> AppResult<usage::clear::UsageClearPlan> {
    check_protocol(protocol_version)?;
    gateway(&window, &app)?.prepare_usage_clear(range).await
}
#[tauri::command]
async fn clear_usage(
    window: WebviewWindow,
    app: State<'_, Application>,
    protocol_version: u32,
    plan: usage::clear::UsageClearPlan,
) -> AppResult<usage::clear::UsageClearReceipt> {
    check_protocol(protocol_version)?;
    gateway(&window, &app)?.clear_usage(plan).await
}

#[tauri::command]
async fn recover_initialization(
    window: WebviewWindow,
    app: State<'_, Application>,
    input: RecoverInitialization,
) -> AppResult<RecoveryOutcome> {
    local(&window)?;
    app.installation.as_ref().map_err(Clone::clone)?;
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
    // The package runs its own candidate executable from NSIS private staging,
    // while NSIS holds the target configuration's exclusive maintenance lock.
    // This mode never initializes Tauri, opens credentials, migrates or starts IPC.
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    if args.first().is_some_and(|a| a == "--check-update-config") {
        let code = if args.len() != 2 {
            12
        } else {
            match tagma_runtime::update::check_configuration(std::path::Path::new(&args[1])) {
                Ok(()) => 0,
                Err(e) if e.code == ErrorCode::IncompatibleVersion => 13,
                Err(e) if e.code == ErrorCode::MaintenanceInProgress => 16,
                Err(_) => 15,
            }
        };
        std::process::exit(code);
    }
    tauri::Builder::default()
        .setup(|app| {
            let installation = tagma_runtime::installation::InstallationLease::current();
            let directory = if cfg!(debug_assertions) {
                std::env::var_os("TAGMA_TEST_CONFIG_DIR")
                    .map(std::path::PathBuf::from)
                    .map(Ok)
                    .unwrap_or_else(|| app.path().app_config_dir())
            } else {
                app.path().app_config_dir()
            };
            let runtime = directory.as_ref().ok().and_then(|directory| {
                installation.as_ref().ok()?;
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
            // Explicitly owned debug fixtures can identify their window without
            // changing the user's installed window or the normal product title.
            #[cfg(debug_assertions)]
            if std::env::var_os("TAGMA_TEST_CONFIG_DIR").is_some()
                && let Ok(title) = std::env::var("TAGMA_TEST_WINDOW_TITLE")
                && title.starts_with("Tagma 隔离测试 ")
                && title.len() <= 180
                && !title.chars().any(char::is_control)
                && let Some(window) = app.get_webview_window("main")
            {
                window.set_title(&title)?;
            }
            if installation.is_ok()
                && let Some(directory) = &local_directory
            {
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
                .and_then(|directory| {
                    installation.as_ref().map_err(Clone::clone)?;
                    // Synthetic debug fixtures explicitly initialize/clean credentials in their tests.
                    let initialize_token = !(cfg!(debug_assertions)
                        && std::env::var_os("TAGMA_TEST_CONFIG_DIR").is_some()
                        && std::env::var("TAGMA_TEST_INITIALIZE_TOKEN").as_deref() != Ok("1"));
                    startup::open(&directory, Arc::new(SystemCredentials), initialize_token)
                });
            // Configuration failures remain visible in the native window; never fake an empty success.
            let tray = tray(app);
            if installation.is_ok()
                && let (Some(directory), Err(error)) = (&local_directory, &config)
            {
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
                installation,
                config,
                runtime,
                quitting: AtomicBool::new(false),
                exit_confirmed: AtomicBool::new(false),
                exit_ready: AtomicBool::new(false),
                tray,
                directory: local_directory,
                chat: chat::ChatBridge::new()?,
                usage_reader: Default::default(),
                packs: Default::default(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_pack_result,
            list_pack_results,
            read_pack_result,
            pack_market,
            review_pack,
            install_pack,
            invoke_pack,
            manage_pack,
            uninstall_pack,
            cancel_pack,
            send_chat,
            cancel_chat,
            save_profile,
            save_first_cloud_order,
            probe_provider,
            cancel_probe,
            save_team,
            publish_team,
            set_team_enabled,
            delete_team,
            delete_profile,
            save_gateway,
            initialize_gateway_token,
            reveal_gateway_token,
            revoke_access,
            rotate_gateway_token,
            application_view,
            save_provider,
            save_provider_timeouts,
            delete_provider,
            reorder_providers,
            start_gateway,
            stop_gateway,
            apply_gateway,
            quit_application,
            confirm_quit,
            diagnostics_view,
            usage_requests,
            usage_details,
            usage_summary,
            recover_usage,
            usage_context,
            save_budget,
            delete_budget,
            usage_budgets,
            prepare_usage_clear,
            clear_usage,
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
                if state.exit_ready.load(Ordering::SeqCst) {
                    return;
                }
                api.prevent_exit();
                // A second tray/OS quit cannot bypass a drain already in progress.
                if state.quitting.load(Ordering::SeqCst) {
                    return;
                }
                if !state.exit_confirmed.swap(false, Ordering::SeqCst) {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("tagma-quit-requested", ());
                    }
                    return;
                }
                if !state.quitting.swap(true, Ordering::SeqCst) {
                    let runtime = state.runtime.clone();
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let packs = handle
                            .state::<Application>()
                            .packs
                            .lock()
                            .ok()
                            .and_then(|state| state.clone());
                        if let Some(packs) = packs
                            && packs.shutdown().await.is_err()
                        {
                            handle
                                .state::<Application>()
                                .quitting
                                .store(false, Ordering::SeqCst);
                            let _ = handle
                                .emit("tagma-quit-failed", AppError::new(ErrorCode::InternalError));
                            return;
                        }
                        if let Some(runtime) = runtime
                            && let Err(error) = runtime.stop().await
                            && error.code != ErrorCode::OwnershipRequired
                        {
                            if let Ok(state) = handle.state::<Application>().packs.lock()
                                && let Some(packs) = state.as_ref()
                            {
                                packs.resume_after_failed_quit();
                            }
                            handle
                                .state::<Application>()
                                .quitting
                                .store(false, Ordering::SeqCst);
                            let _ = handle.emit("tagma-quit-failed", error);
                            return;
                        }
                        handle
                            .state::<Application>()
                            .exit_ready
                            .store(true, Ordering::SeqCst);
                        handle.exit(0);
                    });
                }
            }
        });
}
