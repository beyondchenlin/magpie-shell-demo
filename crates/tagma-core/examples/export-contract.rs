use tagma_core::diagnostics::{Component, DiagnosticBundle, Event, Record};
use tagma_core::*;
use ts_rs::TS;

fn main() {
    let cfg = ts_rs::Config::default();
    let declarations = [
        ErrorCode::decl(&cfg),
        AppError::decl(&cfg),
        ProviderProtocol::decl(&cfg),
        Provider::decl(&cfg),
        SaveProvider::decl(&cfg),
        RevisionCommand::decl(&cfg),
        ReorderProviders::decl(&cfg),
        ConfigView::decl(&cfg),
        RuntimeState::decl(&cfg),
        RuntimeStatus::decl(&cfg),
        ApplicationView::decl(&cfg),
        Component::decl(&cfg),
        Event::decl(&cfg),
        Record::decl(&cfg),
        DiagnosticBundle::decl(&cfg),
    ];
    let content = format!(
        "// Generated from tagma-core. Run npm run contract:generate; do not edit.\n{}\n",
        declarations
            .iter()
            .map(|d| format!("export {d}"))
            .collect::<Vec<_>>()
            .join("\n")
    );
    let path =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../src/product/contract.ts");
    if std::env::args().any(|a| a == "--check") {
        assert_eq!(
            std::fs::read_to_string(path).expect("generate contract first"),
            content,
            "DTO drift; regenerate contract"
        );
    } else {
        std::fs::write(path, content).expect("write contract");
    }
}
