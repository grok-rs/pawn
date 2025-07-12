import { Box, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import CountryAutocomplete from '../CountryAutocomplete';
import CustomFormHelperText from '../FormHelperText/FormHelperText';
import { StyledGrid } from './styled';
import { TournamentFormValues } from './types';

const GeneralInfoStep = () => {
  const { t } = useTranslation();

  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<TournamentFormValues>();

  return (
    <Box sx={{ padding: 3, maxWidth: '1200px' }}>
      <StyledGrid container spacing={2}>
        <StyledGrid size={{ mobile: 12, laptop: 12, desktop: 12 }}>
          <TextField
            fullWidth
            label={t('name')}
            {...register('name')}
            error={Boolean(errors.name)}
            helperText={<CustomFormHelperText errorMessage={errors.name} />}    
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 6, desktop: 6 }}>
          <TextField
            fullWidth
            label={t('city')}
            {...register('city')}
            error={Boolean(errors.city)}
            helperText={<CustomFormHelperText errorMessage={errors.city} />}    
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 12, laptop: 6, desktop: 6 }}>
          <CountryAutocomplete
            control={control}
            name="country"
            label={t('country')}
            error={Boolean(errors.country)}
            helperText={<CustomFormHelperText errorMessage={errors.country} />}    
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 6, laptop: 6, desktop: 6 }}>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label={t('start_date')}
                onChange={(date) => field.onChange(date)}
                value={dayjs(field.value)}
              />
            )}
          />
        </StyledGrid>
        <StyledGrid size={{ mobile: 6, laptop: 6, desktop: 6 }}>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label={t('end_date')}
                onChange={(date) => field.onChange(date)}
                value={dayjs(field.value)}
              />
            )}
          />
        </StyledGrid>
      </StyledGrid>
    </Box>
  );
};

export default GeneralInfoStep;
