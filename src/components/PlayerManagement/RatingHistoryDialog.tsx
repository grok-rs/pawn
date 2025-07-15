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
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  // IconButton,
  MenuItem,
  Grid2 as Grid,
  Tabs,
  Tab,
  // List,
  // ListItem,
  // ListItemText,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add,
  History,
  TrendingUp,
  TrendingDown,
  // Remove,
  // Edit,
  Person,
  EmojiEvents,
  Speed,
  Schedule,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { commands } from '../../dto/bindings';
import type {
  Player,
  RatingHistory,
  CreateRatingHistory,
} from '../../dto/bindings';

interface RatingHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  player: Player | null;
}

const ratingSchema = yup.object({
  rating_type: yup.string().required('Rating type is required'),
  rating: yup
    .number()
    .required('Rating is required')
    .min(0, 'Rating must be positive')
    .max(4000, 'Rating must be realistic'),
  is_provisional: yup.boolean(),
  effective_date: yup.mixed().required('Date is required'),
});

type RatingFormData = yup.InferType<typeof ratingSchema>;

const RATING_TYPES = [
  { value: 'fide_standard', label: 'FIDE Standard', icon: <EmojiEvents /> },
  { value: 'fide_rapid', label: 'FIDE Rapid', icon: <Speed /> },
  { value: 'fide_blitz', label: 'FIDE Blitz', icon: <Schedule /> },
  { value: 'national', label: 'National Rating', icon: <Person /> },
  { value: 'club', label: 'Club Rating', icon: <History /> },
  { value: 'uscf', label: 'USCF Rating', icon: <EmojiEvents /> },
  { value: 'elo', label: 'ELO Rating', icon: <TrendingUp /> },
];

