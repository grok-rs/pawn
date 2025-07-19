use std::fs;

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
            command::tournament::delete_tournament,
            command::tournament::get_players_by_tournament,
            command::tournament::create_player,
            command::tournament::get_games_by_tournament,
            command::tournament::create_game,
            command::tournament::get_player_results,
            command::tournament::get_game_results,
            command::tournament::populate_mock_data,
            command::tournament::populate_mock_tournaments,
            command::tournament::get_tournament_standings,
            command::tournament::get_tiebreak_breakdown,
            command::tournament::get_realtime_standings,
            command::tournament::force_recalculate_standings,
            command::tournament::clear_standings_cache,
            command::tournament::get_tournament_settings,
            command::tournament::update_tournament_settings,
            command::tournament::update_tournament_status,
            command::round::get_rounds_by_tournament,
            command::round::get_current_round,
            command::round::create_round,
            command::round::update_round_status,
            command::round::get_round_details,
            command::round::generate_pairings,
            command::round::create_pairings_as_games,
            command::round::complete_round,
            command::round::create_next_round,
            command::round::update_tournament_pairing_method,
            // Enhanced Pairing System Commands
            command::round::generate_enhanced_pairings,
            command::round::analyze_swiss_pairings,
            command::round::analyze_round_robin_pairings,
            command::round::validate_pairing_configuration,
            command::round::benchmark_pairing_performance,
            command::game_result::update_game_result,
            command::game_result::validate_game_result,
            command::game_result::batch_update_results,
            command::game_result::get_enhanced_game_result,
            command::game_result::get_game_audit_trail,
            command::game_result::approve_game_result,
            command::game_result::get_pending_approvals,
            command::game_result::get_game_result_types,
            command::game_result::import_results_csv,
            // Enhanced Player Management Commands
            command::player::create_player_enhanced,
            command::player::update_player,
            command::player::delete_player,
            command::player::get_player_by_id,
            command::player::get_players_by_tournament_enhanced,
            command::player::search_players,
            command::player::bulk_import_players,
            command::player::validate_bulk_import,
            command::player::add_player_rating_history,
            command::player::get_player_rating_history,
            command::player::create_player_category,
            command::player::get_tournament_categories,
            command::player::delete_player_category,
            command::player::assign_player_to_category,
            command::player::get_player_category_assignments,
            command::player::update_player_status,
            command::player::withdraw_player,
            command::player::request_player_bye,
            command::player::get_player_statistics,
            // Knockout Tournament Commands
            command::knockout::create_knockout_bracket,
            command::knockout::get_knockout_bracket,
            command::knockout::initialize_knockout_tournament,
            command::knockout::get_bracket_positions,
            command::knockout::get_bracket_positions_by_round,
            command::knockout::generate_knockout_pairings,
            command::knockout::advance_knockout_winners,
            command::knockout::get_knockout_tournament_winner,
            command::knockout::is_knockout_tournament_complete,
            command::knockout::validate_knockout_bracket,
            // Time Control Commands
            command::time_control::create_time_control,
            command::time_control::get_time_control,
            command::time_control::get_time_controls,
            command::time_control::get_default_time_controls,
            command::time_control::update_time_control,
            command::time_control::delete_time_control,
            command::time_control::get_time_control_templates,
            command::time_control::validate_time_control_data,
            // Seeding and Ranking Commands
            command::seeding::create_tournament_seeding_settings,
            command::seeding::get_tournament_seeding_settings,
            command::seeding::update_tournament_seeding_settings,
            command::seeding::generate_tournament_seeding,
            command::seeding::apply_tournament_seeding,
            command::seeding::generate_pairing_numbers,
            command::seeding::analyze_tournament_seeding,
            // Export Commands
            command::export::export_tournament_data,
            command::export::get_export_directory,
            command::export::get_available_export_formats,
            command::export::get_export_templates,
            command::export::validate_export_request,
            command::export::get_export_preview,
            // Norm Calculation Commands
            command::norm_calculation::calculate_norm,
            command::norm_calculation::calculate_available_norms,
            command::norm_calculation::get_norm_types,
            command::norm_calculation::get_norm_requirements,
            command::norm_calculation::calculate_prize_distribution,
            command::norm_calculation::get_tournament_norms_summary,
            command::norm_calculation::get_prize_distribution_templates,
            command::norm_calculation::validate_prize_distribution,
            command::norm_calculation::export_norms_report,
            // Team Management Commands
            command::team::create_team,
            command::team::get_team_by_id,
            command::team::get_teams_by_tournament,
            command::team::update_team,
            command::team::delete_team,
            command::team::search_teams,
            command::team::add_player_to_team,
            command::team::remove_player_from_team,
            command::team::get_team_memberships,
            command::team::get_all_team_memberships,
            command::team::create_team_match,
            command::team::update_team_match,
            command::team::get_team_match_by_id,
            command::team::get_team_matches,
            command::team::create_team_lineup,
            command::team::get_team_lineups,
            command::team::create_team_tournament_settings,
            command::team::update_team_tournament_settings,
            command::team::get_team_tournament_settings,
            command::team::get_team_statistics,
            command::team::get_team_standings,
            command::team::validate_team_lineup,
            command::team::validate_team_board_order,
            // Enhanced Team Pairing Commands
            command::team::generate_team_pairings,
            command::team::get_team_pairing_config_default,
            command::team::validate_team_pairing_config,
            // Team Scoring Commands
            command::team::calculate_team_standings,
            command::team::get_team_scoring_config_default,
            command::team::validate_team_scoring_config,
            // Application Settings Commands
            command::settings::get_application_settings,
            command::settings::get_application_setting,
            command::settings::get_effective_settings,
            command::settings::get_effective_setting,
            command::settings::create_user_preference,
            command::settings::get_language_setting,
            command::settings::set_language_setting,
            command::settings::get_theme_setting,
            command::settings::set_theme_setting,
            command::settings::get_settings_overview,
            command::settings::get_settings_templates,
            command::settings::create_settings_backup,
            command::settings::restore_settings_backup,
            command::settings::get_settings_backups,
            command::settings::reset_settings,
            command::settings::validate_setting,
            command::settings::export_settings,
            command::settings::import_settings,
            command::settings::apply_settings_template,
            command::settings::get_settings_requiring_restart,
            command::settings::get_settings_backup_history,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    // Note: TypeScript bindings are now generated using the separate
    // generate_bindings binary instead of during plugin initialization
    // This ensures bindings are available before frontend compilation

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
