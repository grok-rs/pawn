import { useContext } from 'react';
import { FieldValues } from 'react-hook-form';
import { FormStepperContextType } from '../types';
import FormStepperContext from '../FormStepperContext/FormStepperContext';

// Create a hook that works with the context
export function useFormStepperContext(): FormStepperContextType<FieldValues> {
  const formStepperContext = useContext(FormStepperContext);

  if (!formStepperContext) {
    throw new Error('No form stepper context found!');
  }

  // Return the context value directly - it's already properly typed
  return formStepperContext;
}
