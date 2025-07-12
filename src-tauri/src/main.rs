// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path;

mod pawn;
use tauri::Manager;

const DEFAULT_LOG_LEVEL: &str = "pawn=info";
const LOGGING_ENV_VAR_NAME: &str = "PAWN_LOG";
const LOGS_DIR: &str = "logs";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn main() {
    let tauri_builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(pawn::init_plugin())
        .invoke_handler(tauri::generate_handler![])
        .setup(move |app| {
            init_tracing(&app.path().app_data_dir()?);
            // builder.mount_events(app);

            Ok(())
        });

    tauri_builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_tracing(app_data: &Path) {
    use std::fs::OpenOptions;
    use std::{fs, io};

    use tracing_subscriber::EnvFilter;
    use tracing_subscriber::prelude::*;

    let logging_filter: EnvFilter = EnvFilter::builder()
        .with_default_directive(
            DEFAULT_LOG_LEVEL
                .parse()
                .expect("Default log level constant is bad."),
        )
        .with_env_var(LOGGING_ENV_VAR_NAME)
        .from_env_lossy();

    // STDOUT layer
    let stdout_layer = tracing_subscriber::fmt::layer()
        .pretty()
        .with_writer(io::stdout);

    let registry = tracing_subscriber::registry().with(stdout_layer);

    // `kalione.log` layer
    if !app_data.exists() {
        match fs::create_dir(app_data) {
            Ok(()) => println!("Successfully created app data directory: {:?}", app_data),
            Err(err) => eprintln!(
                "Filed to create app data directory: {:?}. Path: {:?}",
                err, app_data
            ),
        }
    }
    let logs_dir = app_data.join(LOGS_DIR);
    if !logs_dir.exists() {
        match fs::create_dir(&logs_dir) {
            Ok(()) => println!("Successfully created logs directory: {:?}", logs_dir),
            Err(err) => eprintln!(
                "Filed to create logs directory: {:?}. Path: {:?}",
                err, logs_dir
            ),
        }
    }

    let log_file = logs_dir.join("kalione.log");
    match OpenOptions::new().create(true).append(true).open(&log_file) {
        Ok(log_file) => {
            let log_file_layer = tracing_subscriber::fmt::layer()
                .pretty()
                .with_writer(log_file);
            registry.with(log_file_layer).with(logging_filter).init();
        }
        Err(e) => {
            eprintln!("Couldn't open log file: {e}. Path: {:?}.", log_file);
            registry.with(logging_filter).init();
        }
    }
}
