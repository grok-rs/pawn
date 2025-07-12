import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  Paper,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  EmojiEvents,
  LocationOn,
  CalendarToday,
  Flag,
} from '@mui/icons-material';

import CountryAutocomplete from '../CountryAutocomplete';
import CustomFormHelperText from '../FormHelperText/FormHelperText';
import { StyledGrid } from './styled';
import { TournamentFormValues } from './types';

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
              backgroundColor: theme.palette.primary.light + '10',
              border: `1px solid ${theme.palette.primary.light}30`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEvents color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Tournament Identity
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Tournament Name"
              placeholder="e.g., Spring Chess Championship 2024"
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
                Location Details
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <TextField
                  fullWidth
                  label="City"
                  placeholder="Enter city name"
                  {...register('city')}
                  error={Boolean(errors.city)}
                  helperText={<CustomFormHelperText errorMessage={errors.city} />}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </StyledGrid>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <CountryAutocomplete
                  control={control}
                  name="country"
                  label="Country"
                  error={Boolean(errors.country)}
                  helperText={<CustomFormHelperText errorMessage={errors.country} />}
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
                Tournament Schedule
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="Start Date"
                      onChange={(date) => field.onChange(date)}
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
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label="End Date"
                      onChange={(date) => field.onChange(date)}
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
