import { FunctionComponent } from 'react';
import { FieldValues } from 'react-hook-form';
import { AnyObject, ObjectSchema } from 'yup';

export type FormStepComponentProps<T extends FieldValues> = {
  onCancel?: () => void;
  handleNextStep: (data: T) => void;
  handleDisableSubmitButton: () => void;
};

type StepIntro = {
  title: string;
  description: string;
};

export type FormStepOption<T extends FieldValues> = {
  component: FunctionComponent<FormStepComponentProps<T>>;
  schema?: ObjectSchema<AnyObject>;
  id?: number;
  label?: string;
  stepIntro?: StepIntro;
};

export type FormStepperContextType<T extends FieldValues> = {
  activeStep: number;
  steps: FormStepOption<T>[];
  isSubmitting?: boolean;
  isSubmitButtonDisabled?: boolean;
  onLastStep?: (data: T) => Promise<void>;
  isLastStep?: boolean;
  isFirstStep?: boolean;
  onSubmit: (data: T) => Promise<void>;
  handleDisableSubmitButton: () => void;
  onCancel?: () => void;
  onStepBack?: () => void;
};
