import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { commands, GeneratePairingNumbersRequest, Player } from '@dto/bindings';

interface PairingNumbersManagementProps {
  open: boolean;
  onClose: () => void;
  tournamentId: number;
  players: Player[];
  onUpdate: () => void;
}

const PairingNumbersManagement: React.FC<PairingNumbersManagementProps> = ({
  open,
  onClose,
  tournamentId,
  players,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState('sequential');
  const [startNumber, setStartNumber] = useState(1);
  const [preserveExisting, setPreserveExisting] = useState(false);
  const [loading, setLoading] = useState(false);

  const generationMethods = [
    { value: 'sequential', label: t('pairingNumbers.methods.sequential') },
    { value: 'random', label: t('pairingNumbers.methods.random') },
    { value: 'by_seed', label: t('pairingNumbers.methods.bySeed') },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const request: GeneratePairingNumbersRequest = {
        tournament_id: tournamentId,
        method,
        start_number: startNumber,
        preserve_existing: preserveExisting,
      };

      await commands.generatePairingNumbers(request);
      onUpdate();
      onClose();
    } catch (error: unknown) {
      console.error('Failed to generate pairing numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const existingNumbers = players.filter(p => p.pairing_number !== null).length;
  const totalPlayers = players.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      sx={{ '& .MuiDialog-paper': { maxWidth: '600px' } }}
    >
      <DialogTitle>{t('pairingNumbers.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('pairingNumbers.description')}
        </Typography>

        {existingNumbers > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('pairingNumbers.existingWarning', {
              existing: existingNumbers,
              total: totalPlayers,
            })}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>{t('pairingNumbers.method')}</InputLabel>
            <Select
              value={method}
              onChange={e => setMethod(e.target.value)}
              label={t('pairingNumbers.method')}
            >
              {generationMethods.map(methodOption => (
                <MenuItem key={methodOption.value} value={methodOption.value}>
                  {methodOption.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            type="number"
            label={t('pairingNumbers.startNumber')}
            value={startNumber}
            onChange={e => setStartNumber(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            helperText={t('pairingNumbers.startNumberHelp')}
          />

          {existingNumbers > 0 && (
            <FormControlLabel
              control={
                <Switch
                  checked={preserveExisting}
                  onChange={e => setPreserveExisting(e.target.checked)}
                />
              }
              label={t('pairingNumbers.preserveExisting')}
            />
          )}

          {method === 'by_seed' && (
            <Alert severity="warning">
              {t('pairingNumbers.seedMethodWarning')}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {t('pairingNumbers.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PairingNumbersManagement;
