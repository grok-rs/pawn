-- Add comprehensive application settings system
-- This migration adds tables for application-wide settings including user preferences,
-- system configuration, and default settings templates

-- Application settings table for global configuration
CREATE TABLE application_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,             -- Setting category (general, display, tournament, performance, privacy)
    setting_key TEXT NOT NULL,          -- Setting identifier (language, theme, default_time_control, etc.)
    setting_value TEXT,                 -- JSON value for the setting
    setting_type TEXT NOT NULL CHECK (setting_type IN (
        'string', 'integer', 'float', 'boolean', 'json', 'array'
    )),
    default_value TEXT,                 -- Default value for the setting
    description TEXT,                   -- Human-readable description
    validation_schema TEXT,             -- JSON schema for validation
    requires_restart BOOLEAN NOT NULL DEFAULT 0,
    is_user_configurable BOOLEAN NOT NULL DEFAULT 1,
    display_order INTEGER DEFAULT 0,   -- Order for UI display
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, setting_key)       -- Unique setting keys per category
);

-- User preferences table for personalized settings
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',  -- Support for future multi-user functionality
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    is_custom BOOLEAN NOT NULL DEFAULT 1,     -- Whether this overrides default
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, setting_key)
);

-- Settings templates for quick configuration
CREATE TABLE settings_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL UNIQUE,
    template_description TEXT,
    template_category TEXT NOT NULL,    -- tournament, display, performance, etc.
    template_data TEXT NOT NULL,       -- JSON data for the template
    is_system_template BOOLEAN NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings backup/restore history
CREATE TABLE settings_backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL CHECK (backup_type IN (
        'manual', 'automatic', 'migration', 'template'
    )),
    backup_data TEXT NOT NULL,          -- JSON snapshot of settings
    backup_size INTEGER,                -- Size in bytes
    user_id TEXT NOT NULL DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    restored_at DATETIME,               -- When this backup was restored
    is_active BOOLEAN NOT NULL DEFAULT 1
);

-- Settings audit log for tracking changes
CREATE TABLE settings_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT NOT NULL CHECK (change_type IN (
        'create', 'update', 'delete', 'reset', 'import', 'restore'
    )),
    change_source TEXT NOT NULL CHECK (change_source IN (
        'ui', 'api', 'migration', 'template', 'backup_restore', 'system'
    )),
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default application settings
INSERT INTO application_settings (category, setting_key, setting_value, setting_type, default_value, description, display_order) VALUES
-- General Settings
('general', 'language', '"en"', 'string', '"en"', 'Application language', 1),
('general', 'date_format', '"yyyy-MM-dd"', 'string', '"yyyy-MM-dd"', 'Date format preference', 2),
('general', 'time_format', '"HH:mm"', 'string', '"HH:mm"', 'Time format preference', 3),
('general', 'timezone', '"UTC"', 'string', '"UTC"', 'Application timezone', 4),
('general', 'currency', '"USD"', 'string', '"USD"', 'Currency for prize money', 5),
('general', 'number_format', '"en-US"', 'string', '"en-US"', 'Number formatting locale', 6),

-- Display Settings
('display', 'theme', '"light"', 'string', '"light"', 'Application theme', 1),
('display', 'font_size', '14', 'integer', '14', 'Base font size in pixels', 2),
('display', 'font_family', '"Roboto"', 'string', '"Roboto"', 'Application font family', 3),
('display', 'layout_density', '"comfortable"', 'string', '"comfortable"', 'UI layout density', 4),
('display', 'show_country_flags', 'true', 'boolean', 'true', 'Show country flags for players', 5),
('display', 'show_player_photos', 'true', 'boolean', 'true', 'Show player photos when available', 6),
('display', 'rating_display_format', '"standard"', 'string', '"standard"', 'Rating display format', 7),
('display', 'animations_enabled', 'true', 'boolean', 'true', 'Enable UI animations', 8),
('display', 'high_contrast_mode', 'false', 'boolean', 'false', 'Enable high contrast mode', 9),

-- Tournament Defaults
('tournament', 'default_time_control', '1', 'integer', '1', 'Default time control template ID', 1),
('tournament', 'default_pairing_method', '"swiss"', 'string', '"swiss"', 'Default pairing method', 2),
('tournament', 'default_tiebreak_system', '"buchholz"', 'string', '"buchholz"', 'Default tiebreak system', 3),
('tournament', 'default_rounds', '7', 'integer', '7', 'Default number of rounds', 4),
('tournament', 'auto_pair_rounds', 'true', 'boolean', 'true', 'Automatically pair next round', 5),
('tournament', 'confirm_game_results', 'true', 'boolean', 'true', 'Require confirmation for game results', 6),
('tournament', 'allow_late_entries', 'false', 'boolean', 'false', 'Allow late player entries', 7),
('tournament', 'fide_compliance_mode', 'false', 'boolean', 'false', 'Enable FIDE compliance checking', 8),

-- Performance Settings
('performance', 'cache_size_mb', '128', 'integer', '128', 'Cache size in megabytes', 1),
('performance', 'autosave_interval', '30', 'integer', '30', 'Auto-save interval in seconds', 2),
('performance', 'database_vacuum_frequency', '7', 'integer', '7', 'Database vacuum frequency in days', 3),
('performance', 'memory_limit_mb', '512', 'integer', '512', 'Memory usage limit in MB', 4),
('performance', 'background_processing', 'true', 'boolean', 'true', 'Enable background processing', 5),
('performance', 'lazy_loading', 'true', 'boolean', 'true', 'Enable lazy loading for large datasets', 6),
('performance', 'batch_size', '100', 'integer', '100', 'Batch size for bulk operations', 7),

