import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { commands } from '@dto/bindings';
import { TiebreakConfig } from '../../components/TiebreakConfig';
import type { TournamentTiebreakConfig, TiebreakType } from '@dto/bindings';

interface TournamentSettingsProps {
  open: boolean;
  onClose: () => void;
  tournamentId: number;
  onSettingsUpdated?: () => void;
}

function TournamentSettings({
  open,
  onClose,
  tournamentId,
  onSettingsUpdated,
}: TournamentSettingsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TournamentTiebreakConfig | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await commands.getTournamentSettings(tournamentId);
      setSettings(result);
    } catch (err) {
      console.error('Failed to fetch tournament settings:', err);
      setError('Failed to load tournament settings');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, fetchSettings]);

  const handleTiebreakChange = (tiebreaks: TiebreakType[]) => {
    if (settings) {
      setSettings({
        ...settings,
        tiebreaks,
      });
      setIsDirty(true);
    }
  };

  const handleFideDefaultsChange = (useFideDefaults: boolean) => {
    if (settings) {
      setSettings({
        ...settings,
        use_fide_defaults: useFideDefaults,
      });
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    try {
      await commands.updateTournamentSettings({
        tournament_id: tournamentId,
        tiebreak_order: settings.tiebreaks,
        use_fide_defaults: settings.use_fide_defaults,
        forfeit_time_minutes: null,
        draw_offers_allowed: null,
        mobile_phone_policy: null,
        default_color_allocation: null,
        late_entry_allowed: null,
        bye_assignment_rule: null,
        arbiter_notes: null,
        tournament_category: null,
        organizer_name: null,
        organizer_email: null,
        prize_structure: null,
      });
      setIsDirty(false);
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save tournament settings:', err);
      setError('Failed to save tournament settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (
        confirm('You have unsaved changes. Are you sure you want to close?')
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          <Typography variant="h6">{t('tournamentSettings')}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : settings ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('tiebreakConfiguration')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('tiebreakConfigDescription')}
            </Typography>
            <TiebreakConfig
              tiebreaks={settings.tiebreaks}
              onChange={handleTiebreakChange}
              useFideDefaults={settings.use_fide_defaults}
              onFideDefaultsChange={handleFideDefaultsChange}
            />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!isDirty || saving}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TournamentSettings;
