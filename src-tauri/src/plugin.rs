use std::fs;

use crate::common::constants::APP_PLUGIN_NAME;
use crate::state::PawnState;
use tauri::{Runtime, plugin::TauriPlugin};

use tauri::{Manager, async_runtime::block_on, plugin::Builder};
use tauri_specta::collect_commands;
use tracing::{debug, error, info};

pub fn init_plugin<R: Runtime>() -> TauriPlugin<R> {
    debug!("init_plugin");

    let builder = tauri_specta::Builder::new()
        .plugin_name(APP_PLUGIN_NAME)
        .commands(collect_commands![
            // Tournament
            crate::tournament::command::get_tournaments,
            crate::tournament::command::get_tournament,
            crate::tournament::command::create_tournament,
            crate::tournament::command::get_tournament_details,
            crate::tournament::command::delete_tournament,
            crate::tournament::command::get_players_by_tournament,
            crate::tournament::command::create_player,
            crate::tournament::command::get_games_by_tournament,
            crate::tournament::command::create_game,
            crate::tournament::command::get_player_results,
            crate::tournament::command::get_game_results,
            crate::tournament::command::populate_mock_data,
            crate::tournament::command::populate_mock_tournaments,
            crate::tournament::command::get_tournament_standings,
            crate::tournament::command::get_tiebreak_breakdown,
            crate::tournament::command::get_realtime_standings,
            crate::tournament::command::force_recalculate_standings,
            crate::tournament::command::clear_standings_cache,
            crate::tournament::command::get_tournament_settings,
            crate::tournament::command::update_tournament_settings,
            crate::tournament::command::update_tournament,
            crate::tournament::command::update_tournament_status,
            crate::tournament::command::create_time_control,
            crate::tournament::command::get_time_control,
            crate::tournament::command::get_time_controls,
            crate::tournament::command::get_default_time_controls,
            crate::tournament::command::update_time_control,
            crate::tournament::command::delete_time_control,
            crate::tournament::command::get_time_control_templates,
            crate::tournament::command::validate_time_control_data,
            crate::tournament::command::create_tournament_seeding_settings,
            crate::tournament::command::get_tournament_seeding_settings,
            crate::tournament::command::update_tournament_seeding_settings,
            crate::tournament::command::generate_tournament_seeding,
            crate::tournament::command::apply_tournament_seeding,
            crate::tournament::command::generate_pairing_numbers,
            crate::tournament::command::analyze_tournament_seeding,
            // Participant
            crate::participant::command::create_player_enhanced,
            crate::participant::command::update_player,
            crate::participant::command::delete_player,
            crate::participant::command::get_player_by_id,
            crate::participant::command::get_players_by_tournament_enhanced,
            crate::participant::command::search_players,
            crate::participant::command::bulk_import_players,
            crate::participant::command::validate_bulk_import,
            crate::participant::command::add_player_rating_history,
            crate::participant::command::get_player_rating_history,
            crate::participant::command::create_player_category,
            crate::participant::command::get_tournament_categories,
            crate::participant::command::delete_player_category,
            crate::participant::command::assign_player_to_category,
            crate::participant::command::get_player_category_assignments,
            crate::participant::command::update_player_status,
            crate::participant::command::withdraw_player,
            crate::participant::command::request_player_bye,
            crate::participant::command::get_player_statistics,
            // Competition
            crate::competition::command::get_rounds_by_tournament,
            crate::competition::command::get_current_round,
            crate::competition::command::create_round,
            crate::competition::command::update_round_status,
            crate::competition::command::get_round_details,
            crate::competition::command::generate_pairings,
            crate::competition::command::create_pairings_as_games,
            crate::competition::command::complete_round,
            crate::competition::command::create_next_round,
            crate::competition::command::delete_round,
            crate::competition::command::swap_game_colors,
            crate::competition::command::replace_player_in_game,
            crate::competition::command::delete_game_from_round,
            crate::competition::command::add_manual_pairing,
            crate::competition::command::update_tournament_pairing_method,
            crate::competition::command::generate_enhanced_pairings,
            crate::competition::command::analyze_swiss_pairings,
            crate::competition::command::analyze_round_robin_pairings,
            crate::competition::command::validate_pairing_configuration,
            crate::competition::command::benchmark_pairing_performance,
            crate::competition::command::update_game_result,
            crate::competition::command::validate_game_result,
            crate::competition::command::batch_update_results,
            crate::competition::command::get_enhanced_game_result,
            crate::competition::command::get_game_audit_trail,
            crate::competition::command::approve_game_result,
            crate::competition::command::get_pending_approvals,
            crate::competition::command::get_game_result_types,
            crate::competition::command::import_results_csv,
            crate::competition::command::create_knockout_bracket,
            crate::competition::command::get_knockout_bracket,
            crate::competition::command::initialize_knockout_tournament,
            crate::competition::command::get_bracket_positions,
            crate::competition::command::get_bracket_positions_by_round,
            crate::competition::command::generate_knockout_pairings,
            crate::competition::command::advance_knockout_winners,
            crate::competition::command::get_knockout_tournament_winner,
            crate::competition::command::is_knockout_tournament_complete,
            crate::competition::command::validate_knockout_bracket,
            // Team
            crate::team::command::create_team,
            crate::team::command::get_team_by_id,
            crate::team::command::get_teams_by_tournament,
            crate::team::command::update_team,
            crate::team::command::delete_team,
            crate::team::command::search_teams,
            crate::team::command::add_player_to_team,
            crate::team::command::remove_player_from_team,
            crate::team::command::get_team_memberships,
            crate::team::command::get_all_team_memberships,
            crate::team::command::create_team_match,
            crate::team::command::update_team_match,
            crate::team::command::get_team_match_by_id,
            crate::team::command::get_team_matches,
            crate::team::command::create_team_lineup,
            crate::team::command::get_team_lineups,
            crate::team::command::create_team_tournament_settings,
            crate::team::command::update_team_tournament_settings,
            crate::team::command::get_team_tournament_settings,
            crate::team::command::get_team_statistics,
            crate::team::command::get_team_standings,
            crate::team::command::validate_team_lineup,
            crate::team::command::validate_team_board_order,
            crate::team::command::generate_team_pairings,
            crate::team::command::get_team_pairing_config_default,
            crate::team::command::validate_team_pairing_config,
            crate::team::command::calculate_team_standings,
            crate::team::command::get_team_scoring_config_default,
            crate::team::command::validate_team_scoring_config,
            // Standings
            crate::standings::command::calculate_norm,
            crate::standings::command::calculate_available_norms,
            crate::standings::command::get_norm_types,
            crate::standings::command::get_norm_requirements,
            crate::standings::command::calculate_prize_distribution,
            crate::standings::command::get_tournament_norms_summary,
            crate::standings::command::get_prize_distribution_templates,
            crate::standings::command::validate_prize_distribution,
            crate::standings::command::export_norms_report,
            // Export
            crate::export::command::export_tournament_data,
            crate::export::command::get_export_directory,
            crate::export::command::get_available_export_formats,
            crate::export::command::get_export_templates,
            crate::export::command::validate_export_request,
            crate::export::command::get_export_preview,
            // Settings
            crate::settings::command::get_application_settings,
            crate::settings::command::get_application_setting,
            crate::settings::command::get_effective_settings,
            crate::settings::command::get_effective_setting,
            crate::settings::command::create_user_preference,
            crate::settings::command::get_language_setting,
            crate::settings::command::set_language_setting,
            crate::settings::command::get_theme_setting,
            crate::settings::command::set_theme_setting,
            crate::settings::command::get_settings_overview,
            crate::settings::command::get_settings_templates,
            crate::settings::command::create_settings_backup,
            crate::settings::command::restore_settings_backup,
            crate::settings::command::get_settings_backups,
            crate::settings::command::reset_settings,
            crate::settings::command::validate_setting,
            crate::settings::command::export_settings,
            crate::settings::command::import_settings,
            crate::settings::command::apply_settings_template,
            crate::settings::command::get_settings_requiring_restart,
            crate::settings::command::get_settings_backup_history,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

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
