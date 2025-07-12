import { Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

type Props = {
  isSubmitting?: boolean;
  onStepBack?: () => void;
  onCancel?: () => void;
  isSubmitButtonDisabled?: boolean;
  isLastStep?: boolean;
  isFirstStep?: boolean;
};

const StepperNavigation = ({
  isSubmitting,
  onStepBack,
  isSubmitButtonDisabled,
  onCancel,
  isLastStep,
  isFirstStep,
}: Props) => {
  const { t } = useTranslation();

  return (
    <Stack direction="row" marginTop="auto" spacing={2} alignSelf="end">
      <Button
        variant="outlined"
        disabled={isSubmitting}
        onClick={isFirstStep ? onCancel : onStepBack}
        sx={{ textTransform: 'none' }} // Prevent text from being uppercase
      >
        Назад
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={isSubmitButtonDisabled}
        color="primary"
        sx={{ textTransform: 'none' }} // Prevent text from being uppercase
      >
        {isLastStep ? 'Створити' : t('continue')}
      </Button>
    </Stack>
  );
};

export default StepperNavigation;
