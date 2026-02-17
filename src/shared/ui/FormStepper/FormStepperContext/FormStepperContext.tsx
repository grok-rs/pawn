import { createContext } from 'react';
import { FieldValues } from 'react-hook-form';

import { FormStepperContextType } from '../types';

// Export a default context
const FormStepperContext = createContext<
  FormStepperContextType<FieldValues> | undefined
>(undefined);

export default FormStepperContext;
