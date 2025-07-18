import ConfigurationStep from './ConfigurationStep';
import GeneralInfoStep from './GeneralInfoStep';
import PreviewStep from './PreviewStep';
import SeedingStep from './SeedingStep';
import { TOURNAMENT_FORM_SCHEMA } from './validation';

export const NEW_TOURNAMENT_FORM_STEPS = [
  {
    id: 1,
    label: 'form.steps.generalInformation',
    stepIntro: {
      title: 'form.steps.generalInfo.title',
      description: 'form.steps.generalInfo.description',
    },
    component: GeneralInfoStep,
    schema: TOURNAMENT_FORM_SCHEMA,
  },
  {
    id: 2,
    label: 'form.steps.tournamentSettings',
    stepIntro: {
      title: 'form.steps.configuration.title',
      description: 'form.steps.configuration.description',
    },
    component: ConfigurationStep,
  },
  {
    id: 3,
    label: 'form.steps.seeding',
    stepIntro: {
      title: 'form.steps.seeding.title',
      description: 'form.steps.seeding.description',
    },
    component: SeedingStep,
  },
  {
    id: 4,
    label: 'form.steps.preview',
    stepIntro: {
      title: 'form.steps.preview.title',
      description: 'form.steps.preview.description',
    },
    component: PreviewStep,
  },
];
