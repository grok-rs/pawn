import type { FunctionComponent } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { AnyObject, ObjectSchema } from 'yup';

export type FormStepComponentProps<T extends FieldValues = FieldValues> = {
  onCancel?: () => void;
  handleNextStep: (data: T) => void;
  handleDisableSubmitButton: () => void;
};

type StepIntro = {
  title: string;
  description: string;
};

export type FormStepOption<T extends FieldValues = FieldValues> = {
  component: FunctionComponent<FormStepComponentProps<T>>;
  schema?: ObjectSchema<AnyObject>;
  id?: number;
  label?: string;
  stepIntro?: StepIntro;
};

export type FormStepperContextType<T extends FieldValues = FieldValues> = {
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
