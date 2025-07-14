use tauri::State;
use crate::pawn::{
    domain::{dto::*, model::*},
    state::PawnState,
    common::error::PawnError,
};

#[tauri::command]
#[specta::specta]
pub async fn create_time_control(
    state: State<'_, PawnState>,
    data: CreateTimeControl,
) -> Result<TimeControl, PawnError> {
    state.time_control_service.create_time_control(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_time_control(
    state: State<'_, PawnState>,
    id: i32,
) -> Result<TimeControl, PawnError> {
    state.time_control_service.get_time_control(id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_time_controls(
    state: State<'_, PawnState>,
    filter: Option<TimeControlFilter>,
) -> Result<Vec<TimeControl>, PawnError> {
    state.time_control_service.get_time_controls(filter).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_default_time_controls(
    state: State<'_, PawnState>,
) -> Result<Vec<TimeControl>, PawnError> {
    state.time_control_service.get_default_time_controls().await
}

#[tauri::command]
#[specta::specta]
pub async fn update_time_control(
    state: State<'_, PawnState>,
    data: UpdateTimeControl,
) -> Result<TimeControl, PawnError> {
    state.time_control_service.update_time_control(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_time_control(
    state: State<'_, PawnState>,
    id: i32,
) -> Result<(), PawnError> {
    state.time_control_service.delete_time_control(id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_time_control_templates(
    state: State<'_, PawnState>,
) -> Result<Vec<TimeControlTemplate>, PawnError> {
    state.time_control_service.get_time_control_templates().await
}

#[tauri::command]
#[specta::specta]
pub async fn validate_time_control_data(
    state: State<'_, PawnState>,
    data: CreateTimeControl,
) -> Result<TimeControlValidation, PawnError> {
    state.time_control_service.validate_time_control_data(&data)
}