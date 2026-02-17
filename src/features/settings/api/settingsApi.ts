import { commands } from '@dto/bindings';
import type {
  CreateUserPreference,
  ApplySettingsTemplateRequest,
  CreateSettingsBackup,
  RestoreSettingsBackup,
  SettingsExportRequest,
  SettingsImportRequest,
  SettingsResetRequest,
  SettingsValidationRequest,
} from '@dto/bindings';

export const getEffectiveSettings = (userId: string, settingKey: string | null) => commands.getEffectiveSettings(userId, settingKey);
export const getSettingsOverview = (userId: string) => commands.getSettingsOverview(userId);
export const getSettingsTemplates = (category: string | null) => commands.getSettingsTemplates(category);
export const getSettingsBackups = (userId: string) => commands.getSettingsBackups(userId);
export const getSettingsRequiringRestart = (userId: string) => commands.getSettingsRequiringRestart(userId);
export const validateSetting = (data: SettingsValidationRequest) => commands.validateSetting(data);
export const createUserPreference = (data: CreateUserPreference) => commands.createUserPreference(data);
export const setLanguageSetting = (userId: string, language: string) => commands.setLanguageSetting(userId, language);
export const setThemeSetting = (userId: string, theme: string) => commands.setThemeSetting(userId, theme);
export const applySettingsTemplate = (data: ApplySettingsTemplateRequest) => commands.applySettingsTemplate(data);
export const createSettingsBackup = (data: CreateSettingsBackup) => commands.createSettingsBackup(data);
export const restoreSettingsBackup = (data: RestoreSettingsBackup) => commands.restoreSettingsBackup(data);
export const exportSettings = (data: SettingsExportRequest) => commands.exportSettings(data);
export const importSettings = (data: SettingsImportRequest) => commands.importSettings(data);
export const resetSettings = (data: SettingsResetRequest) => commands.resetSettings(data);
export const getTimeControlTemplates = () => commands.getTimeControlTemplates();
