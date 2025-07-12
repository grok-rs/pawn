import CheckIcon from '@mui/icons-material/Check';

import { useFormStepperContext } from '../FormStepperContext';
import { StyledStep, StyledStepLabel, StyledStepper } from './styled';

const FormStepperStepIndicator = () => {
  const { activeStep, steps } = useFormStepperContext();

  return (
    <StyledStepper activeStep={activeStep}>
      {steps.map((step, index) => {
        const isStepCompleted = index < activeStep;

        const labelIcon = <span>{isStepCompleted ? <CheckIcon /> : step.id}</span>;

        return (
          <StyledStep key={step.id} completed={isStepCompleted}>
            <StyledStepLabel icon={labelIcon}>{step.label}</StyledStepLabel>
          </StyledStep>
        );
      })}
    </StyledStepper>
  );
};

export default FormStepperStepIndicator;
