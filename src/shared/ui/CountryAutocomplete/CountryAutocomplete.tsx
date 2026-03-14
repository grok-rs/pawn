import { Autocomplete, TextField } from '@mui/material';
import type { ReactNode } from 'react';
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { countries } from './constants';

interface CountryAutocompleteProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: boolean;
  helperText?: string | ReactNode;
}

function CountryAutocomplete<T extends FieldValues>({
  control,
  name,
  label,
  error,
  helperText,
}: CountryAutocompleteProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Autocomplete
          {...field}
          options={countries}
          getOptionLabel={option => option.label}
          onChange={(_, value) => field.onChange(value ? value.label : '')}
          value={countries.find(c => c.label === field.value) || null}
          renderInput={params => (
            <TextField
              {...params}
              label={label}
              error={error}
              helperText={helperText}
            />
          )}
          fullWidth
        />
      )}
    />
  );
}

export default CountryAutocomplete;
