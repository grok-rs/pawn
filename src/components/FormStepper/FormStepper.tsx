import { yupResolver } from '@hookform/resolvers/yup';
import { ReactNode, useCallback, useState } from 'react';
import { DefaultValues, FieldValues, FormProvider, Resolver, useForm } from 'react-hook-form';

import FormStepperContent from './FormStepperContent';
import FormStepperContextProvider from './FormStepperContext';
import FormStepperIntro from './FormStepperIntro';
import FormStepperNavigation from './FormStepperNavigation';
import FormStepperStepIndicator from './FormStepperStepIndicator';
import StyledForm from './styled';
import { FormStepOption } from './types';

type Props<T extends FieldValues> = {
  steps: FormStepOption<T>[];
  defaultValues?: DefaultValues<T>;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onLastStep: (data: T) => Promise<void>;
  children?: ReactNode;
};

const FormStepperComponent = <T extends FieldValues>({
  steps,
  defaultValues,
  onLastStep,
  isSubmitting,
  onCancel,
  children,
}: Props<T>) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSubmitButtonDisabled, setIsSubmitButtonDisabled] = useState<boolean>(false);

  const isLastStep = activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;

  const activeSchema = steps[activeStep].schema;

  const resolver = activeSchema ? (yupResolver(activeSchema) as unknown as Resolver<T>) : undefined;

  const methods = useForm<T>({
    defaultValues,
    resolver,
  });

  const { clearErrors: clearFormErrors } = methods;

  const onSubmit = useCallback(
    async (data: T) => {
      if (isLastStep) {
        await onLastStep(data);
      } else {
        setActiveStep((prev) => prev + 1);
      }
    },
    [onLastStep, isLastStep],
  );

  const handleDisableSubmitButton = useCallback(() => setIsSubmitButtonDisabled(true), []);

  const onStepBack = useCallback(() => {
    if (activeStep !== 0) {
      setActiveStep((prev) => prev - 1);
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
        <FormStepperContextProvider value={contextValue}>{children}</FormStepperContextProvider>
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
