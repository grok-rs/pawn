use crate::pawn::common::error::PawnError;
use crate::pawn::domain::dto::*;
use crate::pawn::domain::model::*;
use serde_json;
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct SettingsService {
    pool: Arc<SqlitePool>,
}

impl SettingsService {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    // Application Settings Operations

    pub async fn get_application_settings(
        &self,
        filter: Option<SettingsFilter>,
    ) -> Result<Vec<ApplicationSetting>, PawnError> {
        let mut query = "SELECT * FROM application_settings WHERE 1=1".to_string();
        let mut params = Vec::new();

        if let Some(filter) = filter {
            if let Some(category) = filter.category {
                query.push_str(" AND category = ?");
                params.push(category);
            }
            if let Some(setting_key) = filter.setting_key {
                query.push_str(" AND setting_key = ?");
                params.push(setting_key);
            }
            if let Some(user_configurable) = filter.user_configurable_only {
                if user_configurable {
                    query.push_str(" AND is_user_configurable = 1");
                }
            }
        }

        query.push_str(" ORDER BY category, display_order, setting_key");

        let mut query_builder = sqlx::query_as::<_, ApplicationSetting>(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let settings = query_builder.fetch_all(self.pool.as_ref()).await?;
        Ok(settings)
    }

    pub async fn get_application_setting(
        &self,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<ApplicationSetting>, PawnError> {
        let setting = sqlx::query_as::<_, ApplicationSetting>(
            "SELECT * FROM application_settings WHERE category = ? AND setting_key = ?",
        )
        .bind(category)
        .bind(setting_key)
        .fetch_optional(self.pool.as_ref())
        .await?;

        Ok(setting)
    }

    pub async fn create_application_setting(
        &self,
        data: CreateApplicationSetting,
    ) -> Result<ApplicationSetting, PawnError> {
        let setting = sqlx::query_as::<_, ApplicationSetting>(
            r#"
            INSERT INTO application_settings (
                category, setting_key, setting_value, setting_type, default_value,
                description, validation_schema, requires_restart, is_user_configurable, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&data.category)
        .bind(&data.setting_key)
        .bind(&data.setting_value)
        .bind(&data.setting_type)
        .bind(&data.default_value)
        .bind(&data.description)
        .bind(&data.validation_schema)
        .bind(data.requires_restart.unwrap_or(false))
        .bind(data.is_user_configurable.unwrap_or(true))
        .bind(data.display_order.unwrap_or(0))
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(setting)
    }

    pub async fn update_application_setting(
        &self,
        data: UpdateApplicationSetting,
    ) -> Result<ApplicationSetting, PawnError> {
        let setting = sqlx::query_as::<_, ApplicationSetting>(
            r#"
            UPDATE application_settings 
            SET setting_value = COALESCE(?, setting_value),
                description = COALESCE(?, description),
                validation_schema = COALESCE(?, validation_schema),
                requires_restart = COALESCE(?, requires_restart),
                is_user_configurable = COALESCE(?, is_user_configurable),
                display_order = COALESCE(?, display_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&data.setting_value)
        .bind(&data.description)
        .bind(&data.validation_schema)
        .bind(data.requires_restart)
        .bind(data.is_user_configurable)
        .bind(data.display_order)
        .bind(data.id)
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(setting)
    }

    pub async fn delete_application_setting(&self, id: i32) -> Result<(), PawnError> {
        sqlx::query("DELETE FROM application_settings WHERE id = ?")
            .bind(id)
            .execute(self.pool.as_ref())
            .await?;

        Ok(())
    }

    // User Preferences Operations

    pub async fn get_user_preferences(
        &self,
        user_id: &str,
        category: Option<&str>,
    ) -> Result<Vec<UserPreference>, PawnError> {
        let mut query = "SELECT * FROM user_preferences WHERE user_id = ?".to_string();
        let mut params = vec![user_id.to_string()];

        if let Some(category) = category {
            query.push_str(" AND category = ?");
            params.push(category.to_string());
        }

        query.push_str(" ORDER BY category, setting_key");

        let mut query_builder = sqlx::query_as::<_, UserPreference>(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let preferences = query_builder.fetch_all(self.pool.as_ref()).await?;
        Ok(preferences)
    }

    pub async fn get_user_preference(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<UserPreference>, PawnError> {
        let preference = sqlx::query_as::<_, UserPreference>(
            "SELECT * FROM user_preferences WHERE user_id = ? AND category = ? AND setting_key = ?",
        )
        .bind(user_id)
        .bind(category)
        .bind(setting_key)
        .fetch_optional(self.pool.as_ref())
        .await?;

        Ok(preference)
    }

    pub async fn create_user_preference(
        &self,
        data: CreateUserPreference,
    ) -> Result<UserPreference, PawnError> {
        let user_id = data.user_id.unwrap_or_else(|| "default".to_string());

        let preference = sqlx::query_as::<_, UserPreference>(
            r#"
            INSERT INTO user_preferences (user_id, category, setting_key, setting_value, is_custom)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT (user_id, category, setting_key) DO UPDATE SET
                setting_value = EXCLUDED.setting_value,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
            "#,
        )
        .bind(&user_id)
        .bind(&data.category)
        .bind(&data.setting_key)
        .bind(&data.setting_value)
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(preference)
    }

    pub async fn update_user_preference(
        &self,
        data: UpdateUserPreference,
    ) -> Result<UserPreference, PawnError> {
        let preference = sqlx::query_as::<_, UserPreference>(
            r#"
            UPDATE user_preferences 
            SET setting_value = COALESCE(?, setting_value),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&data.setting_value)
        .bind(data.id)
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(preference)
    }

    pub async fn delete_user_preference(&self, id: i32) -> Result<(), PawnError> {
        sqlx::query("DELETE FROM user_preferences WHERE id = ?")
            .bind(id)
            .execute(self.pool.as_ref())
            .await?;

        Ok(())
    }

    // Combined Settings Resolution (user preferences override application settings)

    pub async fn get_effective_settings(
        &self,
        user_id: &str,
        category: Option<&str>,
    ) -> Result<HashMap<String, String>, PawnError> {
        let mut query = r#"
            SELECT 
                a.category,
                a.setting_key,
                COALESCE(u.setting_value, a.setting_value, a.default_value) as effective_value
            FROM application_settings a
            LEFT JOIN user_preferences u ON (
                a.category = u.category AND 
                a.setting_key = u.setting_key AND 
                u.user_id = ?
            )
            WHERE 1=1
        "#
        .to_string();

        let mut params = vec![user_id.to_string()];

        if let Some(category) = category {
            query.push_str(" AND a.category = ?");
            params.push(category.to_string());
        }

        query.push_str(" ORDER BY a.category, a.display_order, a.setting_key");

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let rows = query_builder.fetch_all(self.pool.as_ref()).await?;

        let mut settings = HashMap::new();
        for row in rows {
            let category: String = row.try_get("category")?;
            let setting_key: String = row.try_get("setting_key")?;
            let effective_value: Option<String> = row.try_get("effective_value")?;

            if let Some(value) = effective_value {
                let full_key = format!("{}.{}", category, setting_key);
                settings.insert(full_key, value);
            }
        }

        Ok(settings)
    }

    pub async fn get_effective_setting(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<String>, PawnError> {
        let row = sqlx::query(
            r#"
            SELECT COALESCE(u.setting_value, a.setting_value, a.default_value) as effective_value
            FROM application_settings a
            LEFT JOIN user_preferences u ON (
                a.category = u.category AND 
                a.setting_key = u.setting_key AND 
                u.user_id = ?
            )
            WHERE a.category = ? AND a.setting_key = ?
            "#,
        )
        .bind(user_id)
        .bind(category)
        .bind(setting_key)
        .fetch_optional(self.pool.as_ref())
        .await?;

        if let Some(row) = row {
            let effective_value: Option<String> = row.try_get("effective_value")?;
            Ok(effective_value)
        } else {
            Ok(None)
        }
    }

    // Settings Templates Operations

    pub async fn get_settings_templates(
        &self,
        category: Option<&str>,
    ) -> Result<Vec<SettingsTemplate>, PawnError> {
        let mut query = "SELECT * FROM settings_templates WHERE 1=1".to_string();
        let mut params = Vec::new();

        if let Some(category) = category {
            query.push_str(" AND template_category = ?");
            params.push(category.to_string());
        }

        query.push_str(" ORDER BY is_system_template DESC, is_default DESC, template_name");

        let mut query_builder = sqlx::query_as::<_, SettingsTemplate>(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let templates = query_builder.fetch_all(self.pool.as_ref()).await?;
        Ok(templates)
    }

    pub async fn get_settings_template(
        &self,
        id: i32,
    ) -> Result<Option<SettingsTemplate>, PawnError> {
        let template =
            sqlx::query_as::<_, SettingsTemplate>("SELECT * FROM settings_templates WHERE id = ?")
                .bind(id)
                .fetch_optional(self.pool.as_ref())
                .await?;

        Ok(template)
    }

    pub async fn create_settings_template(
        &self,
        data: CreateSettingsTemplate,
    ) -> Result<SettingsTemplate, PawnError> {
        let template = sqlx::query_as::<_, SettingsTemplate>(
            r#"
            INSERT INTO settings_templates (
                template_name, template_description, template_category, 
                template_data, is_system_template, is_default
            ) VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&data.template_name)
        .bind(&data.template_description)
        .bind(&data.template_category)
        .bind(&data.template_data)
        .bind(data.is_system_template.unwrap_or(false))
        .bind(data.is_default.unwrap_or(false))
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(template)
    }

    pub async fn update_settings_template(
        &self,
        data: UpdateSettingsTemplate,
    ) -> Result<SettingsTemplate, PawnError> {
        let template = sqlx::query_as::<_, SettingsTemplate>(
            r#"
            UPDATE settings_templates 
            SET template_name = COALESCE(?, template_name),
                template_description = COALESCE(?, template_description),
                template_category = COALESCE(?, template_category),
                template_data = COALESCE(?, template_data),
                is_system_template = COALESCE(?, is_system_template),
                is_default = COALESCE(?, is_default),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&data.template_name)
        .bind(&data.template_description)
        .bind(&data.template_category)
        .bind(&data.template_data)
        .bind(data.is_system_template)
        .bind(data.is_default)
        .bind(data.id)
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(template)
    }

    pub async fn delete_settings_template(&self, id: i32) -> Result<(), PawnError> {
        sqlx::query("DELETE FROM settings_templates WHERE id = ?")
            .bind(id)
            .execute(self.pool.as_ref())
            .await?;

        Ok(())
    }

    // Settings Backup Operations

    pub async fn create_settings_backup(
        &self,
        data: CreateSettingsBackup,
    ) -> Result<SettingsBackupHistory, PawnError> {
        let user_id = data.user_id.unwrap_or_else(|| "default".to_string());

        // Generate backup data (JSON)
        let backup_data = self
            .generate_backup_data(&user_id, data.categories.as_ref())
            .await?;
        let backup_size = backup_data.len() as i32;

        let backup = sqlx::query_as::<_, SettingsBackupHistory>(
            r#"
            INSERT INTO settings_backup_history (
                backup_name, backup_type, backup_data, backup_size, user_id
            ) VALUES (?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&data.backup_name)
        .bind(&data.backup_type)
        .bind(&backup_data)
        .bind(backup_size)
        .bind(&user_id)
        .fetch_one(self.pool.as_ref())
        .await?;

        Ok(backup)
    }

    async fn generate_backup_data(
        &self,
        user_id: &str,
        categories: Option<&Vec<String>>,
    ) -> Result<String, PawnError> {
        let settings = self.get_effective_settings(user_id, None).await?;

        // Filter by categories if specified
        let filtered_settings: HashMap<String, String> = if let Some(categories) = categories {
            settings
                .into_iter()
                .filter(|(key, _)| {
                    categories
                        .iter()
                        .any(|cat| key.starts_with(&format!("{}.", cat)))
                })
                .collect()
        } else {
            settings
        };

        let backup_data = serde_json::to_string(&filtered_settings).map_err(|e| {
            PawnError::InvalidInput(format!("Failed to serialize backup data: {}", e))
        })?;

        Ok(backup_data)
    }

    pub async fn get_settings_backups(
        &self,
        user_id: &str,
    ) -> Result<Vec<SettingsBackupHistory>, PawnError> {
        let backups = sqlx::query_as::<_, SettingsBackupHistory>(
            "SELECT * FROM settings_backup_history WHERE user_id = ? ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(self.pool.as_ref())
        .await?;

        Ok(backups)
    }

    pub async fn restore_settings_backup(
        &self,
        data: RestoreSettingsBackup,
    ) -> Result<(), PawnError> {
        let user_id = data.user_id.unwrap_or_else(|| "default".to_string());

        // Create backup before restore if requested
        if data.create_backup_before_restore.unwrap_or(true) {
            let backup_data = CreateSettingsBackup {
                backup_name: format!(
                    "Auto-backup before restore {}",
                    chrono::Utc::now().format("%Y-%m-%d %H:%M:%S")
                ),
                backup_type: "automatic".to_string(),
                user_id: Some(user_id.clone()),
                categories: data.categories.clone(),
            };
            self.create_settings_backup(backup_data).await?;
        }

        // Get backup data
        let backup = sqlx::query_as::<_, SettingsBackupHistory>(
            "SELECT * FROM settings_backup_history WHERE id = ?",
        )
        .bind(data.backup_id)
        .fetch_one(self.pool.as_ref())
        .await?;

        // Parse backup data
        let backup_settings: HashMap<String, String> = serde_json::from_str(&backup.backup_data)
            .map_err(|e| PawnError::InvalidInput(format!("Failed to parse backup data: {}", e)))?;

        // Restore settings
        for (full_key, value) in backup_settings {
            let parts: Vec<&str> = full_key.split('.').collect();
            if parts.len() == 2 {
                let category = parts[0];
                let setting_key = parts[1];

                // Skip if categories filter is specified and this category is not included
                if let Some(categories) = &data.categories {
                    if !categories.contains(&category.to_string()) {
                        continue;
                    }
                }

                let preference_data = CreateUserPreference {
                    user_id: Some(user_id.clone()),
                    category: category.to_string(),
                    setting_key: setting_key.to_string(),
                    setting_value: Some(value),
                };

                self.create_user_preference(preference_data).await?;
            }
        }

        // Update backup as restored
        sqlx::query(
            "UPDATE settings_backup_history SET restored_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(data.backup_id)
        .execute(self.pool.as_ref())
        .await?;

        Ok(())
    }

    // Settings Validation

    pub async fn validate_setting(
        &self,
        request: SettingsValidationRequest,
    ) -> Result<SettingsValidationResult, PawnError> {
        let mut result = SettingsValidationResult {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
            sanitized_value: None,
        };

        // Basic type validation
        match request.setting_type.as_str() {
            "integer" => {
                if let Err(_) = request.setting_value.parse::<i64>() {
                    result.is_valid = false;
                    result.errors.push(format!(
                        "Value '{}' is not a valid integer",
                        request.setting_value
                    ));
                }
            }
            "float" => {
                if let Err(_) = request.setting_value.parse::<f64>() {
                    result.is_valid = false;
                    result.errors.push(format!(
                        "Value '{}' is not a valid float",
                        request.setting_value
                    ));
                }
            }
            "boolean" => {
                if !matches!(request.setting_value.as_str(), "true" | "false" | "1" | "0") {
                    result.is_valid = false;
                    result.errors.push(format!(
                        "Value '{}' is not a valid boolean",
                        request.setting_value
                    ));
                } else {
                    // Normalize boolean values
                    let normalized = match request.setting_value.as_str() {
                        "true" | "1" => "true",
                        "false" | "0" => "false",
                        _ => &request.setting_value,
                    };
                    result.sanitized_value = Some(normalized.to_string());
                }
            }
            "json" => {
                if let Err(e) = serde_json::from_str::<serde_json::Value>(&request.setting_value) {
                    result.is_valid = false;
                    result
                        .errors
                        .push(format!("Value is not valid JSON: {}", e));
                }
            }
            _ => {} // string and array types are generally valid
        }

        // Additional validation based on setting key
        match (request.category.as_str(), request.setting_key.as_str()) {
            ("general", "language") => {
                let valid_languages = vec!["en", "ru", "ua"];
                let lang = request.setting_value.trim_matches('"');
                if !valid_languages.contains(&lang) {
                    result
                        .warnings
                        .push(format!("Language '{}' may not be fully supported", lang));
                }
            }
            ("performance", "cache_size_mb") => {
                if let Ok(size) = request.setting_value.parse::<i32>() {
                    if size < 16 {
                        result
                            .warnings
                            .push("Cache size below 16MB may impact performance".to_string());
                    } else if size > 1024 {
                        result
                            .warnings
                            .push("Cache size above 1GB may use excessive memory".to_string());
                    }
                }
            }
            _ => {}
        }

        Ok(result)
    }

    // Settings Overview

    pub async fn get_settings_overview(
        &self,
        user_id: &str,
    ) -> Result<SettingsOverview, PawnError> {
        // Get category summaries
        let category_rows = sqlx::query(
            r#"
            SELECT 
                a.category,
                COUNT(*) as total_settings,
                COUNT(u.id) as user_customized,
                SUM(CASE WHEN a.is_user_configurable = 0 THEN 1 ELSE 0 END) as system_settings,
                SUM(CASE WHEN a.requires_restart = 1 THEN 1 ELSE 0 END) as requires_restart,
                MAX(COALESCE(u.updated_at, a.updated_at)) as last_updated
            FROM application_settings a
            LEFT JOIN user_preferences u ON (
                a.category = u.category AND 
                a.setting_key = u.setting_key AND 
                u.user_id = ?
            )
            GROUP BY a.category
            ORDER BY a.category
            "#,
        )
        .bind(user_id)
        .fetch_all(self.pool.as_ref())
        .await?;

        let mut categories = Vec::new();
        let mut total_settings = 0;
        let mut user_customized = 0;
        let mut pending_restart = false;

        for row in category_rows {
            let category: String = row.try_get("category")?;
            let total: i32 = row.try_get("total_settings")?;
            let customized: i32 = row.try_get("user_customized")?;
            let system: i32 = row.try_get("system_settings")?;
            let restart_required: i32 = row.try_get("requires_restart")?;
            let last_updated: Option<String> = row.try_get("last_updated")?;

            total_settings += total;
            user_customized += customized;

            if restart_required > 0 {
                pending_restart = true;
            }

            categories.push(SettingsCategorySummary {
                category,
                total_settings: total,
                user_customized: customized,
                system_settings: system,
                requires_restart: restart_required,
                last_updated,
            });
        }

        // Get recent changes
        let recent_changes = sqlx::query_as::<_, SettingsAuditLog>(
            r#"
            SELECT * FROM settings_audit_log 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
            "#,
        )
        .bind(user_id)
        .fetch_all(self.pool.as_ref())
        .await?;

        let recent_changes_summary: Vec<SettingsAuditSummary> = recent_changes
            .into_iter()
            .map(|audit| SettingsAuditSummary {
                category: audit.category,
                setting_key: audit.setting_key,
                change_type: audit.change_type,
                changed_at: audit.created_at,
                changed_by: audit.user_id,
            })
            .collect();

        Ok(SettingsOverview {
            total_settings,
            user_customized,
            categories,
            recent_changes: recent_changes_summary,
            pending_restart,
        })
    }

    // Settings Reset

    pub async fn reset_settings(
        &self,
        request: SettingsResetRequest,
    ) -> Result<SettingsResetResult, PawnError> {
        let user_id = request.user_id.unwrap_or_else(|| "default".to_string());

        // Create backup if requested
        let backup_created = if request.create_backup.unwrap_or(true) {
            let backup_data = CreateSettingsBackup {
                backup_name: format!(
                    "Auto-backup before reset {}",
                    chrono::Utc::now().format("%Y-%m-%d %H:%M:%S")
                ),
                backup_type: "automatic".to_string(),
                user_id: Some(user_id.clone()),
                categories: request.category.as_ref().map(|c| vec![c.clone()]),
            };
            let backup = self.create_settings_backup(backup_data).await?;
            Some(backup.backup_name)
        } else {
            None
        };

        // Build delete query
        let mut query = "DELETE FROM user_preferences WHERE user_id = ?".to_string();
        let mut params = vec![user_id];

        if let Some(category) = &request.category {
            query.push_str(" AND category = ?");
            params.push(category.clone());
        }

        if let Some(setting_key) = &request.setting_key {
            query.push_str(" AND setting_key = ?");
            params.push(setting_key.clone());
        }

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let result = query_builder.execute(self.pool.as_ref()).await?;
        let reset_count = result.rows_affected() as i32;

        Ok(SettingsResetResult {
            success: true,
            reset_count,
            errors: Vec::new(),
            backup_created,
        })
    }

    pub async fn export_settings(
        &self,
        request: SettingsExportRequest,
    ) -> Result<String, PawnError> {
        let settings = if let Some(ref user_id) = request.user_id {
            self.get_effective_settings(user_id, None).await?
        } else {
            // Get application defaults
            self.get_application_settings(None)
                .await?
                .into_iter()
                .map(|s| {
                    (
                        format!("{}.{}", s.category, s.setting_key),
                        s.setting_value.unwrap_or_default(),
                    )
                })
                .collect()
        };

        match request.format.as_str() {
            "json" => {
                let json_data = serde_json::to_string_pretty(&settings).map_err(|e| {
                    PawnError::InvalidInput(format!("JSON serialization error: {}", e))
                })?;
                Ok(json_data)
            }
            "yaml" => {
                let yaml_data = serde_yaml::to_string(&settings).map_err(|e| {
                    PawnError::InvalidInput(format!("YAML serialization error: {}", e))
                })?;
                Ok(yaml_data)
            }
            "csv" => {
                let mut csv_data = String::from("category,setting_key,setting_value\n");
                for (key, value) in settings {
                    csv_data.push_str(&format!(
                        "{},{},{}\n",
                        key.split('.').next().unwrap_or("unknown"),
                        key.split('.').nth(1).unwrap_or(&key),
                        value.replace(',', "\"\"")
                    ));
                }
                Ok(csv_data)
            }
            _ => Err(PawnError::InvalidInput(format!(
                "Unsupported export format: {}",
                request.format
            ))),
        }
    }

    pub async fn import_settings(
        &self,
        request: SettingsImportRequest,
    ) -> Result<SettingsImportResult, PawnError> {
        let mut imported_count = 0;
        let mut skipped_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut backup_created = None;

        // Create backup if requested
        if request.create_backup_before_import.unwrap_or(false) {
            let backup_data = CreateSettingsBackup {
                backup_name: format!(
                    "Pre-import backup {}",
                    chrono::Utc::now().format("%Y-%m-%d %H:%M:%S")
                ),
                backup_type: "automatic".to_string(),
                user_id: request.user_id.clone(),
                categories: None,
            };
            if let Ok(backup) = self.create_settings_backup(backup_data).await {
                backup_created = Some(backup.backup_name);
            }
        }

        let settings_data = match request.format.as_str() {
            "json" => serde_json::from_str::<HashMap<String, String>>(&request.data)
                .map_err(|e| PawnError::InvalidInput(format!("JSON parsing error: {}", e)))?,
            "yaml" => serde_yaml::from_str::<HashMap<String, String>>(&request.data)
                .map_err(|e| PawnError::InvalidInput(format!("YAML parsing error: {}", e)))?,
            _ => {
                return Err(PawnError::InvalidInput(format!(
                    "Unsupported import format: {}",
                    request.format
                )));
            }
        };

        for (setting_key, value) in settings_data {
            if let Some((category, key)) = setting_key.split_once('.') {
                let preference_data = CreateUserPreference {
                    user_id: request.user_id.clone(),
                    category: category.to_string(),
                    setting_key: key.to_string(),
                    setting_value: Some(value),
                };

                match self.create_user_preference(preference_data).await {
                    Ok(_) => imported_count += 1,
                    Err(e) => {
                        error_count += 1;
                        errors.push(SettingsImportError {
                            category: category.to_string(),
                            setting_key: key.to_string(),
                            error_type: "validation".to_string(),
                            message: e.to_string(),
                            suggested_action: Some("Check setting value format".to_string()),
                        });
                    }
                }
            } else {
                warnings.push(format!("Invalid setting key format: {}", setting_key));
                skipped_count += 1;
            }
        }

        Ok(SettingsImportResult {
            success: errors.is_empty(),
            imported_count,
            skipped_count,
            error_count,
            warnings,
            errors,
            backup_created,
        })
    }

    pub async fn apply_settings_template(
        &self,
        request: ApplySettingsTemplateRequest,
    ) -> Result<SettingsTemplateResult, PawnError> {
        let template = self
            .get_settings_template(request.template_id)
            .await?
            .ok_or_else(|| PawnError::NotFound("Settings template not found".to_string()))?;

        let template_data: HashMap<String, String> = serde_json::from_str(&template.template_data)
            .map_err(|e| PawnError::InvalidInput(format!("Invalid template data: {}", e)))?;

        let mut applied_count = 0;
        let mut skipped_count = 0;
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        for (setting_key, value) in template_data {
            if let Some((category, key)) = setting_key.split_once('.') {
                // Skip if category filter specified and doesn't match
                if let Some(ref categories) = request.categories {
                    if !categories.contains(&category.to_string()) {
                        skipped_count += 1;
                        continue;
                    }
                }

                let preference_data = CreateUserPreference {
                    user_id: request.user_id.clone(),
                    category: category.to_string(),
                    setting_key: key.to_string(),
                    setting_value: Some(value),
                };

                if request.override_existing {
                    // Delete existing preference if it exists
                    if let Some(ref user_id) = request.user_id {
                        if let Ok(Some(existing)) =
                            self.get_user_preference(user_id, category, key).await
                        {
                            let _ = self.delete_user_preference(existing.id).await;
                        }
                    }
                }

                match self.create_user_preference(preference_data).await {
                    Ok(_) => applied_count += 1,
                    Err(e) => {
                        errors.push(format!("Failed to apply {}.{}: {}", category, key, e));
                    }
                }
            } else {
                warnings.push(format!("Invalid setting key format: {}", setting_key));
                skipped_count += 1;
            }
        }

        Ok(SettingsTemplateResult {
            success: errors.is_empty(),
            applied_count,
            skipped_count,
            errors,
            warnings,
        })
    }

    pub async fn get_settings_requiring_restart(
        &self,
        user_id: &str,
    ) -> Result<Vec<String>, PawnError> {
        let query = r#"
            SELECT DISTINCT up.category || '.' || up.setting_key as setting_key
            FROM user_preferences up
            JOIN application_settings ast ON ast.category = up.category AND ast.setting_key = up.setting_key
            WHERE up.user_id = ? AND ast.requires_restart = 1
        "#;

        let rows = sqlx::query(query)
            .bind(user_id)
            .fetch_all(self.pool.as_ref())
            .await?;

        let mut restart_settings = Vec::new();
        for row in rows {
            let setting_key: String = row.get("setting_key");
            restart_settings.push(setting_key);
        }

        Ok(restart_settings)
    }

    pub async fn get_settings_backup_history(
        &self,
        user_id: &str,
    ) -> Result<Vec<SettingsBackupHistory>, PawnError> {
        let backups = sqlx::query_as::<_, SettingsBackupHistory>(
            "SELECT * FROM settings_backup_history WHERE user_id = ? ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(self.pool.as_ref())
        .await?;

        Ok(backups)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;
    use tempfile::TempDir;

    async fn get_test_db() -> SqlitePool {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db_path = temp_dir.path().join("test.db");
        let database_url = format!("sqlite://{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&database_url)
            .await
            .expect("Failed to connect to test database");

        // Apply migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        pool
    }

    #[tokio::test]
    async fn test_get_effective_settings() {
        let pool = get_test_db().await;
        let service = SettingsService::new(pool);

        // Test getting effective settings for default user
        let settings = service
            .get_effective_settings("default", Some("general"))
            .await
            .unwrap();

        assert!(!settings.is_empty());
        assert!(settings.contains_key("general.language"));
    }

    #[tokio::test]
    async fn test_user_preference_override() {
        let pool = get_test_db().await;
        let service = SettingsService::new(pool);

        // Create a user preference
        let preference_data = CreateUserPreference {
            user_id: Some("test_user".to_string()),
            category: "general".to_string(),
            setting_key: "language".to_string(),
            setting_value: Some("\"ru\"".to_string()),
        };

        service
            .create_user_preference(preference_data)
            .await
            .unwrap();

        // Check that the effective setting is overridden
        let effective_value = service
            .get_effective_setting("test_user", "general", "language")
            .await
            .unwrap();

        assert_eq!(effective_value, Some("\"ru\"".to_string()));
    }

    #[tokio::test]
    async fn test_settings_validation() {
        let pool = get_test_db().await;
        let service = SettingsService::new(pool);

        // Test valid integer
        let request = SettingsValidationRequest {
            category: "performance".to_string(),
            setting_key: "cache_size_mb".to_string(),
            setting_value: "128".to_string(),
            setting_type: "integer".to_string(),
            validation_schema: None,
        };

        let result = service.validate_setting(request).await.unwrap();
        assert!(result.is_valid);

        // Test invalid integer
        let request = SettingsValidationRequest {
            category: "performance".to_string(),
            setting_key: "cache_size_mb".to_string(),
            setting_value: "not_a_number".to_string(),
            setting_type: "integer".to_string(),
            validation_schema: None,
        };

        let result = service.validate_setting(request).await.unwrap();
        assert!(!result.is_valid);
        assert!(!result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_settings_backup_restore() {
        let pool = get_test_db().await;
        let service = SettingsService::new(pool);

        // Create a user preference
        let preference_data = CreateUserPreference {
            user_id: Some("test_user".to_string()),
            category: "general".to_string(),
            setting_key: "language".to_string(),
            setting_value: Some("\"ru\"".to_string()),
        };

        service
            .create_user_preference(preference_data)
            .await
            .unwrap();

        // Create a backup
        let backup_data = CreateSettingsBackup {
            backup_name: "Test Backup".to_string(),
            backup_type: "manual".to_string(),
            user_id: Some("test_user".to_string()),
            categories: None,
        };

        let backup = service.create_settings_backup(backup_data).await.unwrap();
        assert_eq!(backup.backup_name, "Test Backup");

        // Clear preferences
        service
            .delete_user_preference(
                service
                    .get_user_preference("test_user", "general", "language")
                    .await
                    .unwrap()
                    .unwrap()
                    .id,
            )
            .await
            .unwrap();

        // Restore from backup
        let restore_data = RestoreSettingsBackup {
            backup_id: backup.id,
            user_id: Some("test_user".to_string()),
            categories: None,
            create_backup_before_restore: Some(false),
        };

        service.restore_settings_backup(restore_data).await.unwrap();

        // Check that preference is restored
        let restored_preference = service
            .get_user_preference("test_user", "general", "language")
            .await
            .unwrap();

        assert!(restored_preference.is_some());
        assert_eq!(
            restored_preference.unwrap().setting_value,
            Some("\"ru\"".to_string())
        );
    }
}
