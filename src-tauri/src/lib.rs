// ── Bounded Context modules ─────────────────────────────────────────
pub mod modules;

// Re-export bounded contexts at crate root for ergonomic access
pub use modules::competition;
pub use modules::export;
pub use modules::participant;
pub use modules::settings;
pub use modules::standings;
pub use modules::team;
pub use modules::tournament;

// ── Infrastructure ──
pub mod common;
pub mod db;
pub mod plugin;
pub mod state;
