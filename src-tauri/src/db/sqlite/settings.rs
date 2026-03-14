use std::collections::HashMap;

use sqlx::Row;
use tracing::instrument;

use super::SqliteDb;
use crate::db::{
    CreateUserPreference, SettingsCategorySummary, SettingsDb, SettingsFilter,
};
use crate::domain::model::{
    ApplicationSetting, SettingsAuditLog, SettingsBackupHistory, SettingsTemplate, UserPreference,
};

impl SettingsDb for SqliteDb {
    // Application Settings

    #[instrument(ret, skip(self))]
    async fn get_application_settings(
        &self,
        filter: Option<SettingsFilter>,
    ) -> Result<Vec<ApplicationSetting>, sqlx::Error> {
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
            if let Some(user_configurable) = filter.user_configurable_only
                && user_configurable
            {
                query.push_str(" AND is_user_configurable = 1");
            }
        }

        query.push_str(" ORDER BY category, display_order, setting_key");

        let mut query_builder = sqlx::query_as::<_, ApplicationSetting>(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let settings = query_builder.fetch_all(&self.pool).await?;
        Ok(settings)
    }

    #[instrument(ret, skip(self))]
    async fn get_application_setting(
        &self,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<ApplicationSetting>, sqlx::Error> {
        let setting = sqlx::query_as::<_, ApplicationSetting>(
            "SELECT * FROM application_settings WHERE category = ? AND setting_key = ?",
        )
        .bind(category)
        .bind(setting_key)
        .fetch_optional(&self.pool)
        .await?;

        Ok(setting)
    }

    // User Preferences

    #[instrument(ret, skip(self))]
    async fn get_user_preference(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<UserPreference>, sqlx::Error> {
        let preference = sqlx::query_as::<_, UserPreference>(
            "SELECT * FROM user_preferences WHERE user_id = ? AND category = ? AND setting_key = ?",
        )
        .bind(user_id)
        .bind(category)
        .bind(setting_key)
        .fetch_optional(&self.pool)
        .await?;

        Ok(preference)
    }

    #[instrument(ret, skip(self))]
    async fn create_user_preference(
        &self,
        data: CreateUserPreference,
    ) -> Result<UserPreference, sqlx::Error> {
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
        .fetch_one(&self.pool)
        .await?;

        Ok(preference)
    }

    #[instrument(ret, skip(self))]
    async fn delete_user_preference(&self, id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM user_preferences WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Effective Settings

    #[instrument(ret, skip(self))]
    async fn get_effective_settings(
        &self,
        user_id: &str,
        category: Option<&str>,
    ) -> Result<HashMap<String, String>, sqlx::Error> {
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

        let rows = query_builder.fetch_all(&self.pool).await?;

        let mut settings = HashMap::new();
        for row in rows {
            let category: String = row.try_get("category")?;
            let setting_key: String = row.try_get("setting_key")?;
            let effective_value: Option<String> = row.try_get("effective_value")?;

            if let Some(value) = effective_value {
                let full_key = format!("{category}.{setting_key}");
                settings.insert(full_key, value);
            }
        }

        Ok(settings)
    }

    #[instrument(ret, skip(self))]
    async fn get_effective_setting(
        &self,
        user_id: &str,
        category: &str,
        setting_key: &str,
    ) -> Result<Option<String>, sqlx::Error> {
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
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let effective_value: Option<String> = row.try_get("effective_value")?;
            Ok(effective_value)
        } else {
            Ok(None)
        }
    }

    // Settings Templates

    #[instrument(ret, skip(self))]
    async fn get_settings_templates(
        &self,
        category: Option<&str>,
    ) -> Result<Vec<SettingsTemplate>, sqlx::Error> {
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

        let templates = query_builder.fetch_all(&self.pool).await?;
        Ok(templates)
    }

    #[instrument(ret, skip(self))]
    async fn get_settings_template(
        &self,
        id: i32,
    ) -> Result<Option<SettingsTemplate>, sqlx::Error> {
        let template =
            sqlx::query_as::<_, SettingsTemplate>("SELECT * FROM settings_templates WHERE id = ?")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(template)
    }

    // Settings Backup

    #[instrument(ret, skip(self))]
    async fn insert_settings_backup(
        &self,
        backup_name: &str,
        backup_type: &str,
        backup_data: &str,
        backup_size: i32,
        user_id: &str,
    ) -> Result<SettingsBackupHistory, sqlx::Error> {
        let backup = sqlx::query_as::<_, SettingsBackupHistory>(
            r#"
            INSERT INTO settings_backup_history (
                backup_name, backup_type, backup_data, backup_size, user_id
            ) VALUES (?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(backup_name)
        .bind(backup_type)
        .bind(backup_data)
        .bind(backup_size)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(backup)
    }

    #[instrument(ret, skip(self))]
    async fn get_settings_backups(
        &self,
        user_id: &str,
    ) -> Result<Vec<SettingsBackupHistory>, sqlx::Error> {
        let backups = sqlx::query_as::<_, SettingsBackupHistory>(
            "SELECT * FROM settings_backup_history WHERE user_id = ? ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(backups)
    }

    #[instrument(ret, skip(self))]
    async fn get_settings_backup_by_id(
        &self,
        id: i32,
    ) -> Result<SettingsBackupHistory, sqlx::Error> {
        let backup = sqlx::query_as::<_, SettingsBackupHistory>(
            "SELECT * FROM settings_backup_history WHERE id = ?",
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(backup)
    }

    #[instrument(ret, skip(self))]
    async fn mark_backup_restored(&self, id: i32) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE settings_backup_history SET restored_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Overview & Audit

    #[instrument(ret, skip(self))]
    async fn get_settings_category_summaries(
        &self,
        user_id: &str,
    ) -> Result<Vec<SettingsCategorySummary>, sqlx::Error> {
        let rows = sqlx::query(
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
        .fetch_all(&self.pool)
        .await?;

        let mut categories = Vec::new();
        for row in rows {
            categories.push(SettingsCategorySummary {
                category: row.try_get("category")?,
                total_settings: row.try_get("total_settings")?,
                user_customized: row.try_get("user_customized")?,
                system_settings: row.try_get("system_settings")?,
                requires_restart: row.try_get("requires_restart")?,
                last_updated: row.try_get("last_updated")?,
            });
        }

        Ok(categories)
    }

    #[instrument(ret, skip(self))]
    async fn get_settings_audit_log(
        &self,
        user_id: &str,
        limit: i32,
    ) -> Result<Vec<SettingsAuditLog>, sqlx::Error> {
        let audits = sqlx::query_as::<_, SettingsAuditLog>(
            r#"
            SELECT * FROM settings_audit_log
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(audits)
    }

    // Reset & Restart

    #[instrument(ret, skip(self))]
    async fn delete_user_preferences_filtered(
        &self,
        user_id: &str,
        category: Option<&str>,
        setting_key: Option<&str>,
    ) -> Result<u64, sqlx::Error> {
        let mut query = "DELETE FROM user_preferences WHERE user_id = ?".to_string();
        let mut params = vec![user_id.to_string()];

        if let Some(category) = category {
            query.push_str(" AND category = ?");
            params.push(category.to_string());
        }

        if let Some(setting_key) = setting_key {
            query.push_str(" AND setting_key = ?");
            params.push(setting_key.to_string());
        }

        let mut query_builder = sqlx::query(&query);
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let result = query_builder.execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    #[instrument(ret, skip(self))]
    async fn get_settings_requiring_restart(
        &self,
        user_id: &str,
    ) -> Result<Vec<String>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT DISTINCT up.category || '.' || up.setting_key as setting_key
            FROM user_preferences up
            JOIN application_settings ast ON ast.category = up.category AND ast.setting_key = up.setting_key
            WHERE up.user_id = ? AND ast.requires_restart = 1
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let mut restart_settings = Vec::new();
        for row in rows {
            let setting_key: String = row.get("setting_key");
            restart_settings.push(setting_key);
        }

        Ok(restart_settings)
    }
}
