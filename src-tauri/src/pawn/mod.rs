use std::fs;

use specta_typescript::formatter::prettier;
use specta_typescript::{BigIntExportBehavior, Typescript};
use state::PawnState;
use tauri::{Runtime, plugin::TauriPlugin};

use tauri::{Manager, async_runtime::block_on, plugin::Builder};
use tauri_specta::collect_commands;
use tracing::{debug, error, info};

use crate::pawn::common::constants::APP_PLUGIN_NAME;
pub mod command;
pub mod common;
pub mod db;
pub mod domain;
pub mod service;
pub mod state;

pub fn init_plugin<R: Runtime>() -> TauriPlugin<R> {
    debug!("init_plugin");

    let builder = tauri_specta::Builder::new()
        .plugin_name(APP_PLUGIN_NAME)
        .commands(collect_commands![
            command::tournament::get_tournaments,
            command::tournament::get_tournament,
            command::tournament::create_tournament,
            command::tournament::get_tournament_details,
            command::tournament::get_players_by_tournament,
            command::tournament::create_player,
            command::tournament::get_games_by_tournament,
            command::tournament::create_game,
            command::tournament::get_player_results,
            command::tournament::get_game_results,
            command::tournament::populate_mock_data,
            command::tournament::get_tournament_standings,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::new()
                .header("// @ts-nocheck")
                .bigint(BigIntExportBehavior::Number)
                .formatter(prettier),
            "../src/dto/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    Builder::new(APP_PLUGIN_NAME)
        .invoke_handler(builder.invoke_handler())
        .setup(|app_handle, _api| {
            info!("Starting app setup...");

            let path_resolver = app_handle.path();
            let app_data = path_resolver.app_data_dir().unwrap_or_default();
            debug!(?app_data);
            if !app_data.exists() {
                match fs::create_dir(&app_data) {
                    Ok(()) => info!(?app_data, "Successfully created app data directory"),
                    Err(err) => error!(?err, ?app_data, "Filed to create app data directory"),
                }
            }

            let db_dir = app_data.join("db");

            if !db_dir.exists() {
                match fs::create_dir(&db_dir) {
                    Ok(()) => info!(?db_dir, "Successfully created database directory"),
                    Err(err) => error!(?err, ?db_dir, "Filed to create database directory"),
                }
            }

            let pawn_state = block_on(PawnState::init(db_dir, app_data));
            app_handle.manage(pawn_state);

            Ok(())
        })
        .build()
}
