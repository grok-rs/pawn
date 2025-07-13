import { Button, Stack, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ArrowBack, ArrowForward, Check } from '@mui/icons-material';

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
    <Stack
      direction="row"
      marginTop="auto"
      spacing={2}
      alignSelf="end"
      sx={{ pt: 3 }}
    >
      <Button
        variant="outlined"
        disabled={isSubmitting}
        onClick={isFirstStep ? onCancel : onStepBack}
        startIcon={<ArrowBack />}
        sx={{
          textTransform: 'none',
          px: 3,
          py: 1.5,
          borderRadius: 2,
        }}
      >
        {isFirstStep ? t('cancel') : t('back')}
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={isSubmitButtonDisabled || isSubmitting}
        color="primary"
        endIcon={
          isSubmitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : isLastStep ? (
            <Check />
          ) : (
            <ArrowForward />
          )
        }
        sx={{
          textTransform: 'none',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          minWidth: 120,
        }}
      >
        {isSubmitting ? t('creating') : isLastStep ? t('createTournament') : t('continue')}
      </Button>
    </Stack>
  );
};

export default StepperNavigation;
