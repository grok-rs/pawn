use specta_typescript::{BigIntExportBehavior, Typescript};
use specta_typescript::formatter::prettier;
use tauri_specta::collect_commands;
use std::path::Path;
use std::fs;

// Import the pawn module from the main crate
use pawn::pawn::command::{
    tournament, round, game_result, player, knockout, time_control, 
    seeding, export, norm_calculation, team, settings
};

fn main() {
    println!("Generating TypeScript bindings...");

    // Create the same builder as in the main plugin with plugin name
    let builder: tauri_specta::Builder<tauri::Wry> = tauri_specta::Builder::new()
        .plugin_name("pawn")
        .commands(collect_commands![
            // Tournament operations
            tournament::get_tournaments,
            tournament::get_tournament,
            tournament::create_tournament,
            tournament::get_tournament_details,
            tournament::delete_tournament,
            tournament::get_players_by_tournament,
            tournament::create_player,
            tournament::get_games_by_tournament,
            tournament::create_game,
            tournament::get_player_results,
            tournament::get_game_results,
            tournament::populate_mock_data,
            tournament::populate_mock_tournaments,
            tournament::get_tournament_standings,
            tournament::get_tiebreak_breakdown,
            tournament::get_realtime_standings,
            tournament::force_recalculate_standings,
            tournament::clear_standings_cache,
            tournament::get_tournament_settings,
            tournament::update_tournament_settings,
            tournament::update_tournament_status,
            // Round operations
            round::get_rounds_by_tournament,
            round::get_current_round,
            round::create_round,
            round::update_round_status,
            round::get_round_details,
            round::generate_pairings,
            round::create_pairings_as_games,
            round::complete_round,
            round::create_next_round,
            round::update_tournament_pairing_method,
            // Enhanced Pairing System Commands
            round::generate_enhanced_pairings,
            round::analyze_swiss_pairings,
            round::analyze_round_robin_pairings,
            round::validate_pairing_configuration,
            round::benchmark_pairing_performance,
            // Game result operations
            game_result::update_game_result,
            game_result::validate_game_result,
            game_result::batch_update_results,
            game_result::get_enhanced_game_result,
            game_result::get_game_audit_trail,
            game_result::approve_game_result,
            game_result::get_pending_approvals,
            game_result::get_game_result_types,
            game_result::import_results_csv,
            // Enhanced Player Management Commands
            player::create_player_enhanced,
            player::update_player,
            player::delete_player,
            player::get_player_by_id,
            player::get_players_by_tournament_enhanced,
            player::search_players,
            player::bulk_import_players,
            player::validate_bulk_import,
            player::add_player_rating_history,
            player::get_player_rating_history,
            player::create_player_category,
            player::get_tournament_categories,
            player::delete_player_category,
            player::assign_player_to_category,
            player::update_player_status,
            player::withdraw_player,
            player::request_player_bye,
            player::get_player_statistics,
            // Knockout Tournament Commands
            knockout::create_knockout_bracket,
            knockout::get_knockout_bracket,
            knockout::initialize_knockout_tournament,
            knockout::get_bracket_positions,
            knockout::get_bracket_positions_by_round,
            knockout::generate_knockout_pairings,
            knockout::advance_knockout_winners,
            knockout::get_knockout_tournament_winner,
            knockout::is_knockout_tournament_complete,
            knockout::validate_knockout_bracket,
            // Time Control Commands
            time_control::create_time_control,
            time_control::get_time_control,
            time_control::get_time_controls,
            time_control::get_default_time_controls,
            time_control::update_time_control,
            time_control::delete_time_control,
            time_control::get_time_control_templates,
            time_control::validate_time_control_data,
            // Seeding and Ranking Commands
            seeding::create_tournament_seeding_settings,
            seeding::get_tournament_seeding_settings,
            seeding::update_tournament_seeding_settings,
            seeding::generate_tournament_seeding,
            seeding::apply_tournament_seeding,
            seeding::generate_pairing_numbers,
            seeding::analyze_tournament_seeding,
            // Export Commands
            export::export_tournament_data,
            export::get_export_directory,
            export::get_available_export_formats,
            export::get_export_templates,
            export::validate_export_request,
            export::get_export_preview,
            // Norm Calculation Commands
            norm_calculation::calculate_norm,
            norm_calculation::calculate_available_norms,
            norm_calculation::get_norm_types,
            norm_calculation::get_norm_requirements,
            norm_calculation::calculate_prize_distribution,
            norm_calculation::get_tournament_norms_summary,
            norm_calculation::get_prize_distribution_templates,
            norm_calculation::validate_prize_distribution,
            norm_calculation::export_norms_report,
            // Team Management Commands
            team::create_team,
            team::get_team_by_id,
            team::get_teams_by_tournament,
            team::update_team,
            team::delete_team,
            team::search_teams,
            team::add_player_to_team,
            team::remove_player_from_team,
            team::get_team_memberships,
            team::get_all_team_memberships,
            team::create_team_match,
            team::update_team_match,
            team::get_team_match_by_id,
            team::get_team_matches,
            team::create_team_lineup,
            team::get_team_lineups,
            team::create_team_tournament_settings,
            team::update_team_tournament_settings,
            team::get_team_tournament_settings,
            team::get_team_statistics,
            team::get_team_standings,
            team::validate_team_lineup,
            team::validate_team_board_order,
            // Enhanced Team Pairing Commands
            team::generate_team_pairings,
            team::get_team_pairing_config_default,
            team::validate_team_pairing_config,
            // Team Scoring Commands
            team::calculate_team_standings,
            team::get_team_scoring_config_default,
            team::validate_team_scoring_config,
            // Application Settings Commands
            settings::get_application_settings,
            settings::get_application_setting,
            settings::get_effective_settings,
            settings::get_effective_setting,
            settings::create_user_preference,
            settings::get_language_setting,
            settings::set_language_setting,
            settings::get_theme_setting,
            settings::set_theme_setting,
            settings::get_settings_overview,
            settings::get_settings_templates,
            settings::create_settings_backup,
            settings::restore_settings_backup,
            settings::get_settings_backups,
            settings::reset_settings,
            settings::validate_setting,
            settings::export_settings,
            settings::import_settings,
            settings::apply_settings_template,
            settings::get_settings_requiring_restart,
            settings::get_settings_backup_history,
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

    println!("✅ TypeScript bindings generated successfully at: {}", output_path.display());
}

fn restructure_bindings_file(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    
    // Find the commands section
    let commands_start = content.find("export const commands = {")
        .ok_or("Could not find commands export")?;
    
    // Find where types start (look for first "export type")
    let types_start = content.find("export type ")
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
        "{}{}{}",
        header.trim_end(),
        format!("\n\n{}", types_section.trim()),
        format!("\n\n{}", commands_section.trim())
    );
    
    fs::write(path, restructured)?;
    println!("✅ Successfully restructured bindings file - types now come before commands");
    
    Ok(())
}