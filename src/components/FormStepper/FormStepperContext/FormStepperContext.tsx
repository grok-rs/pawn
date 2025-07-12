import { createContext, useContext } from 'react';
import { FieldValues } from 'react-hook-form';

import { FormStepperContextType } from '../types';

const defaultFormStepperContextValue = {
  activeStep: 0,
  steps: [],
  onSubmit: () => Promise.resolve(),
  handleDisableSubmitButton: () => false,
};

// Type <any> with type assertion has been moved here to omit types assertion through the codebase
// and provide correct type check & generics type usage for FormStepperContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormStepperContext = createContext<FormStepperContextType<any>>(
  defaultFormStepperContextValue,
);

export const useFormStepperContext = <T extends FieldValues>(): FormStepperContextType<T> => {
  const formStepperContext = useContext(FormStepperContext);

  if (!formStepperContext) {
    throw new Error('No form stepper context found!');
  }

  return formStepperContext;
};

export default FormStepperContext;
