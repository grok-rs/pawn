import { useFormStepperContext } from '../FormStepperContext';

const FormStepperContent = () => {
  const { activeStep, steps, onSubmit, onCancel, handleDisableSubmitButton } =
    useFormStepperContext();

  const StepComponent = steps[activeStep].component;

  return (
    <StepComponent
      onCancel={onCancel}
      handleNextStep={onSubmit}
      handleDisableSubmitButton={handleDisableSubmitButton}
    />
  );
};

export default FormStepperContent;
