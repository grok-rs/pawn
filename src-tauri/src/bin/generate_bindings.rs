use specta_typescript::formatter::prettier;
use specta_typescript::{BigIntExportBehavior, Typescript};
use std::fs;
use std::path::Path;
use tauri_specta::collect_commands;

// Import command modules from bounded contexts
use pawn::competition::command as competition_cmd;
use pawn::export::command as export_cmd;
use pawn::participant::command as participant_cmd;
use pawn::settings::command as settings_cmd;
use pawn::standings::command as standings_cmd;
use pawn::team::command as team_cmd;
use pawn::tournament::command as tournament_cmd;

fn main() {
    println!("Generating TypeScript bindings...");

    // Create the same builder as in the main plugin with plugin name
    let builder: tauri_specta::Builder<tauri::Wry> = tauri_specta::Builder::new()
        .plugin_name("pawn")
        .commands(collect_commands![
            // Tournament operations
            tournament_cmd::get_tournaments,
            tournament_cmd::get_tournament,
            tournament_cmd::create_tournament,
            tournament_cmd::get_tournament_details,
            tournament_cmd::delete_tournament,
            tournament_cmd::get_players_by_tournament,
            tournament_cmd::create_player,
            tournament_cmd::get_games_by_tournament,
            tournament_cmd::create_game,
            tournament_cmd::get_player_results,
            tournament_cmd::get_game_results,
            tournament_cmd::populate_mock_data,
            tournament_cmd::populate_mock_tournaments,
            tournament_cmd::get_tournament_standings,
            tournament_cmd::get_tiebreak_breakdown,
            tournament_cmd::get_realtime_standings,
            tournament_cmd::force_recalculate_standings,
            tournament_cmd::clear_standings_cache,
            tournament_cmd::get_tournament_settings,
            tournament_cmd::update_tournament_settings,
            tournament_cmd::update_tournament,
            tournament_cmd::update_tournament_status,
            // Round operations
            competition_cmd::get_rounds_by_tournament,
            competition_cmd::get_current_round,
            competition_cmd::create_round,
            competition_cmd::update_round_status,
            competition_cmd::get_round_details,
            competition_cmd::generate_pairings,
            competition_cmd::create_pairings_as_games,
            competition_cmd::complete_round,
            competition_cmd::create_next_round,
            competition_cmd::delete_round,
            competition_cmd::swap_game_colors,
            competition_cmd::replace_player_in_game,
            competition_cmd::delete_game_from_round,
            competition_cmd::add_manual_pairing,
            competition_cmd::update_tournament_pairing_method,
            // Enhanced Pairing System Commands
            competition_cmd::generate_enhanced_pairings,
            competition_cmd::analyze_swiss_pairings,
            competition_cmd::analyze_round_robin_pairings,
            competition_cmd::validate_pairing_configuration,
            competition_cmd::benchmark_pairing_performance,
            // Game result operations
            competition_cmd::update_game_result,
            competition_cmd::validate_game_result,
            competition_cmd::batch_update_results,
            competition_cmd::get_enhanced_game_result,
            competition_cmd::get_game_audit_trail,
            competition_cmd::approve_game_result,
            competition_cmd::get_pending_approvals,
            competition_cmd::get_game_result_types,
            competition_cmd::import_results_csv,
            // Enhanced Player Management Commands
            participant_cmd::create_player_enhanced,
            participant_cmd::update_player,
            participant_cmd::delete_player,
            participant_cmd::get_player_by_id,
            participant_cmd::get_players_by_tournament_enhanced,
            participant_cmd::search_players,
            participant_cmd::bulk_import_players,
            participant_cmd::validate_bulk_import,
            participant_cmd::add_player_rating_history,
            participant_cmd::get_player_rating_history,
            participant_cmd::create_player_category,
            participant_cmd::get_tournament_categories,
            participant_cmd::delete_player_category,
            participant_cmd::assign_player_to_category,
            participant_cmd::get_player_category_assignments,
            participant_cmd::update_player_status,
            participant_cmd::withdraw_player,
            participant_cmd::request_player_bye,
            participant_cmd::get_player_statistics,
            // Knockout Tournament Commands
            competition_cmd::create_knockout_bracket,
            competition_cmd::get_knockout_bracket,
            competition_cmd::initialize_knockout_tournament,
            competition_cmd::get_bracket_positions,
            competition_cmd::get_bracket_positions_by_round,
            competition_cmd::generate_knockout_pairings,
            competition_cmd::advance_knockout_winners,
            competition_cmd::get_knockout_tournament_winner,
            competition_cmd::is_knockout_tournament_complete,
            competition_cmd::validate_knockout_bracket,
            // Time Control Commands
            tournament_cmd::create_time_control,
            tournament_cmd::get_time_control,
            tournament_cmd::get_time_controls,
            tournament_cmd::get_default_time_controls,
            tournament_cmd::update_time_control,
            tournament_cmd::delete_time_control,
            tournament_cmd::get_time_control_templates,
            tournament_cmd::validate_time_control_data,
            // Seeding and Ranking Commands
            tournament_cmd::create_tournament_seeding_settings,
            tournament_cmd::get_tournament_seeding_settings,
            tournament_cmd::update_tournament_seeding_settings,
            tournament_cmd::generate_tournament_seeding,
            tournament_cmd::apply_tournament_seeding,
            tournament_cmd::generate_pairing_numbers,
            tournament_cmd::analyze_tournament_seeding,
            // Export Commands
            export_cmd::export_tournament_data,
            export_cmd::get_export_directory,
            export_cmd::get_available_export_formats,
            export_cmd::get_export_templates,
            export_cmd::validate_export_request,
            export_cmd::get_export_preview,
            // Norm Calculation Commands
            standings_cmd::calculate_norm,
            standings_cmd::calculate_available_norms,
            standings_cmd::get_norm_types,
            standings_cmd::get_norm_requirements,
            standings_cmd::calculate_prize_distribution,
            standings_cmd::get_tournament_norms_summary,
            standings_cmd::get_prize_distribution_templates,
            standings_cmd::validate_prize_distribution,
            standings_cmd::export_norms_report,
            // Team Management Commands
            team_cmd::create_team,
            team_cmd::get_team_by_id,
            team_cmd::get_teams_by_tournament,
            team_cmd::update_team,
            team_cmd::delete_team,
            team_cmd::search_teams,
            team_cmd::add_player_to_team,
            team_cmd::remove_player_from_team,
            team_cmd::get_team_memberships,
            team_cmd::get_all_team_memberships,
            team_cmd::create_team_match,
            team_cmd::update_team_match,
            team_cmd::get_team_match_by_id,
            team_cmd::get_team_matches,
            team_cmd::create_team_lineup,
            team_cmd::get_team_lineups,
            team_cmd::create_team_tournament_settings,
            team_cmd::update_team_tournament_settings,
            team_cmd::get_team_tournament_settings,
            team_cmd::get_team_statistics,
            team_cmd::get_team_standings,
            team_cmd::validate_team_lineup,
            team_cmd::validate_team_board_order,
            // Enhanced Team Pairing Commands
            team_cmd::generate_team_pairings,
            team_cmd::get_team_pairing_config_default,
            team_cmd::validate_team_pairing_config,
            // Team Scoring Commands
            team_cmd::calculate_team_standings,
            team_cmd::get_team_scoring_config_default,
            team_cmd::validate_team_scoring_config,
            // Application Settings Commands
            settings_cmd::get_application_settings,
            settings_cmd::get_application_setting,
            settings_cmd::get_effective_settings,
            settings_cmd::get_effective_setting,
            settings_cmd::create_user_preference,
            settings_cmd::get_language_setting,
            settings_cmd::set_language_setting,
            settings_cmd::get_theme_setting,
            settings_cmd::set_theme_setting,
            settings_cmd::get_settings_overview,
            settings_cmd::get_settings_templates,
            settings_cmd::create_settings_backup,
            settings_cmd::restore_settings_backup,
            settings_cmd::get_settings_backups,
            settings_cmd::reset_settings,
            settings_cmd::validate_setting,
            settings_cmd::export_settings,
            settings_cmd::import_settings,
            settings_cmd::apply_settings_template,
            settings_cmd::get_settings_requiring_restart,
            settings_cmd::get_settings_backup_history,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw);

    // Generate TypeScript bindings
    let output_path = Path::new("../src/dto/bindings.ts");

    builder
        .export(
            Typescript::new()
                .header("// @ts-nocheck")
                .bigint(BigIntExportBehavior::Number)
                .formatter(prettier),
            output_path,
        )
        .expect("Failed to export TypeScript bindings");

    // Enable restructuring to fix type ordering
    restructure_bindings_file(output_path).expect("Failed to restructure bindings file");

    println!(
        "✅ TypeScript bindings generated successfully at: {}",
        output_path.display()
    );
}

fn restructure_bindings_file(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;

    // Find the commands section
    let commands_start = content
        .find("export const commands = {")
        .ok_or("Could not find commands export")?;

    // Find where types start (look for first "export type")
    let types_start = content
        .find("export type ")
        .ok_or("Could not find types section")?;

    if types_start < commands_start {
        println!("Types are already properly ordered before commands");
        return Ok(());
    }

    // Extract sections:
    // 1. Header (everything before commands)
    let header = &content[..commands_start];

    // 2. Commands section (from commands start to where types begin)
    let commands_section = &content[commands_start..types_start];

    // 3. Types section (from first export type to end of file)
    let types_section = &content[types_start..];

    // Reconstruct with types first, then commands
    let restructured = format!(
        "{}\n\n{}\n\n{}",
        header.trim_end(),
        types_section.trim(),
        commands_section.trim()
    );

    fs::write(path, restructured)?;
    println!("✅ Successfully restructured bindings file - types now come before commands");

    Ok(())
}
