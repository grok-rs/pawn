import { createContext } from 'react';

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
  defaultFormStepperContextValue
);

export default FormStepperContext;
