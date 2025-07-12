import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { APP_ROUTES } from "../../constants/appRoutes";
import FormStepper from "../FormStepper";
import { NEW_TOURNAMENT_FORM_STEPS } from "./constants";
import StepperNavigation from "./StepperNavigation/StepperNavigation";
import { StyledBox, StyledDivider } from "./styled";
import { DEFAULT_TOURNAMENT_FORM_VALUES } from "./validation";
import { commands, CreateTournament } from "../../dto/bindings";

const NewTournamentSetup = () => {
  const navigate = useNavigate();

  const onCancel = () => navigate(APP_ROUTES.TOURNAMENTS);

  const defaultValues = useMemo(() => {
    return DEFAULT_TOURNAMENT_FORM_VALUES;
  }, []);

  const onSubmit = async (data: CreateTournament) => {
    console.log("submit", data);
    const createTournament: CreateTournament = {
      name: "test",
      location: "Lozova",
      date: "",
      time_type: "",
      player_count: 10,
      rounds_played: 10,
      total_rounds: 30,
      country_code: "UKR",
    };
    await commands
      .createTournament(createTournament)
      .catch((error) => console.error(error));
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
