import * as yup from 'yup';

export const DEFAULT_TOURNAMENT_FORM_VALUES = {
  name: '',
  city: '',
  country: '',
  startDate: new Date(),
  endDate: new Date(),
};

export const TOURNAMENT_FORM_SCHEMA = yup.object().shape({
  name: yup.string().required('Назва турніру є обов\'язковою'),
  city: yup.string(),
  country: yup.string(),
  startDate: yup.date().required('Початок турніру').nullable(),
  endDate: yup.date().required('End date is required').nullable(),
});
