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
  CompareArrows,
} from '@mui/icons-material';
import { useState } from 'react';
import type { TiebreakType } from '../../dto/bindings';

import CustomFormHelperText from '../FormHelperText/FormHelperText';
import TimeInputWithUnits from '../TimeInputWithUnits/TimeInputWithUnits';
import { StyledGrid } from './styled';
import { TournamentFormValues } from './types';
import { TiebreakConfig } from '../TiebreakConfig';

const ConfigurationStep = () => {
  const { t } = useTranslation();
  const [tiebreaks, setTiebreaks] = useState<TiebreakType[]>([
    'buchholz_full',
    'buchholz_cut_1',
    'number_of_wins',
    'direct_encounter',
  ]);
  const [useFideDefaults, setUseFideDefaults] = useState(true);

  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<TournamentFormValues>();

  const timeUnitOptions = [
    { value: 'seconds', label: 'tournament.timeUnits.seconds.label' },
    { value: 'minutes', label: 'tournament.timeUnits.minutes.label' },
    { value: 'hours', label: 'tournament.timeUnits.hours.label' },
    { value: 'days', label: 'tournament.timeUnits.days.label' },
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
                {t("form.sections.tournamentOfficials")}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label={t("tournament.configuration.mainReferee")}
              placeholder={t("form.placeholders.enterArbiterName")}
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
                {t("form.sections.tournamentFormat")}
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <FormControl fullWidth error={Boolean(errors.type)}>
                  <InputLabel>{t("tournament.configuration.type")}</InputLabel>
                  <Select
                    defaultValue="rapid"
                    {...register('type', { required: true })}
                    label={t("tournament.configuration.type")}
                    startAdornment={
                      <InputAdornment position="start">
                        <Speed color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="rapid">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>{t("tournament.types.rapid")}</span>
                        <Chip label={t("tournament.types.rapid.timeRange")} size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                    <MenuItem value="classical">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>{t("tournament.types.classic")}</span>
                        <Chip label={t("tournament.types.classical.timeRange")} size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                    <MenuItem value="blitz">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>{t("tournament.types.blitz")}</span>
                        <Chip label={t("tournament.types.blitz.timeRange")} size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                  </Select>
                  <CustomFormHelperText errorMessage={errors.type} />
                </FormControl>
              </StyledGrid>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <FormControl fullWidth error={Boolean(errors.pairingSystem)}>
                  <InputLabel>{t("tournament.configuration.pairingSystem")}</InputLabel>
                  <Select
                    defaultValue="swiss"
                    {...register('pairingSystem', { required: true })}
                    label={t("tournament.configuration.pairingSystem")}
                    startAdornment={
                      <InputAdornment position="start">
                        <ViewModule color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="swiss">
                      <Box>
                        <Typography>{t("tournament.pairingSystems.swiss")}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("tournament.pairingSystems.swiss.description")}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="roundRobin">
                      <Box>
                        <Typography>{t("tournament.pairingSystems.roundRobin")}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("tournament.pairingSystems.roundRobin.description")}
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
                {t("form.sections.timeControlSettings")}
              </Typography>
            </Box>
            <StyledGrid container spacing={2}>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <TimeInputWithUnits
                  label={t("tournament.configuration.mainTime")}
                  inputName="mainTime"
                  unitName="mainTimeUnit"
                  error={errors.mainTime}
                  defaultUnit="minutes"
                  unitOptions={timeUnitOptions}
                />
              </StyledGrid>
              <StyledGrid size={{ mobile: 12, laptop: 6 }}>
                <TimeInputWithUnits
                  label={t("tournament.configuration.additionalTime")}
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
                {t("form.sections.tournamentStructure")}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label={t("tournament.configuration.numberOfRounds")}
              type="number"
              {...register('rounds', { min: 1 })}
              error={Boolean(errors.rounds)}
              helperText={
                errors.rounds ? (
                  <CustomFormHelperText errorMessage={errors.rounds} />
                ) : (
                  selectedPairingSystem === 'swiss' 
                    ? t('form.helpers.swissRounds')
                    : t('form.helpers.roundRobinRounds')
                )
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

        {/* Tiebreak Settings */}
        <StyledGrid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CompareArrows color="primary" />
              <Typography variant="h6" fontWeight={600}>
                {t("tiebreakSettings")}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("tiebreakConfiguration")}
            </Typography>
            <TiebreakConfig
              tiebreaks={tiebreaks}
              onChange={setTiebreaks}
              useFideDefaults={useFideDefaults}
              onFideDefaultsChange={setUseFideDefaults}
            />
          </Paper>
        </StyledGrid>
      </StyledGrid>
    </Box>
  );
};

export default ConfigurationStep;

