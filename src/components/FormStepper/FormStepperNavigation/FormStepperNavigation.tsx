import { LoadingButton } from '@mui/lab';
import { Button, Stack } from '@mui/material';
import { FunctionComponent } from 'react';
import { FieldValues } from 'react-hook-form';

import { useFormStepperContext } from '../FormStepperContext';
import { FormStepperContextType } from '../types';

type Props = {
  component?: FunctionComponent<
    Pick<
      FormStepperContextType<FieldValues>,
      | 'isSubmitting'
      | 'onStepBack'
      | 'isSubmitButtonDisabled'
      | 'isLastStep'
      | 'isFirstStep'
      | 'onCancel'
    >
  >;
};

const FormStepperNavigation = ({ component: NavigationComponent }: Props) => {
  const { onCancel, onStepBack, isSubmitButtonDisabled, isLastStep, isFirstStep, isSubmitting } =
    useFormStepperContext();

  return (
    <>
      {NavigationComponent ? (
        <NavigationComponent
          onStepBack={onStepBack}
          isSubmitting={isSubmitting}
          isSubmitButtonDisabled={isSubmitButtonDisabled}
          isLastStep={isLastStep}
          isFirstStep={isFirstStep}
          onCancel={onCancel}
        />
      ) : (
        <Stack direction="row" marginTop="auto" spacing={2}>
          <Button fullWidth variant="outlined" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton
            fullWidth
            variant="contained"
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitButtonDisabled}
          >
            Connect
          </LoadingButton>
        </Stack>
      )}
    </>
  );
};

export default FormStepperNavigation;
