import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';

import { useFormStepperContext } from '../hooks/useFormStepperContext';
import { StyledStep, StyledStepLabel, StyledStepper } from './styled';

const FormStepperStepIndicator = () => {
  const { activeStep, steps } = useFormStepperContext();
  const { t } = useTranslation();

  return (
    <StyledStepper activeStep={activeStep}>
      {steps.map((step, index) => {
        const isStepCompleted = index < activeStep;

        const labelIcon = (
          <span>{isStepCompleted ? <CheckIcon /> : step.id}</span>
        );

        return (
          <StyledStep key={step.id} completed={isStepCompleted}>
            <StyledStepLabel icon={labelIcon}>
              {step.label ? t(step.label) : ''}
            </StyledStepLabel>
          </StyledStep>
        );
      })}
    </StyledStepper>
  );
};

export default FormStepperStepIndicator;
