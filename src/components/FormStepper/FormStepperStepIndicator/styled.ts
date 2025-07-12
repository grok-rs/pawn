import { Step, stepIconClasses, StepLabel, Stepper } from '@mui/material';
import { styled } from '@mui/material/styles';

export const StyledStepper = styled(Stepper)(({ theme }) => ({
  gap: 8,
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

export const StyledStep = styled(Step)(() => ({
  padding: 0,
}));

export const StyledStepLabel = styled(StepLabel)(({ theme }) => ({
  '.MuiStepLabel-iconContainer': {
    padding: '2px 9px',
    margin: '0px 8px',
    borderRadius: 999,
    color: theme.palette.common.white,
    backgroundColor: theme.palette.grey[500],

    ['&:first-of-type']: {
      marginLeft: 0,
    },
    ['&:last-of-type']: {
      marginRight: 0,
    },
    [`&.${stepIconClasses.completed}`]: {
      backgroundColor: theme.palette.primary.dark,
      padding: 0,
      paddingTop: '1px',
    },
    [`&.${stepIconClasses.completed} span`]: {
      height: '24px'
    },
    [`&.${stepIconClasses.active}`]: {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));
