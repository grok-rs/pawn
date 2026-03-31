import type { Tournament, UpdateTournament } from '@dto/bindings';
import { commands } from '@dto/bindings';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { parseBackendError } from '@shared/lib/errorUtils';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TournamentEditDialogProps {
  open: boolean;
  onClose: () => void;
  tournament: Tournament;
  onUpdated: () => void;
  minRounds?: number;
}

function TournamentEditDialog({
  open,
  onClose,
  tournament,
  onUpdated,
  minRounds = 0,
}: TournamentEditDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(tournament.name);
  const [location, setLocation] = useState(tournament.location);
  const [date, setDate] = useState(tournament.date);
  const [totalRounds, setTotalRounds] = useState(tournament.total_rounds);
  const [description, setDescription] = useState(tournament.description ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(tournament.website_url ?? '');
  const [contactEmail, setContactEmail] = useState(
    tournament.contact_email ?? ''
  );
  const [entryFee, setEntryFee] = useState(tournament.entry_fee ?? 0);
  const [currency, setCurrency] = useState(tournament.currency ?? 'USD');

  useEffect(() => {
    if (open) {
      setName(tournament.name);
      setLocation(tournament.location);
      setDate(tournament.date);
      setTotalRounds(tournament.total_rounds);
      setDescription(tournament.description ?? '');
      setWebsiteUrl(tournament.website_url ?? '');
      setContactEmail(tournament.contact_email ?? '');
      setEntryFee(tournament.entry_fee ?? 0);
      setCurrency(tournament.currency ?? 'USD');
      setError(null);
    }
  }, [open, tournament]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const data: UpdateTournament = {
        id: tournament.id,
        name: name !== tournament.name ? name : null,
        location: location !== tournament.location ? location : null,
        date: date !== tournament.date ? date : null,
        total_rounds:
          totalRounds !== tournament.total_rounds ? totalRounds : null,
        description:
          description !== (tournament.description ?? '')
            ? description || null
            : null,
        website_url:
          websiteUrl !== (tournament.website_url ?? '')
            ? websiteUrl || null
            : null,
        contact_email:
          contactEmail !== (tournament.contact_email ?? '')
            ? contactEmail || null
            : null,
        entry_fee: entryFee !== (tournament.entry_fee ?? 0) ? entryFee : null,
        currency: currency !== (tournament.currency ?? 'USD') ? currency : null,
      };

      // Check if anything actually changed
      const hasChanges = Object.entries(data).some(
        ([key, val]) => key !== 'id' && val !== null
      );

      if (!hasChanges) {
        onClose();
        return;
      }

      await commands.updateTournament(data);
      onUpdated();
      onClose();
    } catch (err) {
      const errorMessage = parseBackendError(
        err,
        t,
        'tournamentEdit.failedToUpdate'
      );
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle>{t('tournamentEdit.title')}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('tournamentEdit.coreSection')}
          </Typography>

          <TextField
            label={t('tournament.configuration.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            fullWidth
            error={name.trim() === ''}
            helperText={name.trim() === '' ? t('name_cant_be_empty') : ''}
          />

          <TextField
            label={t('tournament.configuration.location')}
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label={t('tournament.configuration.dates')}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label={t('tournament.configuration.numberOfRounds')}
            type="number"
            value={totalRounds}
            onChange={e => setTotalRounds(Number(e.target.value))}
            fullWidth
            slotProps={{
              input: { inputProps: { min: Math.max(1, minRounds) } },
            }}
            helperText={
              minRounds > 0
                ? t('tournamentEdit.minRoundsHelper', { min: minRounds })
                : ''
            }
          />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            {t('tournamentEdit.extraSection')}
          </Typography>

          <TextField
            label={t('tournamentEdit.description')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          <TextField
            label={t('tournamentEdit.websiteUrl')}
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            fullWidth
          />

          <TextField
            label={t('tournamentEdit.contactEmail')}
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('tournamentEdit.entryFee')}
              type="number"
              value={entryFee}
              onChange={e => setEntryFee(Number(e.target.value))}
              slotProps={{ input: { inputProps: { min: 0, step: 0.01 } } }}
              sx={{ flex: 1 }}
            />
            <TextField
              label={t('tournamentEdit.currency')}
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              sx={{ width: 120 }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || name.trim() === ''}
          startIcon={saving ? <CircularProgress size={20} /> : undefined}
        >
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TournamentEditDialog;
