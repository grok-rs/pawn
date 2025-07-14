use crate::pawn::domain::model::{Player, RatingHistory, PlayerCategory, PlayerCategoryAssignment};
use crate::pawn::domain::dto::{
    CreatePlayer, UpdatePlayer, CreateRatingHistory, CreatePlayerCategory,
    BulkImportRequest, BulkImportResult, PlayerSearchFilters,
    AssignPlayerToCategory
};
use crate::pawn::common::error::PawnError;
type TxError = PawnError;
use crate::pawn::state::PawnState;
use tauri::State;

// Enhanced Player CRUD Operations

#[tauri::command]
#[specta::specta]
pub async fn create_player_enhanced(
    data: CreatePlayer,
    state: State<'_, PawnState>,
) -> Result<Player, TxError> {
    Ok(state.player_service.create_player(data).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn update_player(
    data: UpdatePlayer,
    state: State<'_, PawnState>,
) -> Result<Player, TxError> {
    Ok(state.player_service.update_player(data).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_player(
    player_id: i32,
    state: State<'_, PawnState>,
) -> Result<(), TxError> {
    Ok(state.player_service.delete_player(player_id).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn get_player_by_id(
    player_id: i32,
    state: State<'_, PawnState>,
) -> Result<Player, TxError> {
    Ok(state.player_service.get_player_by_id(player_id).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn get_players_by_tournament_enhanced(
    tournament_id: i32,
    state: State<'_, PawnState>,
) -> Result<Vec<Player>, TxError> {
    Ok(state.player_service.get_players_by_tournament(tournament_id).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn search_players(
    filters: PlayerSearchFilters,
    state: State<'_, PawnState>,
) -> Result<Vec<Player>, TxError> {
    Ok(state.player_service.search_players(filters).await?)
}

// Bulk Import Operations

#[tauri::command]
#[specta::specta]
pub async fn bulk_import_players(
    request: BulkImportRequest,
    state: State<'_, PawnState>,
) -> Result<BulkImportResult, TxError> {
    Ok(state.player_service.bulk_import_players(request).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn validate_bulk_import(
    request: BulkImportRequest,
    state: State<'_, PawnState>,
) -> Result<BulkImportResult, TxError> {
    let mut validation_request = request;
    validation_request.validate_only = true;
    Ok(state.player_service.bulk_import_players(validation_request).await?)
}

// Rating History Management

#[tauri::command]
#[specta::specta]
pub async fn add_player_rating_history(
    data: CreateRatingHistory,
    state: State<'_, PawnState>,
) -> Result<RatingHistory, TxError> {
    Ok(state.player_service.add_rating_history(data).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn get_player_rating_history(
    player_id: i32,
    state: State<'_, PawnState>,
) -> Result<Vec<RatingHistory>, TxError> {
    Ok(state.player_service.get_player_rating_history(player_id).await?)
}

// Player Category Management

#[tauri::command]
#[specta::specta]
pub async fn create_player_category(
    data: CreatePlayerCategory,
    state: State<'_, PawnState>,
) -> Result<PlayerCategory, TxError> {
    Ok(state.player_service.create_player_category(data).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn get_tournament_categories(
    tournament_id: i32,
    state: State<'_, PawnState>,
) -> Result<Vec<PlayerCategory>, TxError> {
    Ok(state.player_service.get_tournament_categories(tournament_id).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_player_category(
    category_id: i32,
    state: State<'_, PawnState>,
) -> Result<(), TxError> {
    Ok(state.player_service.delete_player_category(category_id).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn assign_player_to_category(
    data: AssignPlayerToCategory,
    state: State<'_, PawnState>,
) -> Result<PlayerCategoryAssignment, TxError> {
    Ok(state.player_service.assign_player_to_category(data).await?)
}

// Player Status Management

#[tauri::command]
#[specta::specta]
pub async fn update_player_status(
    player_id: i32,
    status: String,
    state: State<'_, PawnState>,
) -> Result<Player, TxError> {
    Ok(state.player_service.update_player_status(player_id, status).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn withdraw_player(
    player_id: i32,
    state: State<'_, PawnState>,
) -> Result<Player, TxError> {
    Ok(state.player_service.withdraw_player(player_id).await?)
}

#[tauri::command]
#[specta::specta]
pub async fn request_player_bye(
    player_id: i32,
    state: State<'_, PawnState>,
) -> Result<Player, TxError> {
    Ok(state.player_service.request_player_bye(player_id).await?)
}

// Utility Commands

#[tauri::command]
#[specta::specta]
pub async fn get_player_statistics(
    tournament_id: i32,
    state: State<'_, PawnState>,
) -> Result<PlayerStatistics, TxError> {
    let players = state.player_service.get_players_by_tournament(tournament_id).await?;
    
    let total_players = players.len() as i32;
    let active_players = players.iter().filter(|p| p.status == "active").count() as i32;
    let withdrawn_players = players.iter().filter(|p| p.status == "withdrawn").count() as i32;
    let late_entries = players.iter().filter(|p| p.status == "late_entry").count() as i32;
    let bye_requests = players.iter().filter(|p| p.status == "bye_requested").count() as i32;

    let avg_rating = if total_players > 0 {
        players.iter()
            .filter_map(|p| p.rating)
            .sum::<i32>() as f32 / players.iter().filter(|p| p.rating.is_some()).count() as f32
    } else {
        0.0
    };

    let titled_players = players.iter()
        .filter(|p| p.title.is_some() && !p.title.as_ref().unwrap().is_empty())
        .count() as i32;

    Ok(PlayerStatistics {
        total_players,
        active_players,
        withdrawn_players,
        late_entries,
        bye_requests,
        average_rating: avg_rating,
        titled_players,
    })
}

// Supporting types for statistics
#[derive(serde::Serialize, specta::Type)]
pub struct PlayerStatistics {
    pub total_players: i32,
    pub active_players: i32,
    pub withdrawn_players: i32,
    pub late_entries: i32,
    pub bye_requests: i32,
    pub average_rating: f32,
    pub titled_players: i32,
}