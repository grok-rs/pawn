use crate::pawn::common::error::PawnError;
use crate::pawn::domain::dto::*;
use crate::pawn::domain::model::*;
use crate::pawn::state::PawnState;
use std::collections::HashMap;
use tauri::State;

type TxError = PawnError;

#[tauri::command]
#[specta::specta]
pub async fn get_application_settings(
    filter: Option<SettingsFilter>,
    state: State<'_, PawnState>,
) -> Result<Vec<ApplicationSetting>, TxError> {
    state
        .settings_service
        .get_application_settings(filter)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_application_setting(
    category: String,
    setting_key: String,
    state: State<'_, PawnState>,
) -> Result<Option<ApplicationSetting>, TxError> {
    state
        .settings_service
        .get_application_setting(&category, &setting_key)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_effective_settings(
    user_id: String,
    category: Option<String>,
    state: State<'_, PawnState>,
) -> Result<HashMap<String, String>, TxError> {
    state
        .settings_service
        .get_effective_settings(&user_id, category.as_deref())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_effective_setting(
    user_id: String,
    category: String,
    setting_key: String,
    state: State<'_, PawnState>,
) -> Result<Option<String>, TxError> {
    state
        .settings_service
        .get_effective_setting(&user_id, &category, &setting_key)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn create_user_preference(
    data: CreateUserPreference,
    state: State<'_, PawnState>,
) -> Result<UserPreference, TxError> {
    state.settings_service.create_user_preference(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_language_setting(
    user_id: String,
    state: State<'_, PawnState>,
) -> Result<String, TxError> {
    let language = state
        .settings_service
        .get_effective_setting(&user_id, "general", "language")
        .await?
        .unwrap_or_else(|| "\"en\"".to_string());

    // Remove quotes if present
    let language = language.trim_matches('"');
    Ok(language.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_language_setting(
    user_id: String,
    language: String,
    state: State<'_, PawnState>,
) -> Result<(), TxError> {
    let preference_data = CreateUserPreference {
        user_id: Some(user_id),
        category: "general".to_string(),
        setting_key: "language".to_string(),
        setting_value: Some(format!("\"{}\"", language)),
    };

    state
        .settings_service
        .create_user_preference(preference_data)
        .await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_theme_setting(
    user_id: String,
    state: State<'_, PawnState>,
) -> Result<String, TxError> {
    let theme = state
        .settings_service
        .get_effective_setting(&user_id, "display", "theme")
        .await?
        .unwrap_or_else(|| "\"light\"".to_string());

    // Remove quotes if present
    let theme = theme.trim_matches('"');
    Ok(theme.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_theme_setting(
    user_id: String,
    theme: String,
    state: State<'_, PawnState>,
) -> Result<(), TxError> {
    let preference_data = CreateUserPreference {
        user_id: Some(user_id),
        category: "display".to_string(),
        setting_key: "theme".to_string(),
        setting_value: Some(format!("\"{}\"", theme)),
    };

    state
        .settings_service
        .create_user_preference(preference_data)
        .await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings_overview(
    user_id: String,
    state: State<'_, PawnState>,
) -> Result<SettingsOverview, TxError> {
    state.settings_service.get_settings_overview(&user_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings_templates(
    category: Option<String>,
    state: State<'_, PawnState>,
) -> Result<Vec<SettingsTemplate>, TxError> {
    state
        .settings_service
        .get_settings_templates(category.as_deref())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn create_settings_backup(
    data: CreateSettingsBackup,
    state: State<'_, PawnState>,
) -> Result<SettingsBackupHistory, TxError> {
    state.settings_service.create_settings_backup(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn restore_settings_backup(
    data: RestoreSettingsBackup,
    state: State<'_, PawnState>,
) -> Result<(), TxError> {
    state.settings_service.restore_settings_backup(data).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings_backups(
    user_id: String,
    state: State<'_, PawnState>,
) -> Result<Vec<SettingsBackupHistory>, TxError> {
    state.settings_service.get_settings_backups(&user_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn reset_settings(
    request: SettingsResetRequest,
    state: State<'_, PawnState>,
) -> Result<SettingsResetResult, TxError> {
    state.settings_service.reset_settings(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn validate_setting(
    request: SettingsValidationRequest,
    state: State<'_, PawnState>,
) -> Result<SettingsValidationResult, TxError> {
    state.settings_service.validate_setting(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn export_settings(
    request: SettingsExportRequest,
    state: State<'_, PawnState>,
) -> Result<String, TxError> {
    state.settings_service.export_settings(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn import_settings(
    request: SettingsImportRequest,
    state: State<'_, PawnState>,
) -> Result<SettingsImportResult, TxError> {
    state.settings_service.import_settings(request).await
}

#[tauri::command]
#[specta::specta]
pub async fn apply_settings_template(
    request: ApplySettingsTemplateRequest,
    state: State<'_, PawnState>,
) -> Result<SettingsTemplateResult, TxError> {
    state
        .settings_service
        .apply_settings_template(request)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings_requiring_restart(
    user_id: String,
    state: State<'_, PawnState>,
) -> Result<Vec<String>, TxError> {
    state
        .settings_service
        .get_settings_requiring_restart(&user_id)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings_backup_history(
    user_id: String,
    state: State<'_, PawnState>,
) -> Result<Vec<SettingsBackupHistory>, TxError> {
    state
        .settings_service
        .get_settings_backup_history(&user_id)
        .await
}
