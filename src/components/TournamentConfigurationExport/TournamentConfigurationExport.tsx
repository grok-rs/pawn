import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Chip,
  Stack,
  IconButton,
  // Tooltip,
} from '@mui/material';
import {
  Download,
  Upload,
  FileCopy,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TournamentFormValues } from '../NewTournamentForm/types';

interface TournamentConfigurationExportProps {
  formData?: TournamentFormValues;
  onImport?: (config: TournamentFormValues) => void;
}

interface TournamentConfiguration {
  version: string;
  exportDate: string;
  config: Partial<TournamentFormValues>;
}

function TournamentConfigurationExport({
  formData,
  onImport,
}: TournamentConfigurationExportProps) {
  const { t } = useTranslation();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');

  const generateExportData = () => {
    if (!formData) return;

    const exportConfig: TournamentConfiguration = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      config: {
        // Exclude non-exportable fields like dates that should be set fresh
        type: formData.type,
        pairingSystem: formData.pairingSystem,
        timeControlTemplate: formData.timeControlTemplate,
        rounds: formData.rounds,
        additionalTime: formData.additionalTime,
        additionalTimeUnit: formData.additionalTimeUnit,
        forfeitTimeMinutes: formData.forfeitTimeMinutes,
        drawOffersPolicy: formData.drawOffersPolicy,
        mobilePhonePolicy: formData.mobilePhonePolicy,
        lateEntryPolicy: formData.lateEntryPolicy,
        organizerName: formData.organizerName,
        organizerEmail: formData.organizerEmail,
        arbiterNotes: formData.arbiterNotes,
      },
    };

    const exportString = JSON.stringify(exportConfig, null, 2);
    setExportText(exportString);
    setExportDialogOpen(true);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tournament-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      setImportError('');
      const parsed = JSON.parse(importText) as TournamentConfiguration;

      // Validate the structure
      if (!parsed.version || !parsed.config) {
        throw new Error('Invalid configuration format');
      }

      // Apply the configuration
      if (onImport) {
        onImport(parsed.config as TournamentFormValues);
      }

      setImportDialogOpen(false);
      setImportText('');
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Invalid JSON format. Please check your configuration.'
      );
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        setImportText(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2}>
        {formData && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={generateExportData}
            size="small"
          >
            {t('tournament.configuration.export')}
          </Button>
        )}

        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => setImportDialogOpen(true)}
          size="small"
        >
          {t('tournament.configuration.import')}
        </Button>
      </Stack>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {t('tournament.configuration.exportTitle')}
            <IconButton onClick={() => setExportDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('tournament.configuration.exportDescription')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Chip
              label={t('tournament.configuration.configurationReady')}
              color="success"
              icon={<CheckCircle />}
              size="small"
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={12}
            value={exportText}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
            }}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCopyToClipboard}
            startIcon={copied ? <CheckCircle /> : <FileCopy />}
            color={copied ? 'success' : 'primary'}
          >
            {copied ? t('common.copied') : t('common.copyToClipboard')}
          </Button>
          <Button
            onClick={handleDownload}
            startIcon={<Download />}
            variant="contained"
          >
            {t('common.download')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {t('tournament.configuration.importTitle')}
            <IconButton onClick={() => setImportDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('tournament.configuration.importDescription')}
          </Typography>

          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="config-file-upload"
            />
            <label htmlFor="config-file-upload">
              <Button
                component="span"
                variant="outlined"
                startIcon={<Upload />}
                size="small"
              >
                {t('tournament.configuration.selectFile')}
              </Button>
            </label>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={12}
            value={importText}
            onChange={e => {
              setImportText(e.target.value);
              setImportError('');
            }}
            placeholder={t('tournament.configuration.pasteConfigurationHere')}
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!importText.trim()}
            variant="contained"
          >
            {t('tournament.configuration.importConfiguration')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TournamentConfigurationExport;