-- Privacy Settings
('privacy', 'collect_usage_stats', 'true', 'boolean', 'true', 'Collect anonymous usage statistics', 1),
('privacy', 'collect_error_reports', 'true', 'boolean', 'true', 'Collect error reports for debugging', 2),
('privacy', 'share_tournament_data', 'false', 'boolean', 'false', 'Share tournament data with FIDE', 3),
('privacy', 'data_retention_days', '365', 'integer', '365', 'Data retention period in days', 4),
('privacy', 'anonymous_mode', 'false', 'boolean', 'false', 'Enable anonymous mode', 5),

-- Security Settings
('security', 'session_timeout', '480', 'integer', '480', 'Session timeout in minutes', 1),
('security', 'auto_lock_enabled', 'false', 'boolean', 'false', 'Enable automatic screen lock', 2),
('security', 'auto_lock_timeout', '15', 'integer', '15', 'Auto-lock timeout in minutes', 3),
('security', 'encrypt_backups', 'true', 'boolean', 'true', 'Encrypt backup files', 4),
('security', 'secure_connection_only', 'true', 'boolean', 'true', 'Only allow secure connections', 5),

-- Data Management
('data', 'backup_frequency', '"daily"', 'string', '"daily"', 'Automatic backup frequency', 1),
('data', 'backup_retention', '30', 'integer', '30', 'Backup retention period in days', 2),
('data', 'export_format', '"csv"', 'string', '"csv"', 'Default export format', 3),
('data', 'import_validation_level', '"strict"', 'string', '"strict"', 'Import validation level', 4),
('data', 'compress_backups', 'true', 'boolean', 'true', 'Compress backup files', 5);

-- Insert default settings templates
INSERT INTO settings_templates (template_name, template_description, template_category, template_data, is_system_template, is_default) VALUES
('FIDE Tournament', 'FIDE-compliant tournament settings', 'tournament', 
'{"fide_compliance_mode": true, "confirm_game_results": true, "default_tiebreak_system": "buchholz", "allow_late_entries": false}', 
1, 0),
('Club Tournament', 'Standard club tournament settings', 'tournament',
'{"allow_late_entries": true, "auto_pair_rounds": true, "confirm_game_results": false, "default_rounds": 5}',
1, 1),
('Speed Chess', 'Settings optimized for rapid/blitz tournaments', 'tournament',
'{"auto_pair_rounds": true, "confirm_game_results": false, "default_rounds": 7}',
1, 0),
('Dark Theme', 'Dark mode display settings', 'display',
'{"theme": "dark", "high_contrast_mode": false, "animations_enabled": true}',
1, 0),
('High Performance', 'Settings optimized for large tournaments', 'performance',
'{"cache_size_mb": 256, "lazy_loading": true, "batch_size": 200, "background_processing": true}',
1, 0),
('Privacy Focused', 'Maximum privacy settings', 'privacy',
'{"collect_usage_stats": false, "collect_error_reports": false, "anonymous_mode": true}',
1, 0);

-- Indexes for performance optimization
CREATE INDEX idx_application_settings_category ON application_settings(category);
CREATE INDEX idx_application_settings_key ON application_settings(setting_key);
CREATE INDEX idx_application_settings_category_key ON application_settings(category, setting_key);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(category);
CREATE INDEX idx_user_preferences_user_category ON user_preferences(user_id, category);
CREATE INDEX idx_settings_templates_category ON settings_templates(template_category);
CREATE INDEX idx_settings_templates_default ON settings_templates(is_default);
CREATE INDEX idx_settings_backup_user ON settings_backup_history(user_id);
CREATE INDEX idx_settings_backup_type ON settings_backup_history(backup_type);
CREATE INDEX idx_settings_audit_user ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_category ON settings_audit_log(category);
CREATE INDEX idx_settings_audit_created ON settings_audit_log(created_at);

-- Update triggers for settings tables
CREATE TRIGGER update_application_settings_timestamp
AFTER UPDATE ON application_settings
FOR EACH ROW
BEGIN
    UPDATE application_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_user_preferences_timestamp
AFTER UPDATE ON user_preferences
FOR EACH ROW
BEGIN
    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_settings_templates_timestamp
AFTER UPDATE ON settings_templates
FOR EACH ROW
BEGIN
    UPDATE settings_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Audit trigger for application settings changes
CREATE TRIGGER audit_application_settings_changes
AFTER UPDATE ON application_settings
FOR EACH ROW
BEGIN
    INSERT INTO settings_audit_log (
        category, setting_key, old_value, new_value, 
        change_type, change_source
    ) VALUES (
        NEW.category, NEW.setting_key, OLD.setting_value, NEW.setting_value,
        'update', 'system'
    );
END;

-- Audit trigger for user preferences changes
CREATE TRIGGER audit_user_preferences_changes
AFTER UPDATE ON user_preferences
FOR EACH ROW
BEGIN
    INSERT INTO settings_audit_log (
        user_id, category, setting_key, old_value, new_value, 
        change_type, change_source
    ) VALUES (
        NEW.user_id, NEW.category, NEW.setting_key, OLD.setting_value, NEW.setting_value,
        'update', 'ui'
    );
END;