use crate::common::macros::str_enum;
use serde::{Deserialize, Serialize};
use specta::Type as SpectaType;
use sqlx::{FromRow, prelude::Type};

// ── Application Settings ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct ApplicationSetting {
    pub id: i32,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
    pub setting_type: String,
    pub default_value: Option<String>,
    pub description: Option<String>,
    pub validation_schema: Option<String>,
    pub requires_restart: bool,
    pub is_user_configurable: bool,
    pub display_order: i32,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct UserPreference {
    pub id: i32,
    pub user_id: String,
    pub category: String,
    pub setting_key: String,
    pub setting_value: Option<String>,
    pub is_custom: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsTemplate {
    pub id: i32,
    pub template_name: String,
    pub template_description: Option<String>,
    pub template_category: String,
    pub template_data: String,
    pub is_system_template: bool,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsBackupHistory {
    pub id: i32,
    pub backup_name: String,
    pub backup_type: String,
    pub backup_data: String,
    pub backup_size: Option<i32>,
    pub user_id: String,
    pub created_at: String,
    pub restored_at: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, FromRow, SpectaType, Clone)]
pub struct SettingsAuditLog {
    pub id: i32,
    pub user_id: String,
    pub category: String,
    pub setting_key: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub change_type: String,
    pub change_source: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: String,
}

str_enum! {
    #[allow(dead_code, clippy::upper_case_acronyms)]
    #[derive(Serialize, Debug, Type, SpectaType, Clone, PartialEq)]
    pub enum ChangeSource {
        UI => "ui",
        API => "api",
        Migration => "migration",
        Template => "template",
        BackupRestore => "backup_restore",
        System => "system",
    }
    default: UI
}
