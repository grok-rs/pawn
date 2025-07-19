import { InputAdornment, MenuItem, Select } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import CustomFormHelperText from '../FormHelperText/FormHelperText';
import { StyledTextField } from './styled';

interface TimeInputWithUnitsProps {
  label: string;
  inputName: string;
  unitName: string;
  error?: string;
  defaultUnit: string;
  unitOptions: { value: string; label: string }[];
}

const TimeInputWithUnits = ({
  label,
  inputName,
  unitName,
  error,
  defaultUnit,
  unitOptions,
}: TimeInputWithUnitsProps) => {
  const { t } = useTranslation();
  const { register } = useFormContext();

  return (
    <StyledTextField
      fullWidth
      label={t(label)}
      type="number"
      {...register(inputName)}
      error={Boolean(error)}
      helperText={<CustomFormHelperText errorMessage={error} />}
      slotProps={{
        input: {
          inputProps: {
            min: 0,
          },
          endAdornment: (
            <InputAdornment position="end">
              <Select defaultValue={defaultUnit} {...register(unitName)}>
                {unitOptions.map(unit => (
                  <MenuItem key={unit.value} value={unit.value}>
                    {t(unit.label)}
                  </MenuItem>
                ))}
              </Select>
            </InputAdornment>
          ),
        },
      }}
      required
    />
  );
};

export default TimeInputWithUnits;
