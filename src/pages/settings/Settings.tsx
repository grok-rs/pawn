import {
  commands,
  type SettingsBackupHistory,
  type SettingsOverview,
  type SettingsTemplate,
} from '@dto/bindings';
import {
  Download as DownloadIcon,
  Info as InfoIcon,
  Palette as PaletteIcon,
  RestoreFromTrash as RestoreIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  EmojiEvents as TournamentIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import BaseLayout from '@shared/layouts/BaseLayout';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

function Settings() {
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

  const loadSettings = useCallback(async () => {
    try {
      const effectiveSettings = await commands.getEffectiveSettings(
        userId,
        null
      );
      const settingsData = effectiveSettings ?? {};
      const settingsObject: Record<string, string> = {};

      for (const [key, value] of Object.entries(settingsData)) {
        settingsObject[key] =
          typeof value === 'string' ? value : String(value ?? '');
      }

      setSettings(settingsObject);
    } catch (_err) {
      setError(t('settingsPage.messages.failedToLoad'));
    }
  }, [t]);

  const loadOverview = useCallback(async () => {
    try {
      const overview = await commands.getSettingsOverview(userId);
      setSettingsOverview(overview);
    } catch (_err) {}
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const templateList = await commands.getSettingsTemplates(null);
      setTemplates(templateList);
    } catch (_err) {}
  }, []);

  const loadBackups = useCallback(async () => {
    try {
      const backupList = await commands.getSettingsBackups(userId);
      setBackups(backupList);
    } catch (_err) {}
  }, []);

  const loadPendingRestart = useCallback(async () => {
    try {
      const restartSettings =
        await commands.getSettingsRequiringRestart(userId);
      setPendingRestart(restartSettings);
    } catch (_err) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
    loadOverview();
    loadTemplates();
    loadBackups();
    loadPendingRestart();
  }, [
    loadSettings,
    loadOverview,
    loadTemplates,
    loadBackups,
    loadPendingRestart,
  ]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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
        setError(
          t('settingsPage.messages.invalidValue', {
            errors: validationResult.errors.join(', '),
          })
        );
        return;
      }

      // Save preference
      await commands.createUserPreference({
        user_id: userId,
        category,
        setting_key: key,
        setting_value: value,
      });

      setSuccess(t('settingsPage.messages.settingUpdated'));

      // Reload pending restart settings
      await loadPendingRestart();
    } catch (_err) {
      setError(t('settingsPage.messages.failedToUpdate'));
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await commands.setLanguageSetting(userId, language);
      i18n.changeLanguage(language);
      setSuccess(t('settingsPage.messages.languageUpdated'));
    } catch (_err) {
      setError(t('settingsPage.messages.failedToUpdateLanguage'));
    }
  };

  const handleThemeChange = async (theme: string) => {
    try {
      await commands.setThemeSetting(userId, theme);
      setSuccess(t('settingsPage.messages.themeUpdated'));
    } catch (_err) {
      setError(t('settingsPage.messages.failedToUpdateTheme'));
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
      setSuccess(
        t('settingsPage.messages.templateApplied', {
          name: template.template_name,
        })
      );
    } catch (_err) {
      setError(t('settingsPage.messages.failedToApplyTemplate'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setSaving(true);
      await commands.createSettingsBackup({
        backup_name:
          backupName ||
          t('settingsPage.dialogs.backupPlaceholder', {
            date: new Date().toLocaleString(),
          }),
        backup_type: 'manual',
        user_id: userId,
        categories: null,
      });

      await loadBackups();
      setSuccess(t('settingsPage.messages.backupCreated'));
      setBackupDialogOpen(false);
      setBackupName('');
    } catch (_err) {
      setError(t('settingsPage.messages.failedToCreateBackup'));
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
      setSuccess(t('settingsPage.messages.settingsRestored'));
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    } catch (_err) {
      setError(t('settingsPage.messages.failedToRestore'));
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
      const blob = new Blob([exportData], {
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

      setSuccess(t('settingsPage.messages.settingsExported'));
      setExportDialogOpen(false);
    } catch (_err) {
      setError(t('settingsPage.messages.failedToExport'));
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
          t('settingsPage.messages.settingsImported', {
            count: result.imported_count,
          })
        );
        setImportDialogOpen(false);
        setImportData('');
      } else {
        setError(
          t('settingsPage.messages.importFailed', {
            errors: result.errors.map(e => e.message).join(', '),
          })
        );
      }
    } catch (_err) {
      setError(t('settingsPage.messages.failedToImport'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async (category?: string) => {
    try {
      setSaving(true);
      const result = await commands.resetSettings({
        category: category ?? null,
        setting_key: null,
        user_id: userId,
        create_backup: true,
      });

      if (result.success) {
        await loadSettings();
        await loadOverview();
        setSuccess(
          t('settingsPage.messages.resetSuccess', { count: result.reset_count })
        );
        setResetDialogOpen(false);
      } else {
        setError(
          t('settingsPage.messages.resetFailed', {
            errors: result.errors.join(', '),
          })
        );
      }
    } catch (_err) {
      setError(t('settingsPage.messages.failedToReset'));
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
    return Number.isNaN(parsed) ? defaultValue : parsed;
  };

  const categories = [
    {
      id: 'overview',
      label: t('settingsPage.tabs.overview'),
      icon: <InfoIcon />,
    },
    {
      id: 'general',
      label: t('settingsPage.tabs.general'),
      icon: <SettingsIcon />,
    },
    {
      id: 'display',
      label: t('settingsPage.tabs.display'),
      icon: <PaletteIcon />,
    },
    {
      id: 'tournament',
      label: t('settingsPage.tabs.tournament'),
      icon: <TournamentIcon />,
    },
    {
      id: 'performance',
      label: t('settingsPage.tabs.performance'),
      icon: <SpeedIcon />,
    },
    {
      id: 'privacy',
      label: t('settingsPage.tabs.privacy'),
      icon: <SecurityIcon />,
    },
    { id: 'data', label: t('settingsPage.tabs.data'), icon: <StorageIcon /> },
  ];

  if (loading) {
    return (
      <Container maxWidth={false} sx={{ py: 4 }}>
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
    <BaseLayout>
      <Container maxWidth={false} sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          {t('settings')}
        </Typography>

        {pendingRestart.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t('settingsPage.messages.restartRequired')}
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardHeader
                        title={t('settingsPage.overview.settingsSummary')}
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          {t('settingsPage.overview.totalSettings', {
                            count: settingsOverview.total_settings,
                          })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('settingsPage.overview.customized', {
                            count: settingsOverview.user_customized,
                          })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('settingsPage.overview.requiresRestart')}{' '}
                          {settingsOverview.pending_restart
                            ? t('common.yes')
                            : t('common.no')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardHeader
                        title={t('settingsPage.overview.quickActions')}
                      />
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
                            {t('settingsPage.actions.createBackup')}
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => setExportDialogOpen(true)}
                          >
                            {t('settingsPage.actions.exportSettings')}
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            onClick={() => setImportDialogOpen(true)}
                          >
                            {t('settingsPage.actions.importSettings')}
                          </Button>
                          <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<RestoreIcon />}
                            onClick={() => setResetDialogOpen(true)}
                          >
                            {t('settingsPage.actions.resetSettings')}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}

              {/* Settings Categories */}
              <Grid size={12}>
                <Card>
                  <CardHeader
                    title={t('settingsPage.overview.settingsCategories')}
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      {settingsOverview?.categories.map(category => (
                        <Grid
                          size={{ xs: 12, sm: 6, md: 4 }}
                          key={category.category}
                        >
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
                              {t('settingsPage.overview.settingsCount', {
                                count: category.total_settings,
                              })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('settingsPage.overview.customizedCount', {
                                count: category.user_customized,
                              })}
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
              <Grid size={12}>
                <Card>
                  <CardHeader
                    title={t('settingsPage.overview.settingsTemplates')}
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      {templates.map(template => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
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
                              {t('settingsPage.overview.category', {
                                category: template.template_category,
                              })}
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleApplyTemplate(template)}
                                disabled={saving}
                              >
                                {t('settingsPage.actions.apply')}
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader
                    title={t('settingsPage.general.languageLocalization')}
                  />
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <FormControl fullWidth>
                        <InputLabel>
                          {t('settingsPage.general.language')}
                        </InputLabel>
                        <Select
                          label={t('settingsPage.general.language')}
                          value={getSettingValue('general', 'language', 'en')}
                          onChange={e => handleLanguageChange(e.target.value)}
                        >
                          <MenuItem value="en">
                            {t('settingsPage.languages.en')}
                          </MenuItem>
                          <MenuItem value="ru">
                            {t('settingsPage.languages.ru')}
                          </MenuItem>
                          <MenuItem value="ua">
                            {t('settingsPage.languages.ua')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel>
                          {t('settingsPage.general.dateFormat')}
                        </InputLabel>
                        <Select
                          label={t('settingsPage.general.dateFormat')}
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
                        <InputLabel>
                          {t('settingsPage.general.currency')}
                        </InputLabel>
                        <Select
                          label={t('settingsPage.general.currency')}
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title={t('settingsPage.display.appearance')} />
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <FormControl fullWidth>
                        <InputLabel>
                          {t('settingsPage.display.theme')}
                        </InputLabel>
                        <Select
                          label={t('settingsPage.display.theme')}
                          value={getSettingValue('display', 'theme', 'light')}
                          onChange={e => handleThemeChange(e.target.value)}
                        >
                          <MenuItem value="light">
                            {t('settingsPage.display.themeLight')}
                          </MenuItem>
                          <MenuItem value="dark">
                            {t('settingsPage.display.themeDark')}
                          </MenuItem>
                          <MenuItem value="auto">
                            {t('settingsPage.display.themeAuto')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label={t('settingsPage.display.fontSize')}
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
                        label={t('settingsPage.display.showCountryFlags')}
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
                        label={t('settingsPage.display.enableAnimations')}
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader
                    title={t('settingsPage.tournament.tournamentDefaults')}
                  />
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <TextField
                        label={t('settingsPage.tournament.defaultRounds')}
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
                        <InputLabel>
                          {t('settingsPage.tournament.defaultPairingMethod')}
                        </InputLabel>
                        <Select
                          label={t(
                            'settingsPage.tournament.defaultPairingMethod'
                          )}
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
                          <MenuItem value="swiss">
                            {t('settingsPage.tournament.swiss')}
                          </MenuItem>
                          <MenuItem value="round_robin">
                            {t('settingsPage.tournament.roundRobin')}
                          </MenuItem>
                          <MenuItem value="knockout">
                            {t('settingsPage.tournament.knockout')}
                          </MenuItem>
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
                        label={t('settingsPage.tournament.autoPairRounds')}
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
                        label={t('settingsPage.tournament.fideComplianceMode')}
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title={t('settingsPage.performance.title')} />
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <TextField
                        label={t('settingsPage.performance.cacheSizeMb')}
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
                        label={t('settingsPage.performance.autoSaveInterval')}
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
                        label={t(
                          'settingsPage.performance.backgroundProcessing'
                        )}
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
                        label={t('settingsPage.performance.lazyLoading')}
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title={t('settingsPage.privacy.title')} />
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
                        label={t('settingsPage.privacy.collectUsageStats')}
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
                        label={t('settingsPage.privacy.collectErrorReports')}
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
                        label={t('settingsPage.privacy.anonymousMode')}
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title={t('settingsPage.data.dataManagement')} />
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <FormControl fullWidth>
                        <InputLabel>
                          {t('settingsPage.data.backupFrequency')}
                        </InputLabel>
                        <Select
                          label={t('settingsPage.data.backupFrequency')}
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
                          <MenuItem value="never">
                            {t('settingsPage.data.never')}
                          </MenuItem>
                          <MenuItem value="daily">
                            {t('settingsPage.data.daily')}
                          </MenuItem>
                          <MenuItem value="weekly">
                            {t('settingsPage.data.weekly')}
                          </MenuItem>
                          <MenuItem value="monthly">
                            {t('settingsPage.data.monthly')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label={t('settingsPage.data.backupRetention')}
                        type="number"
                        value={getIntegerSetting(
                          'data',
                          'backup_retention',
                          30
                        )}
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
                        label={t('settingsPage.data.compressBackups')}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title={t('settingsPage.data.recentBackups')} />
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
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
                            {t('settingsPage.actions.restore')}
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
        <Dialog
          open={resetDialogOpen}
          onClose={() => setResetDialogOpen(false)}
        >
          <DialogTitle>{t('settingsPage.dialogs.resetTitle')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('settingsPage.dialogs.resetConfirmation')}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => handleResetSettings()}
              color="warning"
              disabled={saving}
            >
              {saving ? (
                <CircularProgress size={24} />
              ) : (
                t('settingsPage.actions.reset')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={backupDialogOpen}
          onClose={() => setBackupDialogOpen(false)}
        >
          <DialogTitle>
            {t('settingsPage.dialogs.createBackupTitle')}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={t('settingsPage.dialogs.backupName')}
              fullWidth
              value={backupName}
              onChange={e => setBackupName(e.target.value)}
              placeholder={t('settingsPage.dialogs.backupPlaceholder', {
                date: new Date().toLocaleString(),
              })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBackupDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateBackup} disabled={saving}>
              {saving ? (
                <CircularProgress size={24} />
              ) : (
                t('settingsPage.actions.create')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={restoreDialogOpen}
          onClose={() => setRestoreDialogOpen(false)}
        >
          <DialogTitle>
            {t('settingsPage.dialogs.restoreBackupTitle')}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t('settingsPage.dialogs.restoreConfirmation', {
                name: selectedBackup?.backup_name,
              })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRestoreDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() =>
                selectedBackup && handleRestoreBackup(selectedBackup)
              }
              disabled={saving}
            >
              {saving ? (
                <CircularProgress size={24} />
              ) : (
                t('settingsPage.actions.restore')
              )}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
        >
          <DialogTitle>{t('settingsPage.dialogs.exportTitle')}</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>{t('settingsPage.dialogs.format')}</InputLabel>
              <Select
                label={t('settingsPage.dialogs.format')}
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
            <Button onClick={() => setExportDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleExportSettings}>
              {t('settingsPage.actions.export')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
        >
          <DialogTitle>{t('settingsPage.dialogs.importTitle')}</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>{t('settingsPage.dialogs.format')}</InputLabel>
              <Select
                label={t('settingsPage.dialogs.format')}
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
              label={t('settingsPage.dialogs.settingsData')}
              value={importData}
              onChange={e => setImportData(e.target.value)}
              placeholder={t('settingsPage.dialogs.pasteHere')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImportSettings}
              disabled={saving || !importData.trim()}
            >
              {saving ? (
                <CircularProgress size={24} />
              ) : (
                t('settingsPage.actions.import')
              )}
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
    </BaseLayout>
  );
}

export default Settings;
