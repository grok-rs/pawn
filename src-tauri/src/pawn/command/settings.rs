use crate::pawn::domain::dto::*;
use crate::pawn::domain::model::*;
use crate::pawn::service::settings::SettingsService;
use crate::pawn::common::error::PawnError;
use crate::pawn::common::types::CommandResult;
use sqlx::SqlitePool;
use tauri::State;
use std::collections::HashMap;

#[tauri::command]
#[specta::specta]
pub async fn get_application_settings(
    pool: State<'_, SqlitePool>,
    filter: Option<SettingsFilter>,
) -> CommandResult<Vec<ApplicationSetting>> {
    let service = SettingsService::new(pool.inner().clone());
    service.get_application_settings(filter).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_application_setting(
    pool: State<'_, SqlitePool>,
    category: String,
    setting_key: String,
) -> CommandResult<Option<ApplicationSetting>> {
    let service = SettingsService::new(pool.inner().clone());
    service.get_application_setting(&category, &setting_key).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_effective_settings(
    pool: State<'_, SqlitePool>,
    user_id: String,
    category: Option<String>,
) -> CommandResult<HashMap<String, String>> {
    let service = SettingsService::new(pool.inner().clone());
    service.get_effective_settings(&user_id, category.as_deref()).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_effective_setting(
    pool: State<'_, SqlitePool>,
    user_id: String,
    category: String,
    setting_key: String,
) -> CommandResult<Option<String>> {
    let service = SettingsService::new(pool.inner().clone());
    service.get_effective_setting(&user_id, &category, &setting_key).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_user_preference(
    pool: State<'_, SqlitePool>,
    data: CreateUserPreference,
) -> CommandResult<UserPreference> {
    let service = SettingsService::new(pool.inner().clone());
    service.create_user_preference(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_language_setting(
    pool: State<'_, SqlitePool>,
    user_id: String,
) -> CommandResult<String> {
    let service = SettingsService::new(pool.inner().clone());
    let language = service.get_effective_setting(&user_id, "general", "language").await?
        .unwrap_or_else(|| "\"en\"".to_string());
    
    // Remove quotes if present
    let language = language.trim_matches('"');
    Ok(language.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_language_setting(
    pool: State<'_, SqlitePool>,
    user_id: String,
    language: String,
) -> CommandResult<()> {
    let service = SettingsService::new(pool.inner().clone());
    let preference_data = CreateUserPreference {
        user_id: Some(user_id),
        category: "general".to_string(),
        setting_key: "language".to_string(),
        setting_value: Some(format!("\"{}\"", language)),
    };
    
    service.create_user_preference(preference_data).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_theme_setting(
    pool: State<'_, SqlitePool>,
    user_id: String,
) -> CommandResult<String> {
    let service = SettingsService::new(pool.inner().clone());
    let theme = service.get_effective_setting(&user_id, "display", "theme").await?
        .unwrap_or_else(|| "\"light\"".to_string());
    
    // Remove quotes if present
    let theme = theme.trim_matches('"');
    Ok(theme.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_theme_setting(
    pool: State<'_, SqlitePool>,
    user_id: String,
    theme: String,
) -> CommandResult<()> {
    let service = SettingsService::new(pool.inner().clone());
    let preference_data = CreateUserPreference {
        user_id: Some(user_id),
        category: "display".to_string(),
        setting_key: "theme".to_string(),
        setting_value: Some(format!("\"{}\"", theme)),
    };
    
    service.create_user_preference(preference_data).await?;
    Ok(())
}