use crate::common::error::PawnError;
use crate::db::SettingsDb;
use crate::domain::dto::*;
use crate::domain::model::*;
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct SettingsService<D> {
    db: Arc<D>,
}

impl<D: SettingsDb + Send + Sync + 'static> SettingsService<D> {
    pub fn new(db: Arc<D>) -> Self {
        Self { db }
    }

    // Application Settings Operations

    pub async fn get_application_settings(
        &self,
        filter: Option<SettingsFilter>,
    ) -> Result<Vec<ApplicationSetting>, PawnError> {
        Ok(self.db.get_application_settings(filter).await?)
    }

    pub async fn get_application_setting(
        &self,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<ApplicationSetting>, PawnError> {
        Ok(self.db.get_application_setting(category, setting_key).await?)
    }

    // User Preferences Operations

    pub async fn get_user_preference(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<UserPreference>, PawnError> {
        Ok(self
            .db
            .get_user_preference(user_id, category, setting_key)
            .await?)
    }

    pub async fn create_user_preference(
        &self,
        data: CreateUserPreference,
    ) -> Result<UserPreference, PawnError> {
        Ok(self.db.create_user_preference(data).await?)
    }

    pub async fn delete_user_preference(&self, id: i32) -> Result<(), PawnError> {
        Ok(self.db.delete_user_preference(id).await?)
    }

    // Combined Settings Resolution

    pub async fn get_effective_settings(
        &self,
        user_id: &str,
        category: Option<&str>,
    ) -> Result<HashMap<String, String>, PawnError> {
        Ok(self.db.get_effective_settings(user_id, category).await?)
    }

    pub async fn get_effective_setting(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<String>, PawnError> {
        Ok(self
            .db
            .get_effective_setting(user_id, category, setting_key)
            .await?)
    }

    // Settings Templates Operations

    pub async fn get_settings_templates(
        &self,
        category: Option<&str>,
    ) -> Result<Vec<SettingsTemplate>, PawnError> {
        Ok(self.db.get_settings_templates(category).await?)
    }

    pub async fn get_settings_template(
        &self,
        id: i32,
    ) -> Result<Option<SettingsTemplate>, PawnError> {
        Ok(self.db.get_settings_template(id).await?)
    }

    // Settings Backup Operations

    pub async fn create_settings_backup(
        &self,
        data: CreateSettingsBackup,
    ) -> Result<SettingsBackupHistory, PawnError> {
        let user_id = data.user_id.unwrap_or_else(|| "default".to_string());

        let backup_data = self
            .generate_backup_data(&user_id, data.categories.as_ref())
            .await?;
        let backup_size = backup_data.len() as i32;

        Ok(self
            .db
            .insert_settings_backup(&data.backup_name, &data.backup_type, &backup_data, backup_size, &user_id)
            .await?)
    }

    async fn generate_backup_data(
        &self,
        user_id: &str,
        categories: Option<&Vec<String>>,
    ) -> Result<String, PawnError> {
        let settings = self.get_effective_settings(user_id, None).await?;

        let filtered_settings: HashMap<String, String> = if let Some(categories) = categories {
            settings
                .into_iter()
                .filter(|(key, _)| {
                    categories
                        .iter()
                        .any(|cat| key.starts_with(&format!("{cat}.")))
                })
                .collect()
        } else {
            settings
        };

        let backup_data = serde_json::to_string(&filtered_settings).map_err(|e| {
            PawnError::InvalidInput(format!("Failed to serialize backup data: {e}"))
        })?;

        Ok(backup_data)
    }

    pub async fn get_settings_backups(
        &self,
        user_id: &str,
    ) -> Result<Vec<SettingsBackupHistory>, PawnError> {
        Ok(self.db.get_settings_backups(user_id).await?)
    }

    pub async fn restore_settings_backup(
        &self,
        data: RestoreSettingsBackup,
    ) -> Result<(), PawnError> {
        let user_id = data.user_id.unwrap_or_else(|| "default".to_string());

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

        let backup = self.db.get_settings_backup_by_id(data.backup_id).await?;

        let backup_settings: HashMap<String, String> = serde_json::from_str(&backup.backup_data)
            .map_err(|e| PawnError::InvalidInput(format!("Failed to parse backup data: {e}")))?;

        for (full_key, value) in backup_settings {
            let parts: Vec<&str> = full_key.split('.').collect();
            if parts.len() == 2 {
                let category = parts[0];
                let setting_key = parts[1];

                if let Some(categories) = &data.categories
                    && !categories.contains(&category.to_string())
                {
                    continue;
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

        self.db.mark_backup_restored(data.backup_id).await?;
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

        match request.setting_type.as_str() {
            "integer" => {
                if request.setting_value.parse::<i64>().is_err() {
                    result.is_valid = false;
                    result.errors.push(format!(
                        "Value '{}' is not a valid integer",
                        request.setting_value
                    ));
                }
            }
            "float" => {
                if request.setting_value.parse::<f64>().is_err() {
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
                    result.errors.push(format!("Value is not valid JSON: {e}"));
                }
            }
            _ => {}
        }

        match (request.category.as_str(), request.setting_key.as_str()) {
            ("general", "language") => {
                let valid_languages = ["en", "ru", "ua"];
                let lang = request.setting_value.trim_matches('"');
                if !valid_languages.contains(&lang) {
                    result
                        .warnings
                        .push(format!("Language '{lang}' may not be fully supported"));
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
        let categories = self.db.get_settings_category_summaries(user_id).await?;

        let mut total_settings = 0;
        let mut user_customized = 0;
        let mut pending_restart = false;

        for cat in &categories {
            total_settings += cat.total_settings;
            user_customized += cat.user_customized;
            if cat.requires_restart > 0 {
                pending_restart = true;
            }
        }

        let recent_changes = self.db.get_settings_audit_log(user_id, 10).await?;

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

        let rows_affected = self
            .db
            .delete_user_preferences_filtered(
                &user_id,
                request.category.as_deref(),
                request.setting_key.as_deref(),
            )
            .await?;

        Ok(SettingsResetResult {
            success: true,
            reset_count: rows_affected as i32,
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
            self.get_application_settings(None)
                .await?
                .into_iter()
                .map(|s| {
                    (
                        format!(
                            "{category}.{setting_key}",
                            category = s.category,
                            setting_key = s.setting_key
                        ),
                        s.setting_value.unwrap_or_default(),
                    )
                })
                .collect()
        };

        match request.format.as_str() {
            "json" => {
                let json_data = serde_json::to_string_pretty(&settings).map_err(|e| {
                    PawnError::InvalidInput(format!("JSON serialization error: {e}"))
                })?;
                Ok(json_data)
            }
            "yaml" => {
                let yaml_data = serde_yaml::to_string(&settings).map_err(|e| {
                    PawnError::InvalidInput(format!("YAML serialization error: {e}"))
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
                .map_err(|e| PawnError::InvalidInput(format!("JSON parsing error: {e}")))?,
            "yaml" => serde_yaml::from_str::<HashMap<String, String>>(&request.data)
                .map_err(|e| PawnError::InvalidInput(format!("YAML parsing error: {e}")))?,
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
                warnings.push(format!("Invalid setting key format: {setting_key}"));
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
            .map_err(|e| PawnError::InvalidInput(format!("Invalid template data: {e}")))?;

        let mut applied_count = 0;
        let mut skipped_count = 0;
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        for (setting_key, value) in template_data {
            if let Some((category, key)) = setting_key.split_once('.') {
                if let Some(ref categories) = request.categories
                    && !categories.contains(&category.to_string())
                {
                    skipped_count += 1;
                    continue;
                }

                let preference_data = CreateUserPreference {
                    user_id: request.user_id.clone(),
                    category: category.to_string(),
                    setting_key: key.to_string(),
                    setting_value: Some(value),
                };

                if request.override_existing {
                    if let Some(ref user_id) = request.user_id
                        && let Ok(Some(existing)) =
                            self.get_user_preference(user_id, category, key).await
                    {
                        let _ = self.delete_user_preference(existing.id).await;
                    }
                }

                match self.create_user_preference(preference_data).await {
                    Ok(_) => applied_count += 1,
                    Err(e) => {
                        errors.push(format!("Failed to apply {category}.{key}: {e}"));
                    }
                }
            } else {
                warnings.push(format!("Invalid setting key format: {setting_key}"));
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
        Ok(self.db.get_settings_requiring_restart(user_id).await?)
    }

    pub async fn get_settings_backup_history(
        &self,
        user_id: &str,
    ) -> Result<Vec<SettingsBackupHistory>, PawnError> {
        Ok(self.db.get_settings_backups(user_id).await?)
    }
}

