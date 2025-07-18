use crate::pawn::{
    common::error::PawnError,
    domain::{
        dto::{
            BatchUpdatePlayerSeeding, CreateTournamentSeedingSettings, GeneratePairingNumbersRequest,
            GenerateSeedingRequest, SeedingAnalysis, SeedingPreview, UpdateTournamentSeedingSettings,
        },
        model::{Player, TournamentSeedingSettings},
    },
    service::seeding::SeedingService,
};
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn create_tournament_seeding_settings(
    settings: CreateTournamentSeedingSettings,
    pool: State<'_, SqlitePool>,
) -> Result<TournamentSeedingSettings, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.create_seeding_settings(settings).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_tournament_seeding_settings(
    tournament_id: i32,
    pool: State<'_, SqlitePool>,
) -> Result<Option<TournamentSeedingSettings>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.get_seeding_settings(tournament_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn update_tournament_seeding_settings(
    settings: UpdateTournamentSeedingSettings,
    pool: State<'_, SqlitePool>,
) -> Result<TournamentSeedingSettings, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.update_seeding_settings(settings).await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_tournament_seeding(
    request: GenerateSeedingRequest,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<SeedingPreview>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.generate_seeding(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn apply_tournament_seeding(
    batch_update: BatchUpdatePlayerSeeding,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Player>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.apply_seeding(batch_update).await
}

#[tauri::command]
#[specta::specta]
pub async fn generate_pairing_numbers(
    request: GeneratePairingNumbersRequest,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<Player>, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.generate_pairing_numbers(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn analyze_tournament_seeding(
    tournament_id: i32,
    pool: State<'_, SqlitePool>,
) -> Result<SeedingAnalysis, PawnError> {
    let service = SeedingService::new(pool.inner().clone());
    service.analyze_seeding(tournament_id).await
}