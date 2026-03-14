import { CalendarToday, EmojiEvents, LocationOn } from '@mui/icons-material';
import {
  Box,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import CountryAutocomplete from '@shared/ui/CountryAutocomplete';
import CustomFormHelperText from '@shared/ui/FormHelperText';
import dayjs from 'dayjs';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyledGrid } from './styled';
import type { TournamentFormValues } from './types';

const GeneralInfoStep = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<TournamentFormValues>();

  return (
    <Box>
      <StyledGrid container spacing={3}>
        {/* Tournament Name Section */}
        <StyledGrid size={12}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: `${theme.palette.primary.light}10`,
              border: `1px solid ${theme.palette.primary.light}30`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEvents color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.tournamentIdentity')}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label={t('tournamentName')}
              placeholder={t('form.placeholders.tournamentName')}
              {...register('name')}
              error={Boolean(errors.name)}
              helperText={<CustomFormHelperText errorMessage={errors.name} />}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmojiEvents color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                },
              }}
            />
          </Paper>
        </StyledGrid>

        {/* Location Section */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationOn color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.locationDetails')}
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={t('city')}
                  placeholder={t('form.placeholders.enterCityName')}
                  {...register('city')}
                  error={Boolean(errors.city)}
                  helperText={
                    <CustomFormHelperText errorMessage={errors.city} />
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </StyledGrid>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <CountryAutocomplete
                  control={control}
                  name="country"
                  label={t('country.label')}
                  error={Boolean(errors.country)}
                  helperText={
                    <CustomFormHelperText errorMessage={errors.country} />
                  }
                />
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>

        {/* Date Section */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarToday color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t('form.sections.tournamentSchedule')}
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label={t('start_date')}
                      onChange={date => field.onChange(date)}
                      value={dayjs(field.value)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          InputProps: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <CalendarToday color="action" />
                              </InputAdornment>
                            ),
                          },
                        },
                      }}
                    />
                  )}
                />
              </StyledGrid>
              <StyledGrid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label={t('end_date')}
                      onChange={date => field.onChange(date)}
                      value={dayjs(field.value)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          InputProps: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <CalendarToday color="action" />
                              </InputAdornment>
                            ),
                          },
                        },
                      }}
                    />
                  )}
                />
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>
      </StyledGrid>
    </Box>
  );
};

export default GeneralInfoStep;
