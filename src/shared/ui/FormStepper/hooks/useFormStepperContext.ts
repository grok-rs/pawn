import { useContext } from 'react';
import type { FieldValues } from 'react-hook-form';
import FormStepperContext from '../FormStepperContext/FormStepperContext';
import type { FormStepperContextType } from '../types';

// Create a hook that works with the context
export function useFormStepperContext(): FormStepperContextType<FieldValues> {
  const formStepperContext = useContext(FormStepperContext);

  if (!formStepperContext) {
    throw new Error('No form stepper context found!');
  }

  // Return the context value directly - it's already properly typed
  return formStepperContext;
}
