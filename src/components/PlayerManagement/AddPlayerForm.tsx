import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Dayjs } from 'dayjs';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid2 as Grid,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { commands } from '../../dto/bindings';
import type { CreatePlayer, UpdatePlayer, Player } from '../../dto/bindings';

interface AddPlayerFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: number;
  editingPlayer?: Player | null;
}

// Chess titles
const CHESS_TITLES = [
  'GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM',
  'NM', 'CM', 'FM', 'Expert', 'Class A', 'Class B', 'Class C', 'Class D'
];

// Common countries
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'RU', name: 'Russia' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'PL', name: 'Poland' },
  { code: 'NO', name: 'Norway' },
  { code: 'SE', name: 'Sweden' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
];

const schema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  rating: yup.number().nullable().min(0, 'Rating must be positive').max(4000, 'Rating must be realistic'),
  country_code: yup.string().nullable(),
  title: yup.string().nullable(),
  birth_date: yup.mixed().nullable().test('is-valid-date', 'Birth date cannot be in the future', function(value) {
    if (!value) return true;
    return dayjs.isDayjs(value) && (value.isBefore(dayjs(), 'day') || value.isSame(dayjs(), 'day'));
  }),
  gender: yup.string().nullable().oneOf(['M', 'F', 'O'], 'Invalid gender'),
  email: yup.string().nullable().email('Invalid email format'),
  phone: yup.string().nullable(),
  club: yup.string().nullable(),
});

type FormData = yup.InferType<typeof schema>;

const AddPlayerForm: React.FC<AddPlayerFormProps> = ({
  open,
  onClose,
  onSuccess,
  tournamentId,
  editingPlayer,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      rating: null,
      country_code: '',
      title: '',
      birth_date: null,
      gender: '',
      email: '',
      phone: '',
      club: '',
    },
  });

  useEffect(() => {
    if (editingPlayer) {
      reset({
        name: editingPlayer.name,
        rating: editingPlayer.rating,
        country_code: editingPlayer.country_code || '',
        title: editingPlayer.title || '',
        birth_date: editingPlayer.birth_date ? dayjs(editingPlayer.birth_date) : null,
        gender: editingPlayer.gender || '',
        email: editingPlayer.email || '',
        phone: editingPlayer.phone || '',
        club: editingPlayer.club || '',
      });
    } else {
      reset({
        name: '',
        rating: null,
        country_code: '',
        title: '',
        birth_date: null,
        gender: '',
        email: '',
        phone: '',
        club: '',
      });
    }
  }, [editingPlayer, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      if (editingPlayer) {
        // Update existing player
        const updateData: UpdatePlayer = {
          player_id: editingPlayer.id,
          name: data.name || null,
          rating: data.rating ?? null,
          country_code: data.country_code || null,
          title: data.title || null,
          birth_date: data.birth_date && dayjs.isDayjs(data.birth_date) ? data.birth_date.format('YYYY-MM-DD') : null,
          gender: data.gender || null,
          email: data.email || null,
          phone: data.phone || null,
          club: data.club || null,
          status: null, // Don't change status
        };
        await commands.updatePlayer(updateData);
      } else {
        // Create new player
        const createData: CreatePlayer = {
          tournament_id: tournamentId,
          name: data.name!,
          rating: data.rating ?? null,
          country_code: data.country_code || null,
          title: data.title || null,
          birth_date: data.birth_date && dayjs.isDayjs(data.birth_date) ? data.birth_date.format('YYYY-MM-DD') : null,
          gender: data.gender || null,
          email: data.email || null,
          phone: data.phone || null,
          club: data.club || null,
        };
        await commands.createPlayerEnhanced(createData);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save player:', err);
      setError(editingPlayer ? t('failedToUpdatePlayer') : t('failedToCreatePlayer'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={false} fullWidth sx={{ '& .MuiDialog-paper': { maxWidth: '800px' } }}>
      <DialogTitle>
        {editingPlayer ? t('editPlayer') : t('addNewPlayer')}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={2}>
              {/* Basic Information */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom>
                  {t('basicInformation')}
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
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                      select
                      label={t('chessTitle')}
                      value={field.value || ''}
                    >
                      <MenuItem value="">{t('noTitle')}</MenuItem>
                      {CHESS_TITLES.map((title) => (
                        <MenuItem key={title} value={title}>
                          {title}
                        </MenuItem>
                      ))}
                    </TextField>
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
                      select
                      label={t('country')}
                      value={field.value || ''}
                    >
                      <MenuItem value="">{t('selectCountry')}</MenuItem>
                      {COUNTRIES.map((country) => (
                        <MenuItem key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              {/* Personal Information */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  {t('personalInformation')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid size={{ mobile: 12, tablet: 6 }}>
                <Controller
                  name="birth_date"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label={t('birthDate')}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.birth_date,
                          helperText: errors.birth_date?.message,
                        },
                      }}
                      maxDate={dayjs()}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ mobile: 12, tablet: 6 }}>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label={t('gender')}
                      value={field.value || ''}
                    >
                      <MenuItem value="">{t('selectGender')}</MenuItem>
                      <MenuItem value="M">{t('male')}</MenuItem>
                      <MenuItem value="F">{t('female')}</MenuItem>
                      <MenuItem value="O">{t('other')}</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              {/* Contact Information */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  {t('contactInformation')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
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
            </Grid>
          </Box>
        </LocalizationProvider>
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
          {editingPlayer ? t('updatePlayer') : t('addPlayer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPlayerForm;