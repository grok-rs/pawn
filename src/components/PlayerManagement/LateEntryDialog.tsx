import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid2 as Grid,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Warning,
  Info,
  Person,
  Schedule,
  EmojiEvents,
} from '@mui/icons-material';
import { commands } from '../../dto/bindings';
import type {
  CreatePlayer,
  Round,
  TournamentDetails,
} from '../../dto/bindings';

interface LateEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: number;
  tournamentDetails: TournamentDetails | null;
}

const lateEntrySchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  rating: yup
    .number()
    .nullable()
    .min(0, 'Rating must be positive')
    .max(4000, 'Rating must be realistic'),
  country_code: yup.string().nullable(),
  title: yup.string().nullable(),
  email: yup.string().nullable().email('Invalid email format'),
  phone: yup.string().nullable(),
  club: yup.string().nullable(),
  apply_penalties: yup.boolean(),
  start_from_round: yup.number().min(1, 'Starting round must be at least 1'),
});

type LateEntryFormData = yup.InferType<typeof lateEntrySchema>;

const LateEntryDialog: React.FC<LateEntryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  tournamentId,
  tournamentDetails,
}) => {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LateEntryFormData>({
    resolver: yupResolver(lateEntrySchema),
    defaultValues: {
      name: '',
      rating: null,
      country_code: '',
      title: '',
      email: '',
      phone: '',
      club: '',
      apply_penalties: true,
      start_from_round: 1,
    },
  });

  const applyPenalties = watch('apply_penalties');
  const startFromRound = watch('start_from_round');

  useEffect(() => {
    if (open && tournamentId) {
      fetchRounds();
    }
  }, [open, tournamentId]);

  useEffect(() => {
    if (rounds.length > 0) {
      const nextRound =
        rounds.find(r => r.status === 'Upcoming') || rounds[rounds.length - 1];
      if (nextRound) {
        reset(prev => ({ ...prev, start_from_round: nextRound.round_number }));
      }
    }
  }, [rounds, reset]);

  const fetchRounds = async () => {
    try {
      const roundsData = await commands.getRoundsByTournament(tournamentId);
      setRounds(roundsData);
    } catch (err) {
      console.error('Failed to fetch rounds:', err);
      setError(t('failedToLoadRounds'));
    }
  };

  const onSubmit = async (data: LateEntryFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Create the player with late entry status
      const playerData: CreatePlayer = {
        tournament_id: tournamentId,
        name: data.name,
        rating: data.rating ?? null,
        country_code: data.country_code || null,
        title: data.title || null,
        birth_date: null,
        gender: null,
        email: data.email || null,
        phone: data.phone || null,
        club: data.club || null,
      };

      const newPlayer = await commands.createPlayerEnhanced(playerData);

      // Set player status to late entry
      await commands.updatePlayerStatus(newPlayer.id, 'late_entry');

      // TODO: Handle missed rounds and penalties
      // This would require additional backend logic to:
      // 1. Calculate points for missed rounds (usually 0 or bye points)
      // 2. Update pairings for future rounds
      // 3. Apply any tournament-specific late entry rules

      onSuccess();
    } catch (err) {
      console.error('Failed to add late entry:', err);
      setError(t('failedToAddLateEntry'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
      reset();
    }
  };

  const getCompletedRounds = () => {
    return rounds.filter(r => r.status === 'Completed');
  };

  const getMissedRounds = () => {
    return rounds.filter(r => r.round_number < startFromRound);
  };

  const calculatePenalty = () => {
    if (!applyPenalties) return 0;
    const missedRounds = getMissedRounds();
    // Standard penalty: 0 points for each missed round
    return missedRounds.length * 0;
  };

  const tournament = tournamentDetails?.tournament;
  const completedRounds = getCompletedRounds();
  const missedRounds = getMissedRounds();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={false} fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person />
          {t('addLateEntry')}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tournament Status Warning */}
        {completedRounds.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('lateEntryWarning')}
            </Typography>
            <Typography variant="body2">
              {t('tournamentInProgress', {
                completed: completedRounds.length,
                total: tournament?.total_rounds || 0,
              })}
            </Typography>
          </Alert>
        )}

        {/* Tournament Info */}
        {tournament && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {tournament.name}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule fontSize="small" />
                    <Typography variant="body2">
                      {t('rounds')}: {tournament.rounds_played}/
                      {tournament.total_rounds}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents fontSize="small" />
                    <Typography variant="body2">
                      {t('players')}: {tournamentDetails.players.length}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            {/* Player Information */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                {t('playerInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 8 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('fullName')}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 4 }}>
              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('rating')}
                    type="number"
                    error={!!errors.rating}
                    helperText={errors.rating?.message}
                    value={field.value || ''}
                    onChange={e =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                )}
              />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('chessTitle')}
                    value={field.value || ''}
                  />
                )}
              />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Controller
                name="country_code"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('countryCode')}
                    value={field.value || ''}
                  />
                )}
              />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('email')}
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    value={field.value || ''}
                  />
                )}
              />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('phone')}
                    value={field.value || ''}
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="club"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('clubOrFederation')}
                    value={field.value || ''}
                  />
                )}
              />
            </Grid>

            {/* Late Entry Options */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                {t('lateEntryOptions')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid size={{ mobile: 12, tablet: 6 }}>
              <Controller
                name="start_from_round"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('startFromRound')}
                    type="number"
                    error={!!errors.start_from_round}
                    helperText={errors.start_from_round?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="apply_penalties"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} checked={field.value} />}
                    label={t('applyStandardPenalties')}
                  />
                )}
              />
            </Grid>

            {/* Impact Summary */}
            {missedRounds.length > 0 && (
              <Grid size={12}>
                <Card variant="outlined" sx={{ bgcolor: 'warning.50' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      <Info sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {t('lateEntryImpact')}
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Warning fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t('missedRounds', {
                            count: missedRounds.length,
                          })}
                          secondary={missedRounds
                            .map(r => `Round ${r.round_number}`)
                            .join(', ')}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <EmojiEvents fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t('pointsPenalty', {
                            penalty: calculatePenalty(),
                          })}
                          secondary={
                            applyPenalties
                              ? t('standardPenaltyApplied')
                              : t('noPenaltyApplied')
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {t('addLateEntry')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LateEntryDialog;
