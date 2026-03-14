import { createContext } from 'react';
import type { FieldValues } from 'react-hook-form';

import type { FormStepperContextType } from '../types';

// Export a default context
const FormStepperContext = createContext<
  FormStepperContextType<FieldValues> | undefined
>(undefined);

export default FormStepperContext;
