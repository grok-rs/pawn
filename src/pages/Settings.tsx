import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  EmojiEvents as TournamentIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Save as SaveIcon,
  RestoreFromTrash as RestoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { commands } from '@dto/bindings';
import {
  SettingsOverview,
  SettingsTemplate,
  SettingsBackupHistory,
} from '@dto/bindings';

// All types are now imported from generated bindings

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsOverview, setSettingsOverview] =
    useState<SettingsOverview | null>(null);
  const [templates, setTemplates] = useState<SettingsTemplate[]>([]);
  const [backups, setBackups] = useState<SettingsBackupHistory[]>([]);
  const [pendingRestart, setPendingRestart] = useState<string[]>([]);

  // Dialog states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] =
    useState<SettingsBackupHistory | null>(null);

  // Form states
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState('json');
  const [exportFormat, setExportFormat] = useState('json');
  const [backupName, setBackupName] = useState('');
  const [_searchQuery, _setSearchQuery] = useState('');

  const userId = 'default'; // TODO: Get from auth context

  useEffect(() => {
    loadSettings();
    loadOverview();
    loadTemplates();
    loadBackups();
    loadPendingRestart();
  }, []);

  const loadSettings = async () => {
    try {
      const effectiveSettings = await commands.getEffectiveSettings(
        userId,
        null
      );
      setSettings(effectiveSettings as Record<string, string>);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    }
  };

  const loadOverview = async () => {
    try {
      const overview = await commands.getSettingsOverview(userId);
      setSettingsOverview(overview);
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const templateList = await commands.getSettingsTemplates(null);
      setTemplates(templateList);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadBackups = async () => {
    try {
      const backupList = await commands.getSettingsBackups(userId);
      setBackups(backupList);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const loadPendingRestart = async () => {
    try {
      const restartSettings =
        await commands.getSettingsRequiringRestart(userId);
      setPendingRestart(restartSettings as string[]);
    } catch (err) {
      console.error('Failed to load pending restart settings:', err);
    }
    setLoading(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = async (
    category: string,
    key: string,
    value: string
  ) => {
    try {
      const fullKey = `${category}.${key}`;
      const newSettings = { ...settings, [fullKey]: value };
      setSettings(newSettings);

      // Validate setting
      const validationResult = await commands.validateSetting({
        category,
        setting_key: key,
        setting_value: value,
        setting_type: 'string', // TODO: Get from schema
        validation_schema: null,
      });

      if (!validationResult.is_valid) {
        setError(`Invalid value: ${validationResult.errors.join(', ')}`);
        return;
      }

      // Save preference
      await commands.createUserPreference({
        user_id: userId,
        category,
        setting_key: key,
        setting_value: value,
      });

      setSuccess('Setting updated successfully');

      // Reload pending restart settings
      await loadPendingRestart();
    } catch (err) {
      console.error('Failed to update setting:', err);
      setError('Failed to update setting');
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await commands.setLanguageSetting(userId, language);
      i18n.changeLanguage(language);
      setSuccess('Language updated successfully');
    } catch (err) {
      console.error('Failed to update language:', err);
      setError('Failed to update language');
    }
  };

  const handleThemeChange = async (theme: string) => {
    try {
      await commands.setThemeSetting(userId, theme);
      setSuccess('Theme updated successfully');
    } catch (err) {
      console.error('Failed to update theme:', err);
      setError('Failed to update theme');
    }
  };

  const handleApplyTemplate = async (template: SettingsTemplate) => {
    try {
      setSaving(true);
      await commands.applySettingsTemplate({
        template_id: template.id,
        user_id: userId,
        override_existing: true,
        categories: null,
      });

      await loadSettings();
      await loadOverview();
      setSuccess(`Template "${template.template_name}" applied successfully`);
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError('Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setSaving(true);
      await commands.createSettingsBackup({
        backup_name:
          backupName || `Manual backup ${new Date().toLocaleString()}`,
        backup_type: 'manual',
        user_id: userId,
        categories: null,
      });

      await loadBackups();
      setSuccess('Backup created successfully');
      setBackupDialogOpen(false);
      setBackupName('');
    } catch (err) {
      console.error('Failed to create backup:', err);
      setError('Failed to create backup');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreBackup = async (backup: SettingsBackupHistory) => {
    try {
      setSaving(true);
      await commands.restoreSettingsBackup({
        backup_id: backup.id,
        user_id: userId,
        categories: null,
        create_backup_before_restore: true,
      });

      await loadSettings();
      await loadOverview();
      await loadBackups();
      setSuccess('Settings restored successfully');
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      setError('Failed to restore backup');
    } finally {
      setSaving(false);
    }
  };

  const handleExportSettings = async () => {
    try {
      const exportData = await commands.exportSettings({
        format: exportFormat,
        categories: null,
        user_id: userId,
        include_defaults: null,
        include_system_settings: null,
      });

      // Create download link
      const blob = new Blob([exportData as string], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Settings exported successfully');
      setExportDialogOpen(false);
    } catch (err) {
      console.error('Failed to export settings:', err);
      setError('Failed to export settings');
    }
  };

  const handleImportSettings = async () => {
    try {
      setSaving(true);
      const result = await commands.importSettings({
        format: importFormat,
        data: importData,
        user_id: userId,
        validate_only: false,
        override_existing: true,
        create_backup_before_import: true,
      });

      if (result.success) {
        await loadSettings();
        await loadOverview();
        setSuccess(
          `Settings imported successfully: ${result.imported_count} settings`
        );
        setImportDialogOpen(false);
        setImportData('');
      } else {
        setError(
          `Import failed: ${result.errors.map(e => e.message).join(', ')}`
        );
      }
    } catch (err) {
      console.error('Failed to import settings:', err);
      setError('Failed to import settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async (category?: string) => {
    try {
      setSaving(true);
      const result = await commands.resetSettings({
        category,
        setting_key: null,
        user_id: userId,
        create_backup: true,
      });

      if (result.success) {
        await loadSettings();
        await loadOverview();
        setSuccess(`Reset ${result.reset_count} settings successfully`);
        setResetDialogOpen(false);
      } else {
        setError(`Reset failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (category: string, key: string): string => {
    const fullKey = `${category}.${key}`;
    return settings[fullKey] || '';
  };

  const getSettingValue = (
    category: string,
    key: string,
    defaultValue: string = ''
  ): string => {
    const value = getSetting(category, key);
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1); // Remove quotes
    }
    return value || defaultValue;
  };

  const getBooleanSetting = (
    category: string,
    key: string,
    defaultValue: boolean = false
  ): boolean => {
    const value = getSetting(category, key);
    return value === 'true' || value === '1' || (value === '' && defaultValue);
  };

  const getIntegerSetting = (
    category: string,
    key: string,
    defaultValue: number = 0
  ): number => {
    const value = getSetting(category, key);
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const categories = [
    { id: 'overview', label: 'Overview', icon: <InfoIcon /> },
    { id: 'general', label: 'General', icon: <SettingsIcon /> },
    { id: 'display', label: 'Display', icon: <PaletteIcon /> },
    { id: 'tournament', label: 'Tournament', icon: <TournamentIcon /> },
    { id: 'performance', label: 'Performance', icon: <SpeedIcon /> },
    { id: 'privacy', label: 'Privacy', icon: <SecurityIcon /> },
    { id: 'data', label: 'Data', icon: <StorageIcon /> },
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        {t('settings')}
      </Typography>

      {pendingRestart.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Some settings require application restart to take effect:
          </Typography>
          <Box sx={{ mt: 1 }}>
            {pendingRestart.map(setting => (
              <Chip
                key={setting}
                label={setting}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="settings tabs"
          >
            {categories.map((category, index) => (
              <Tab
                key={category.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {category.icon}
                    {category.label}
                  </Box>
                }
                {...a11yProps(index)}
              />
            ))}
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {settingsOverview && (
              <>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Settings Summary" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total Settings: {settingsOverview.total_settings}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Customized: {settingsOverview.user_customized}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requires Restart:{' '}
                        {settingsOverview.pending_restart ? 'Yes' : 'No'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Quick Actions" />
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<SaveIcon />}
                          onClick={() => setBackupDialogOpen(true)}
                        >
                          Create Backup
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={() => setExportDialogOpen(true)}
                        >
                          Export Settings
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          onClick={() => setImportDialogOpen(true)}
                        >
                          Import Settings
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<RestoreIcon />}
                          onClick={() => setResetDialogOpen(true)}
                        >
                          Reset Settings
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}

            {/* Settings Categories */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Settings Categories" />
                <CardContent>
                  <Grid container spacing={2}>
                    {settingsOverview?.categories.map(category => (
                      <Grid item xs={12} sm={6} md={4} key={category.category}>
                        <Box
                          sx={{
                            p: 2,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="h6" gutterBottom>
                            {category.category}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {category.total_settings} settings
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {category.user_customized} customized
                          </Typography>
                          {category.requires_restart > 0 && (
                            <Badge
                              badgeContent={category.requires_restart}
                              color="warning"
                            >
                              <WarningIcon color="warning" />
                            </Badge>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Templates */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Settings Templates" />
                <CardContent>
                  <Grid container spacing={2}>
                    {templates.map(template => (
                      <Grid item xs={12} sm={6} md={4} key={template.id}>
                        <Box
                          sx={{
                            p: 2,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="h6" gutterBottom>
                            {template.template_name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            paragraph
                          >
                            {template.template_description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Category: {template.template_category}
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleApplyTemplate(template)}
                              disabled={saving}
                            >
                              Apply
                            </Button>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* General Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Language & Localization" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={getSettingValue('general', 'language', 'en')}
                        onChange={e => handleLanguageChange(e.target.value)}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ru">Русский</MenuItem>
                        <MenuItem value="ua">Українська</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={getSettingValue(
                          'general',
                          'date_format',
                          'yyyy-MM-dd'
                        )}
                        onChange={e =>
                          handleSettingChange(
                            'general',
                            'date_format',
                            `"${e.target.value}"`
                          )
                        }
                      >
                        <MenuItem value="yyyy-MM-dd">YYYY-MM-DD</MenuItem>
                        <MenuItem value="MM/dd/yyyy">MM/DD/YYYY</MenuItem>
                        <MenuItem value="dd/MM/yyyy">DD/MM/YYYY</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={getSettingValue('general', 'currency', 'USD')}
                        onChange={e =>
                          handleSettingChange(
                            'general',
                            'currency',
                            `"${e.target.value}"`
                          )
                        }
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                        <MenuItem value="RUB">RUB</MenuItem>
                        <MenuItem value="UAH">UAH</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Display Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Appearance" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <FormControl fullWidth>
                      <InputLabel>Theme</InputLabel>
                      <Select
                        value={getSettingValue('display', 'theme', 'light')}
                        onChange={e => handleThemeChange(e.target.value)}
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="auto">Auto</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Font Size"
                      type="number"
                      value={getIntegerSetting('display', 'font_size', 14)}
                      onChange={e =>
                        handleSettingChange(
                          'display',
                          'font_size',
                          e.target.value
                        )
                      }
                      InputProps={{ inputProps: { min: 10, max: 24 } }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'display',
                            'show_country_flags',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'display',
                              'show_country_flags',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Show Country Flags"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'display',
                            'animations_enabled',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'display',
                              'animations_enabled',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Enable Animations"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tournament Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Tournament Defaults" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <TextField
                      label="Default Rounds"
                      type="number"
                      value={getIntegerSetting(
                        'tournament',
                        'default_rounds',
                        7
                      )}
                      onChange={e =>
                        handleSettingChange(
                          'tournament',
                          'default_rounds',
                          e.target.value
                        )
                      }
                      InputProps={{ inputProps: { min: 3, max: 15 } }}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Default Pairing Method</InputLabel>
                      <Select
                        value={getSettingValue(
                          'tournament',
                          'default_pairing_method',
                          'swiss'
                        )}
                        onChange={e =>
                          handleSettingChange(
                            'tournament',
                            'default_pairing_method',
                            `"${e.target.value}"`
                          )
                        }
                      >
                        <MenuItem value="swiss">Swiss</MenuItem>
                        <MenuItem value="round_robin">Round Robin</MenuItem>
                        <MenuItem value="knockout">Knockout</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'tournament',
                            'auto_pair_rounds',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'tournament',
                              'auto_pair_rounds',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Auto-pair Rounds"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'tournament',
                            'fide_compliance_mode',
                            false
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'tournament',
                              'fide_compliance_mode',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="FIDE Compliance Mode"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Performance Settings" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <TextField
                      label="Cache Size (MB)"
                      type="number"
                      value={getIntegerSetting(
                        'performance',
                        'cache_size_mb',
                        128
                      )}
                      onChange={e =>
                        handleSettingChange(
                          'performance',
                          'cache_size_mb',
                          e.target.value
                        )
                      }
                      InputProps={{ inputProps: { min: 16, max: 1024 } }}
                    />
                    <TextField
                      label="Auto-save Interval (seconds)"
                      type="number"
                      value={getIntegerSetting(
                        'performance',
                        'autosave_interval',
                        30
                      )}
                      onChange={e =>
                        handleSettingChange(
                          'performance',
                          'autosave_interval',
                          e.target.value
                        )
                      }
                      InputProps={{ inputProps: { min: 10, max: 300 } }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'performance',
                            'background_processing',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'performance',
                              'background_processing',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Background Processing"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'performance',
                            'lazy_loading',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'performance',
                              'lazy_loading',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Lazy Loading"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Privacy Tab */}
        <TabPanel value={activeTab} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Privacy Settings" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'privacy',
                            'collect_usage_stats',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'privacy',
                              'collect_usage_stats',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Collect Usage Statistics"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'privacy',
                            'collect_error_reports',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'privacy',
                              'collect_error_reports',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Collect Error Reports"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'privacy',
                            'anonymous_mode',
                            false
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'privacy',
                              'anonymous_mode',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Anonymous Mode"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Data Tab */}
        <TabPanel value={activeTab} index={6}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Data Management" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <FormControl fullWidth>
                      <InputLabel>Backup Frequency</InputLabel>
                      <Select
                        value={getSettingValue(
                          'data',
                          'backup_frequency',
                          'daily'
                        )}
                        onChange={e =>
                          handleSettingChange(
                            'data',
                            'backup_frequency',
                            `"${e.target.value}"`
                          )
                        }
                      >
                        <MenuItem value="never">Never</MenuItem>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Backup Retention (days)"
                      type="number"
                      value={getIntegerSetting('data', 'backup_retention', 30)}
                      onChange={e =>
                        handleSettingChange(
                          'data',
                          'backup_retention',
                          e.target.value
                        )
                      }
                      InputProps={{ inputProps: { min: 1, max: 365 } }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={getBooleanSetting(
                            'data',
                            'compress_backups',
                            true
                          )}
                          onChange={e =>
                            handleSettingChange(
                              'data',
                              'compress_backups',
                              e.target.checked.toString()
                            )
                          }
                        />
                      }
                      label="Compress Backups"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Recent Backups" />
                <CardContent>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    {backups.slice(0, 5).map(backup => (
                      <Box
                        key={backup.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography variant="body2">
                            {backup.backup_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(backup.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setRestoreDialogOpen(true);
                          }}
                        >
                          Restore
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Dialogs */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset all settings to their default values?
            This action cannot be undone (but a backup will be created).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleResetSettings()}
            color="warning"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
      >
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Backup Name"
            fullWidth
            value={backupName}
            onChange={e => setBackupName(e.target.value)}
            placeholder={`Manual backup ${new Date().toLocaleString()}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateBackup} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
      >
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore the backup "
            {selectedBackup?.backup_name}"? Current settings will be backed up
            before restoration.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() =>
              selectedBackup && handleRestoreBackup(selectedBackup)
            }
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      >
        <DialogTitle>Export Settings</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value)}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="yaml">YAML</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExportSettings}>Export</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      >
        <DialogTitle>Import Settings</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={importFormat}
              onChange={e => setImportFormat(e.target.value)}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="yaml">YAML</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Settings Data"
            value={importData}
            onChange={e => setImportData(e.target.value)}
            placeholder="Paste your settings data here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleImportSettings}
            disabled={saving || !importData.trim()}
          >
            {saving ? <CircularProgress size={24} /> : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
