import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  Chip,
  useTheme,
} from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Person,
  Timer,
  EmojiEvents,
  ViewModule,
  Numbers,
  Speed,
} from '@mui/icons-material';

import CustomFormHelperText from '../FormHelperText/FormHelperText';
import TimeInputWithUnits from '../TimeInputWithUnits/TimeInputWithUnits';
import { StyledGrid } from './styled';
import { TournamentFormValues } from './types';

const ConfigurationStep = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<TournamentFormValues>();

  const timeUnitOptions = [
    { value: 'seconds', label: 'Seconds' },
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' },
  ];

  const selectedPairingSystem = watch('pairingSystem');

  return (
    <Box>
      <StyledGrid container spacing={3}>
        {/* Tournament Officials */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Person color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Tournament Officials
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Main Arbiter / Referee"
              placeholder="Enter arbiter name"
              {...register('mainReferee')}
              error={Boolean(errors.mainReferee)}
              helperText={<CustomFormHelperText errorMessage={errors.mainReferee} />}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </StyledGrid>

        {/* Tournament Format */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEvents color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Tournament Format
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <FormControl fullWidth error={Boolean(errors.type)}>
                  <InputLabel>Tournament Type</InputLabel>
                  <Select
                    defaultValue="rapid"
                    {...register('type', { required: true })}
                    label="Tournament Type"
                    startAdornment={
                      <InputAdornment position="start">
                        <Speed color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="rapid">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>Rapid</span>
                        <Chip label="15-60 min" size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                    <MenuItem value="classical">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>Classical</span>
                        <Chip label="60+ min" size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                    <MenuItem value="blitz">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>Blitz</span>
                        <Chip label="3-15 min" size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                  </Select>
                  <CustomFormHelperText errorMessage={errors.type} />
                </FormControl>
              </StyledGrid>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <FormControl fullWidth error={Boolean(errors.pairingSystem)}>
                  <InputLabel>Pairing System</InputLabel>
                  <Select
                    defaultValue="swiss"
                    {...register('pairingSystem', { required: true })}
                    label="Pairing System"
                    startAdornment={
                      <InputAdornment position="start">
                        <ViewModule color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="swiss">
                      <Box>
                        <Typography>Swiss System</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Best for large tournaments
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="roundRobin">
                      <Box>
                        <Typography>Round Robin</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Everyone plays everyone
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                  <CustomFormHelperText errorMessage={errors.pairingSystem} />
                </FormControl>
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>
        {/* Time Control Settings */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Timer color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Time Control Settings
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <TimeInputWithUnits
                  label="Main Time"
                  inputName="mainTime"
                  unitName="mainTimeUnit"
                  error={errors.mainTime}
                  defaultUnit="minutes"
                  unitOptions={timeUnitOptions}
                />
              </StyledGrid>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <TimeInputWithUnits
                  label="Increment per Move"
                  inputName="additionalTime"
                  unitName="additionalTimeUnit"
                  error={errors.additionalTime}
                  defaultUnit="seconds"
                  unitOptions={timeUnitOptions}
                />
              </StyledGrid>
            </StyledGrid>
          </Paper>
        </StyledGrid>

        {/* Tournament Structure */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Numbers color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Tournament Structure
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Number of Rounds"
              type="number"
              {...register('rounds', { min: 1 })}
              error={Boolean(errors.rounds)}
              helperText={
                <CustomFormHelperText
                  errorMessage={errors.rounds}
                  helperText={selectedPairingSystem === 'swiss' 
                    ? 'Recommended: 7-9 rounds for Swiss system'
                    : 'Round Robin: Each player plays everyone once'
                  }
                />
              }
              slotProps={{
                input: {
                  inputProps: {
                    min: 1,
                    max: 99,
                  },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Numbers color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Paper>
        </StyledGrid>
      </StyledGrid>
    </Box>
  );
};

export default ConfigurationStep;

