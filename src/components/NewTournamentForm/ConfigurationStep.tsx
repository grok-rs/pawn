import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import {  useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import CustomFormHelperText from '../FormHelperText/FormHelperText';
import TimeInputWithUnits from '../TimeInputWithUnits/TimeInputWithUnits';
import { StyledGrid } from './styled';
import { TournamentFormValues } from './types';

const ConfigurationStep = () => {
  const { t } = useTranslation();

  const {
    register,
    formState: { errors },
  } = useFormContext<TournamentFormValues>();

  const timeUnitOptions = [
    { value: 'seconds', label: 'tournament.timeUnits.seconds' },
    { value: 'minutes', label: 'tournament.timeUnits.minutes' },
    { value: 'hours', label: 'tournament.timeUnits.hours' },
    { value: 'days', label: 'tournament.timeUnits.days' },
  ];

  return (
    <Box sx={{ padding: 3, maxWidth: '1200px' }}>
      <StyledGrid container spacing={2}>
        <StyledGrid size={{ mobile: 12, laptop: 12, desktop: 12 }}>
          <TextField
            fullWidth
            label={t('tournament.configuration.mainReferee')}
            {...register('mainReferee')}
            error={Boolean(errors.mainReferee)}
            helperText={<CustomFormHelperText errorMessage={errors.mainReferee} />}    
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 12, desktop: 12 }}>
          <FormControl fullWidth error={Boolean(errors.type)}>
            <InputLabel>{t('tournament.configuration.type')}</InputLabel>
            <Select
              defaultValue="rapid"
              {...register('type', { required: true })}
              label={t('tournament.configuration.type')}
            >
              <MenuItem value="rapid">{t('tournament.types.rapid')}</MenuItem>
              <MenuItem value="classical">{t('tournament.types.classic')}</MenuItem>
              <MenuItem value="blitz">{t('tournament.types.blitz')}</MenuItem>
            </Select>
            <CustomFormHelperText errorMessage={errors.type} />
          </FormControl>
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 6, desktop: 6 }}>
          <TimeInputWithUnits
            label={t('tournament.configuration.mainTime')}
            inputName="mainTime"
            unitName="mainTimeUnit"
            error={errors.mainTime}
            defaultUnit="minutes"
            unitOptions={timeUnitOptions}
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 6, desktop: 6 }}>
          <TimeInputWithUnits
            label="tournament.configuration.additionalTime"
            inputName="additionalTime"
            unitName="additionalTimeUnit"
            error={errors.additionalTime}
            defaultUnit="seconds"
            unitOptions={timeUnitOptions}
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 6, desktop: 6 }}>
          <Select
            defaultValue="swiss"
            {...register('pairingSystem', { required: true })}
            label={t('tournament.configuration.pairingSystem')}
            fullWidth
          >
            <MenuItem value="swiss">{t('tournament.pairingSystems.swiss')}</MenuItem>
            <MenuItem value="roundRobin">{t('tournament.pairingSystems.roundRobin')}</MenuItem>
          </Select>
          <CustomFormHelperText errorMessage={errors.pairingSystem} />
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 6, desktop: 6 }}>
          <TextField
            fullWidth
            label={t('tournament.configuration.numberOfRounds')}
            type="number"
            {...register('rounds', { min: 1 })}  // Minimum value of 1
            error={Boolean(errors.rounds)}
            helperText={<CustomFormHelperText errorMessage={errors.rounds} />}
            slotProps={{
              input: {
                inputProps: {
              min: 1,

                }
            }}}
          />
        </StyledGrid>
      </StyledGrid>
    </Box>
  );
};

export default ConfigurationStep;