const RatingHistoryDialog: React.FC<RatingHistoryDialogProps> = ({
  open,
  onClose,
  player,
}) => {
  const { t } = useTranslation();
  const [ratingHistory, setRatingHistory] = useState<RatingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [_addingRating, setAddingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RatingFormData>({
    resolver: yupResolver(ratingSchema),
    defaultValues: {
      rating_type: '',
      rating: undefined,
      is_provisional: false,
      effective_date: dayjs(),
    },
  });

  useEffect(() => {
    if (open && player) {
      fetchRatingHistory();
    }
  }, [open, player]);

  const fetchRatingHistory = async () => {
    if (!player) return;

    setLoading(true);
    try {
      const history = await commands.getPlayerRatingHistory(player.id);
      setRatingHistory(history);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rating history:', err);
      setError(t('failedToLoadRatingHistory'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitRating = async (data: RatingFormData) => {
    if (!player) return;

    setLoading(true);
    try {
      const ratingData: CreateRatingHistory = {
        player_id: player.id,
        rating_type: data.rating_type,
        rating: data.rating!,
        is_provisional: data.is_provisional || false,
        effective_date: dayjs.isDayjs(data.effective_date)
          ? data.effective_date.format('YYYY-MM-DD')
          : dayjs(data.effective_date as string | Date).format('YYYY-MM-DD'),
      };

      await commands.addPlayerRatingHistory(ratingData);
      await fetchRatingHistory();
      setAddingRating(false);
      reset();
      setError(null);
    } catch (err) {
      console.error('Failed to add rating:', err);
      setError(t('failedToAddRating'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setAddingRating(false);
      setError(null);
      reset();
    }
  };

  const getRatingsByType = () => {
    const groupedRatings: Record<string, RatingHistory[]> = {};
    ratingHistory.forEach(rating => {
      if (!groupedRatings[rating.rating_type]) {
        groupedRatings[rating.rating_type] = [];
      }
      groupedRatings[rating.rating_type].push(rating);
    });

    // Sort by effective date for each type
    Object.keys(groupedRatings).forEach(type => {
      groupedRatings[type].sort(
        (a, b) =>
          new Date(b.effective_date).getTime() -
          new Date(a.effective_date).getTime()
      );
    });

    return groupedRatings;
  };

  const getCurrentRatings = () => {
    const groupedRatings = getRatingsByType();
    const currentRatings: Record<string, RatingHistory> = {};

    Object.keys(groupedRatings).forEach(type => {
      if (groupedRatings[type].length > 0) {
        currentRatings[type] = groupedRatings[type][0]; // Most recent
      }
    });

    return currentRatings;
  };

  const getRatingTrend = (type: string) => {
    const typeRatings = getRatingsByType()[type] || [];
    if (typeRatings.length < 2) return null;

    const latest = typeRatings[0].rating;
    const previous = typeRatings[1].rating;
    const diff = latest - previous;

    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      change: Math.abs(diff),
    };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getRatingTypeInfo = (type: string) => {
    return (
      RATING_TYPES.find(rt => rt.value === type) || {
        value: type,
        label: type.toUpperCase(),
        icon: <History />,
      }
    );
  };

  const groupedRatings = getRatingsByType();
  const currentRatings = getCurrentRatings();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={false} fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History />
          {t('ratingHistory')} - {player?.name}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {player && (
          <>
            {/* Current Ratings Overview */}
            <Typography variant="h6" gutterBottom>
              {t('currentRatings')}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {Object.keys(currentRatings).length === 0 ? (
                <Grid size={12}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <History
                        sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                      />
                      <Typography variant="body1" color="text.secondary">
                        {t('noRatingHistory')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                Object.entries(currentRatings).map(([type, rating]) => {
                  const typeInfo = getRatingTypeInfo(type);
                  const trend = getRatingTrend(type);

                  return (
                    <Grid
                      size={{ mobile: 12, tablet: 6, laptop: 4 }}
                      key={type}
                    >
                      <Card variant="outlined">
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            {typeInfo.icon}
                            <Typography variant="subtitle2">
                              {typeInfo.label}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography variant="h4" color="primary">
                              {rating.rating}
                            </Typography>
                            {rating.is_provisional && (
                              <Chip
                                label={t('provisional')}
                                size="small"
                                color="warning"
                              />
                            )}
                            {trend && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                {trend.direction === 'up' ? (
                                  <TrendingUp
                                    color="success"
                                    fontSize="small"
                                  />
                                ) : trend.direction === 'down' ? (
                                  <TrendingDown
                                    color="error"
                                    fontSize="small"
                                  />
                                ) : null}
                                {trend.change > 0 && (
                                  <Typography
                                    variant="caption"
                                    color={
                                      trend.direction === 'up'
                                        ? 'success.main'
                                        : 'error.main'
                                    }
                                  >
                                    {trend.direction === 'up' ? '+' : '-'}
                                    {trend.change}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('asOf')} {formatDate(rating.effective_date)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Tabs for History and Add Rating */}
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              aria-label="rating management tabs"
              sx={{ mb: 2 }}
            >
              <Tab
                icon={<History />}
                label={t('history')}
                iconPosition="start"
              />
              <Tab icon={<Add />} label={t('addRating')} iconPosition="start" />
            </Tabs>

            {/* Tab Panel 0: History */}
            {tabValue === 0 && (
              <Box>
                {Object.keys(groupedRatings).length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    {t('noRatingHistoryFound')}
                  </Typography>
                ) : (
                  Object.entries(groupedRatings).map(([type, ratings]) => {
                    const typeInfo = getRatingTypeInfo(type);
                    return (
                      <Card key={type} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 2,
                            }}
                          >
                            {typeInfo.icon}
                            <Typography variant="h6">
                              {typeInfo.label}
                            </Typography>
                            <Chip
                              label={`${ratings.length} ${t('entries')}`}
                              size="small"
                            />
                          </Box>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>{t('rating')}</TableCell>
                                  <TableCell>{t('date')}</TableCell>
                                  <TableCell>{t('status')}</TableCell>
                                  <TableCell>{t('change')}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {ratings.map((rating, index) => {
                                  const previousRating = ratings[index + 1];
                                  const change = previousRating
                                    ? rating.rating - previousRating.rating
                                    : null;

                                  return (
                                    <TableRow key={rating.id}>
                                      <TableCell>
                                        <Typography variant="subtitle2">
                                          {rating.rating}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        {formatDate(rating.effective_date)}
                                      </TableCell>
                                      <TableCell>
                                        {rating.is_provisional ? (
                                          <Chip
                                            label={t('provisional')}
                                            size="small"
                                            color="warning"
                                          />
                                        ) : (
                                          <Chip
                                            label={t('established')}
                                            size="small"
                                            color="success"
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {change !== null && (
                                          <Box
                                            sx={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 0.5,
                                            }}
                                          >
                                            {change > 0 ? (
                                              <TrendingUp
                                                color="success"
                                                fontSize="small"
                                              />
                                            ) : change < 0 ? (
                                              <TrendingDown
                                                color="error"
                                                fontSize="small"
                                              />
                                            ) : null}
                                            <Typography
                                              variant="body2"
                                              color={
                                                change > 0
                                                  ? 'success.main'
                                                  : change < 0
                                                    ? 'error.main'
                                                    : 'text.secondary'
                                              }
                                            >
                                              {change > 0 ? '+' : ''}
                                              {change}
                                            </Typography>
                                          </Box>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </Box>
            )}

            {/* Tab Panel 1: Add Rating */}
            {tabValue === 1 && (
              <Box component="form" onSubmit={handleSubmit(onSubmitRating)}>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Typography variant="h6" gutterBottom>
                      {t('addNewRating')}
                    </Typography>
                  </Grid>

                  <Grid size={{ mobile: 12, tablet: 6 }}>
                    <Controller
                      name="rating_type"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          select
                          label={t('ratingType')}
                          error={!!errors.rating_type}
                          helperText={errors.rating_type?.message}
                          required
                        >
                          {RATING_TYPES.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                {type.icon}
                                {type.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid size={{ mobile: 12, tablet: 6 }}>
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
                          required
                          value={field.value || ''}
                          onChange={e =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={{ mobile: 12, tablet: 6 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <Controller
                        name="effective_date"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            {...field}
                            label={t('effectiveDate')}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                error: !!errors.effective_date,
                                helperText: errors.effective_date?.message,
                              },
                            }}
                            maxDate={dayjs()}
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>

                  <Grid size={{ mobile: 12, tablet: 6 }}>
                    <Controller
                      name="is_provisional"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox {...field} checked={field.value} />
                          }
                          label={t('provisionalRating')}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={12}>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        startIcon={
                          loading ? <CircularProgress size={16} /> : <Add />
                        }
                      >
                        {t('addRating')}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RatingHistoryDialog;
