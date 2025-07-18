import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  commands,
  CreateTournamentSeedingSettings,
  GenerateSeedingRequest,
  SeedingPreview,
  SeedingAnalysis,
  BatchUpdatePlayerSeeding,
  UpdatePlayerSeeding,
} from '../../dto/bindings';

const SeedingStep = () => {
  // For now, we don't have access to tournamentId in the form stepper
  // This will be enhanced later when tournament is created during the flow
  const tournamentId: number | undefined = undefined;
  const { t } = useTranslation();
  const { setValue } = useFormContext();

  const [seedingMethod, setSeedingMethod] = useState('rating');
  const [useInitialRating, setUseInitialRating] = useState(true);
  const [randomizeUnrated, setRandomizeUnrated] = useState(false);
  const [protectTopSeeds, setProtectTopSeeds] = useState(4);
  const [seedingPreview, setSeedingPreview] = useState<SeedingPreview[]>([]);
  const [seedingAnalysis, setSeedingAnalysis] =
    useState<SeedingAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);

  // Available seeding methods
  const seedingMethods = [
    { value: 'rating', label: t('seeding.methods.rating') },
    { value: 'random', label: t('seeding.methods.random') },
    { value: 'manual', label: t('seeding.methods.manual') },
    { value: 'category_based', label: t('seeding.methods.categoryBased') },
  ];

  const generateSeedingPreview = async () => {
    if (!tournamentId) {
      console.warn('No tournament ID available for seeding preview');
      return;
    }

    setLoading(true);
    try {
      const request: GenerateSeedingRequest = {
        tournament_id: tournamentId,
        seeding_method: seedingMethod,
        preserve_manual_seeds: seedingMethod === 'manual',
        category_id: null,
      };

      const preview = await commands.generateTournamentSeeding(request);
      setSeedingPreview(preview);
      setPreviewGenerated(true);

      // Also get seeding analysis
      const analysis = await commands.analyzeTournamentSeeding(tournamentId);
      setSeedingAnalysis(analysis);
    } catch (error: unknown) {
      console.error('Failed to generate seeding preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySeedingSettings = async () => {
    if (!tournamentId || !previewGenerated) return;

    setLoading(true);
    try {
      // First, create/update seeding settings
      const settings: CreateTournamentSeedingSettings = {
        tournament_id: tournamentId,
        seeding_method: seedingMethod,
        use_initial_rating: useInitialRating,
        randomize_unrated: randomizeUnrated,
        protect_top_seeds: protectTopSeeds,
      };

      await commands.createTournamentSeedingSettings(settings);

      // Then apply the seeding to players
      const seedingUpdates: UpdatePlayerSeeding[] = seedingPreview.map(
        preview => ({
          player_id: preview.player_id,
          seed_number: preview.proposed_seed,
          pairing_number: null,
          initial_rating: preview.rating,
        })
      );

      const batchUpdate: BatchUpdatePlayerSeeding = {
        tournament_id: tournamentId,
        seeding_updates: seedingUpdates,
      };

      await commands.applyTournamentSeeding(batchUpdate);

      // Store seeding settings in form data
      setValue('seedingSettings', {
        method: seedingMethod,
        useInitialRating,
        randomizeUnrated,
        protectTopSeeds,
        applied: true,
      });

      console.log('Seeding applied successfully');
    } catch (error: unknown) {
      console.error('Failed to apply seeding:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeedingConflictSeverity = (conflictType: string) => {
    switch (conflictType) {
      case 'duplicate_seed':
        return 'error';
      case 'rating_mismatch':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('seeding.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('seeding.description')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('seeding.settings.title')}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <FormControl fullWidth>
              <InputLabel>{t('seeding.method')}</InputLabel>
              <Select
                value={seedingMethod}
                onChange={e => setSeedingMethod(e.target.value)}
                label={t('seeding.method')}
              >
                {seedingMethods.map(method => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="number"
              label={t('seeding.protectTopSeeds')}
              value={protectTopSeeds}
              onChange={e => setProtectTopSeeds(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 32 }}
              helperText={t('seeding.protectTopSeedsHelp')}
            />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useInitialRating}
                  onChange={e => setUseInitialRating(e.target.checked)}
                />
              }
              label={t('seeding.useInitialRating')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={randomizeUnrated}
                  onChange={e => setRandomizeUnrated(e.target.checked)}
                />
              }
              label={t('seeding.randomizeUnrated')}
            />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={generateSeedingPreview}
              disabled={loading || !tournamentId}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {t('seeding.generatePreview')}
            </Button>

            {previewGenerated && (
              <Button
                variant="contained"
                onClick={applySeedingSettings}
                disabled={loading}
                color="primary"
              >
                {t('seeding.applySeeding')}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {seedingAnalysis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('seeding.analysis.title')}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('seeding.analysis.totalPlayers')}
                </Typography>
                <Typography variant="h6">
                  {seedingAnalysis.total_players}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('seeding.analysis.ratedPlayers')}
                </Typography>
                <Typography variant="h6">
                  {seedingAnalysis.rated_players}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('seeding.analysis.unratedPlayers')}
                </Typography>
                <Typography variant="h6">
                  {seedingAnalysis.unrated_players}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('seeding.analysis.manualSeeds')}
                </Typography>
                <Typography variant="h6">
                  {seedingAnalysis.manual_seeds}
                </Typography>
              </Box>
            </Box>

            {seedingAnalysis.rating_range && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('seeding.analysis.ratingRange')}
                </Typography>
                <Typography variant="body1">
                  {seedingAnalysis.rating_range[0]} -{' '}
                  {seedingAnalysis.rating_range[1]}
                  {seedingAnalysis.average_rating && (
                    <>
                      {' '}
                      ({t('seeding.analysis.average')}:{' '}
                      {Math.round(seedingAnalysis.average_rating)})
                    </>
                  )}
                </Typography>
              </Box>
            )}

            {seedingAnalysis.seeding_conflicts.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('seeding.analysis.conflicts')}
                </Typography>
                {seedingAnalysis.seeding_conflicts.map((conflict, index) => (
                  <Alert
                    key={index}
                    severity={
                      getSeedingConflictSeverity(conflict.conflict_type) as
                        | 'error'
                        | 'warning'
                        | 'info'
                    }
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>{conflict.player_name}:</strong>{' '}
                      {conflict.description}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {conflict.suggested_action}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {seedingPreview.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('seeding.preview.title')}
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('seeding.preview.seed')}</TableCell>
                    <TableCell>{t('seeding.preview.player')}</TableCell>
                    <TableCell align="center">
                      {t('seeding.preview.rating')}
                    </TableCell>
                    <TableCell align="center">
                      {t('seeding.preview.playerTitle')}
                    </TableCell>
                    <TableCell align="center">
                      {t('seeding.preview.currentSeed')}
                    </TableCell>
                    <TableCell align="center">
                      {t('seeding.preview.change')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seedingPreview.map(preview => (
                    <TableRow key={preview.player_id}>
                      <TableCell>
                        <Chip
                          label={preview.proposed_seed}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{preview.player_name}</TableCell>
                      <TableCell align="center">
                        {preview.rating || t('common.unrated')}
                      </TableCell>
                      <TableCell align="center">
                        {preview.title && (
                          <Chip
                            label={preview.title}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {preview.current_seed || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {preview.current_seed ? (
                          preview.current_seed !== preview.proposed_seed ? (
                            <Chip
                              label={`${preview.current_seed} → ${preview.proposed_seed}`}
                              size="small"
                              color="warning"
                            />
                          ) : (
                            <Chip
                              label={t('common.noChange')}
                              size="small"
                              color="default"
                            />
                          )
                        ) : (
                          <Chip
                            label={t('common.new')}
                            size="small"
                            color="success"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {!tournamentId && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('seeding.noTournamentWarning')}
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              {t('seeding.previewModeNote')}
            </Typography>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default SeedingStep;
