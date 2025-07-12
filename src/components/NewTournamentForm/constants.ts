import ConfigurationStep from './ConfigurationStep';
import GeneralInfoStep from './GeneralInfoStep';
import { TOURNAMENT_FORM_SCHEMA } from './validation';

const stepIntro = {
  title: 'Новий турнір',
  description: 'Будь ласка, заповніть форму для створення нового турніру',
};

export const NEW_TOURNAMENT_FORM_STEPS = [
  {
    id: 1,
    label: 'Загальна інформація',
    stepIntro,
    component: GeneralInfoStep,
    schema: TOURNAMENT_FORM_SCHEMA
  },
  {
    id: 2,
    label: 'Налаштування турніру',
    stepIntro,
    component: ConfigurationStep,
  },
];
