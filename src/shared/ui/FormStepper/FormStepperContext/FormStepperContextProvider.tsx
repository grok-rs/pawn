import type { ReactNode } from 'react';
import type { FieldValues } from 'react-hook-form';

import type { FormStepperContextType } from '../types';
import FormStepperContext from './FormStepperContext';

type Props<T extends FieldValues = FieldValues> = {
  children: ReactNode;
  value: FormStepperContextType<T>;
};

const FormStepperContextProvider = ({
  children,
  value,
}: Props<FieldValues>) => {
  return (
    <FormStepperContext.Provider value={value}>
      {children}
    </FormStepperContext.Provider>
  );
};

export default FormStepperContextProvider;
