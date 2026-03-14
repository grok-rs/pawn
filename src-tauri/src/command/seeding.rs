use crate::{
    common::types::CommandResult,
    domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings,
            GeneratePairingNumbersRequest, GenerateSeedingRequest, SeedingAnalysis, SeedingPreview,
            UpdateTournamentSeedingSettings,
        },
        model::{Player, TournamentSeedingSettings},
    },
    state::PawnState,
};
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn create_tournament_seeding_settings(
    state: State<'_, PawnState>,
    settings: CreateTournamentSeedingSettings,
) -> CommandResult<TournamentSeedingSettings> {
    state
        .seeding_service
        .create_seeding_settings(settings)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_tournament_seeding_settings(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<Option<TournamentSeedingSettings>> {
    state
        .seeding_service
        .get_seeding_settings(tournament_id)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn update_tournament_seeding_settings(
    state: State<'_, PawnState>,
    settings: UpdateTournamentSeedingSettings,
) -> CommandResult<TournamentSeedingSettings> {
    state
        .seeding_service
        .update_seeding_settings(settings)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_tournament_seeding(
    state: State<'_, PawnState>,
    request: GenerateSeedingRequest,
) -> CommandResult<Vec<SeedingPreview>> {
    state.seeding_service.generate_seeding(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn apply_tournament_seeding(
    state: State<'_, PawnState>,
    batch_update: BatchUpdatePlayerSeeding,
) -> CommandResult<Vec<Player>> {
    state.seeding_service.apply_seeding(batch_update).await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_pairing_numbers(
    state: State<'_, PawnState>,
    request: GeneratePairingNumbersRequest,
) -> CommandResult<Vec<Player>> {
    state
        .seeding_service
        .generate_pairing_numbers(request)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn analyze_tournament_seeding(
    state: State<'_, PawnState>,
    tournament_id: i32,
) -> CommandResult<SeedingAnalysis> {
    state.seeding_service.analyze_seeding(tournament_id).await
}

