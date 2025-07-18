-- Rollback comprehensive application settings system
-- This migration removes all application settings tables and related structures

-- Drop triggers first
DROP TRIGGER IF EXISTS audit_user_preferences_changes;
DROP TRIGGER IF EXISTS audit_application_settings_changes;
DROP TRIGGER IF EXISTS update_settings_templates_timestamp;
DROP TRIGGER IF EXISTS update_user_preferences_timestamp;
DROP TRIGGER IF EXISTS update_application_settings_timestamp;

-- Drop indexes
DROP INDEX IF EXISTS idx_settings_audit_created;
DROP INDEX IF EXISTS idx_settings_audit_category;
DROP INDEX IF EXISTS idx_settings_audit_user;
DROP INDEX IF EXISTS idx_settings_backup_type;
DROP INDEX IF EXISTS idx_settings_backup_user;
DROP INDEX IF EXISTS idx_settings_templates_default;
DROP INDEX IF EXISTS idx_settings_templates_category;
DROP INDEX IF EXISTS idx_user_preferences_user_category;
DROP INDEX IF EXISTS idx_user_preferences_category;
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP INDEX IF EXISTS idx_application_settings_category_key;
DROP INDEX IF EXISTS idx_application_settings_key;
DROP INDEX IF EXISTS idx_application_settings_category;

-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS settings_audit_log;
DROP TABLE IF EXISTS settings_backup_history;
DROP TABLE IF EXISTS settings_templates;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS application_settings;