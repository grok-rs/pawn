import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';

import { APP_ROUTES } from '../../constants/appRoutes';
import FormStepper from '../FormStepper';
import { NEW_TOURNAMENT_FORM_STEPS } from './constants';
import StepperNavigation from './StepperNavigation/StepperNavigation';
import { StyledBox, StyledDivider } from './styled';
import { DEFAULT_TOURNAMENT_FORM_VALUES } from './validation';
import { commands, CreateTournament } from '../../dto/bindings';

const NewTournamentSetup = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const onCancel = () => navigate(APP_ROUTES.TOURNAMENTS);

  const defaultValues = useMemo(() => {
    return DEFAULT_TOURNAMENT_FORM_VALUES;
  }, []);

  const onSubmit = async (data: any) => {
    console.log('submit', data);
    try {
      const createTournament: CreateTournament = {
        name: data.name,
        location: data.city,
        date: data.startDate
          ? data.startDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        time_type: data.type,
        tournament_type: data.pairingSystem,
        player_count: 0, // Will be updated as players are added
        rounds_played: 0,
        total_rounds: data.rounds || 9,
        country_code: data.country || 'UKR',
      };

      const newTournament = await commands.createTournament(createTournament);
      console.log('Tournament created successfully:', newTournament);

      showSuccess('Tournament created successfully!');
      
      // Navigate to the tournament page
      navigate(`/tournament/${newTournament.id}`);
    } catch (error: any) {
      console.error('Failed to create tournament:', error);
      const errorMessage = error?.details || error?.message || 'Failed to create tournament. Please try again.';
      showError(errorMessage);
    }
  };

  return (
    <>
      <FormStepper
        steps={NEW_TOURNAMENT_FORM_STEPS}
        defaultValues={defaultValues}
        onLastStep={onSubmit}
        onCancel={onCancel}
      >
        <FormStepper.Intro />
        <StyledBox>
          <FormStepper.Indicator />
          <FormStepper.Content />
        </StyledBox>
        <StyledDivider />
        <FormStepper.Navigation component={StepperNavigation} />
      </FormStepper>
    </>
  );
};

export default NewTournamentSetup;
