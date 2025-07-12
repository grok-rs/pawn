import { ReactNode } from 'react';
import { FieldValues } from 'react-hook-form';

import { FormStepperContextType } from '../types';
import FormStepperContext from './FormStepperContext';

type Props<T extends FieldValues> = {
  children: ReactNode;
  value: FormStepperContextType<T>;
};

const FormStepperContextProvider = <T extends FieldValues>({ children, value }: Props<T>) => {
  return <FormStepperContext.Provider value={value}>{children}</FormStepperContext.Provider>;
};

export default FormStepperContextProvider;
