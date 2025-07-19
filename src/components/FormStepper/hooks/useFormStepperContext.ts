import { useContext } from 'react';
import { FieldValues } from 'react-hook-form';
import { FormStepperContextType } from '../types';
import FormStepperContext from '../FormStepperContext/FormStepperContext';

export const useFormStepperContext = <
  T extends FieldValues,
>(): FormStepperContextType<T> => {
  const formStepperContext = useContext(FormStepperContext);

  if (!formStepperContext) {
    throw new Error('No form stepper context found!');
  }

  return formStepperContext;
};
