import { yupResolver } from '@hookform/resolvers/yup';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  type DefaultValues,
  type FieldValues,
  FormProvider,
  type UseFormProps,
  useForm,
} from 'react-hook-form';

import FormStepperContent from './FormStepperContent';
import FormStepperContextProvider from './FormStepperContext';
import FormStepperIntro from './FormStepperIntro';
import FormStepperNavigation from './FormStepperNavigation';
import FormStepperStepIndicator from './FormStepperStepIndicator';
import StyledForm from './styled';
import type { FormStepOption } from './types';

type Props = {
  steps: FormStepOption<FieldValues>[];
  defaultValues?: DefaultValues<FieldValues>;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onLastStep: (data: FieldValues) => Promise<void>;
  children?: ReactNode;
};

// Helper type to ensure proper typing throughout
type FormData = FieldValues;

const FormStepperComponent = ({
  steps,
  defaultValues,
  onLastStep,
  isSubmitting,
  onCancel,
  children,
}: Props) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSubmitButtonDisabled, setIsSubmitButtonDisabled] =
    useState<boolean>(false);

  const isLastStep = activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;

  const activeSchema = steps[activeStep].schema;

  // Create form options using useMemo to avoid recreating on each render
  const formOptions = useMemo<UseFormProps<FormData>>(() => {
    const baseOptions: UseFormProps<FormData> = {
      defaultValues: defaultValues || {},
    };

    if (activeSchema) {
      // When schema exists, add the resolver
      // yupResolver returns a resolver for FieldValues which is compatible
      return {
        ...baseOptions,
        resolver: yupResolver(activeSchema),
      };
    }

    return baseOptions;
  }, [defaultValues, activeSchema]);

  // Use the form with the computed options
  // This avoids conditional hook calls and type conflicts
  const methods = useForm<FormData>(formOptions);

  const { clearErrors: clearFormErrors } = methods;

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (isLastStep) {
        await onLastStep(data);
      } else {
        setActiveStep(prev => prev + 1);
      }
    },
    [onLastStep, isLastStep]
  );

  const handleDisableSubmitButton = useCallback(
    () => setIsSubmitButtonDisabled(true),
    []
  );

  const onStepBack = useCallback(() => {
    if (activeStep !== 0) {
      setActiveStep(prev => prev - 1);
      clearFormErrors();
    }
  }, [activeStep, clearFormErrors]);

  const contextValue = {
    steps,
    onLastStep,
    isLastStep,
    isFirstStep,
    onSubmit,
    activeStep,
    onStepBack,
    handleDisableSubmitButton,
    isSubmitButtonDisabled,
    onCancel,
    isSubmitting,
  };

  return (
    <FormProvider {...methods}>
      <StyledForm onSubmit={methods.handleSubmit(onSubmit)}>
        <FormStepperContextProvider value={contextValue}>
          {children}
        </FormStepperContextProvider>
      </StyledForm>
    </FormProvider>
  );
};

const FormStepper = Object.assign(FormStepperComponent, {
  Intro: FormStepperIntro,
  Indicator: FormStepperStepIndicator,
  Content: FormStepperContent,
  Navigation: FormStepperNavigation,
});

export default FormStepper;
