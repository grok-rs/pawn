use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateUserPreference {
    pub user_id: Option<String>,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsFilter {
    pub category: Option<String>,
    pub setting_key: Option<String>,
    pub user_configurable_only: Option<bool>,
    pub user_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CreateSettingsBackup {
    pub backup_name: String,
    pub backup_type: String,
    pub user_id: Option<String>,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RestoreSettingsBackup {
    pub backup_id: i32,
    pub user_id: Option<String>,
    pub categories: Option<Vec<String>>,
    pub create_backup_before_restore: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsExportRequest {
    pub format: String,
    pub categories: Option<Vec<String>>,
    pub user_id: Option<String>,
    pub include_defaults: Option<bool>,
    pub include_system_settings: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsImportRequest {
    pub format: String,
    pub data: String,
    pub user_id: Option<String>,
    pub validate_only: Option<bool>,
    pub override_existing: Option<bool>,
    pub create_backup_before_import: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsImportResult {
    pub success: bool,
    pub imported_count: i32,
    pub skipped_count: i32,
    pub error_count: i32,
    pub warnings: Vec<String>,
    pub errors: Vec<SettingsImportError>,
    pub backup_created: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsImportError {
    pub category: String,
    pub setting_key: String,
    pub error_type: String,
    pub message: String,
    pub suggested_action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsValidationRequest {
    pub category: String,
    pub setting_key: String,
    pub setting_value: String,
    pub setting_type: String,
    pub validation_schema: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub sanitized_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsResetRequest {
    pub category: Option<String>,
    pub setting_key: Option<String>,
    pub user_id: Option<String>,
    pub create_backup: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsResetResult {
    pub success: bool,
    pub reset_count: i32,
    pub errors: Vec<String>,
    pub backup_created: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsCategorySummary {
    pub category: String,
    pub total_settings: i32,
    pub user_customized: i32,
    pub system_settings: i32,
    pub requires_restart: i32,
    pub last_updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsOverview {
    pub total_settings: i32,
    pub user_customized: i32,
    pub categories: Vec<SettingsCategorySummary>,
    pub recent_changes: Vec<SettingsAuditSummary>,
    pub pending_restart: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsAuditSummary {
    pub category: String,
    pub setting_key: String,
    pub change_type: String,
    pub changed_at: String,
    pub changed_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ApplySettingsTemplateRequest {
    pub template_id: i32,
    pub user_id: Option<String>,
    pub override_existing: bool,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SettingsTemplateResult {
    pub success: bool,
    pub applied_count: i32,
    pub skipped_count: i32,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
