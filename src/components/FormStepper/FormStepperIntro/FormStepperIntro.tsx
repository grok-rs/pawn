import { Typography } from '@mui/material';

import { useFormStepperContext } from '../FormStepperContext';
import { StyledBox } from './styled';

const FormStepperIntro = () => {
  const { steps, activeStep } = useFormStepperContext();
  const { stepIntro } = steps[activeStep];
  const { title = '', description = '' } = stepIntro || {};

  return (
    <StyledBox>
      {title && <Typography variant="h4" color="black">{title}</Typography>}
      {description && (
        <Typography sx={{ mt: 1.5, color: 'action.disabled' }} variant="body2">
          {description}
        </Typography>
      )}
    </StyledBox>
  );
};

export default FormStepperIntro;
