pub mod budgets;
pub mod catalog;
pub mod chat;
pub mod contract;
pub mod credentials;
pub mod diagnostics;
pub mod health;
mod initialization;
mod migrations;
pub mod packs;
pub mod recovery;
pub mod security;
pub mod service;
pub mod teams;
pub mod timeouts;
pub mod usage;

pub use contract::*;
pub use service::ConfigService;

/// Bounded HTTP admission, including bodies retained by slow downstream readers.
/// The default must accommodate the PRD's ten concurrent request workload.
pub const DEFAULT_HTTP_CONCURRENCY: usize = 16;
