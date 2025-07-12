import ConfigurationStep from './ConfigurationStep';
import GeneralInfoStep from './GeneralInfoStep';
import { TOURNAMENT_FORM_SCHEMA } from './validation';

export const NEW_TOURNAMENT_FORM_STEPS = [
  {
    id: 1,
    label: 'General Information',
    stepIntro: {
      title: 'Tournament Details',
      description: 'Enter the basic information about your tournament',
    },
    component: GeneralInfoStep,
    schema: TOURNAMENT_FORM_SCHEMA
  },
  {
    id: 2,
    label: 'Tournament Settings',
    stepIntro: {
      title: 'Configure Tournament',
      description: 'Set up the rules and format for your tournament',
    },
    component: ConfigurationStep,
  },
];
