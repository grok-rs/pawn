import * as yup from 'yup';

export const DEFAULT_TOURNAMENT_FORM_VALUES = {
  name: '',
  city: '',
  country: '',
  startDate: new Date(),
  endDate: new Date(),
  mainReferee: '',
  type: 'rapid',
  pairingSystem: 'swiss',
  timeControlTemplate: '',
  rounds: 9,
  additionalTime: 30,
  additionalTimeUnit: 'seconds',
  // Advanced tournament settings
  forfeitTimeMinutes: 30,
  drawOffersPolicy: 'allowed',
  mobilePhonePolicy: 'prohibited',
  lateEntryPolicy: 'allowed',
  organizerName: '',
  organizerEmail: '',
  arbiterNotes: '',
};

export const TOURNAMENT_FORM_SCHEMA = yup.object().shape({
  name: yup.string().required('Tournament name is required'),
  city: yup.string().required('City is required'),
  country: yup.string().required('Country is required'),
  startDate: yup.date().required('Start date is required').nullable(),
  endDate: yup.date().required('End date is required').nullable(),
  mainReferee: yup.string(),
  type: yup.string().required('Tournament type is required'),
  pairingSystem: yup.string().required('Tournament format is required'),
  timeControlTemplate: yup
    .mixed()
    .required('Time control template is required'),
  rounds: yup
    .number()
    .min(1, 'At least 1 round is required')
    .max(99, 'Maximum 99 rounds allowed')
    .required('Number of rounds is required'),
  additionalTime: yup.number().min(0, 'Additional time cannot be negative'),
  additionalTimeUnit: yup.string(),
  // Advanced tournament settings validation
  forfeitTimeMinutes: yup
    .number()
    .min(1, 'Forfeit time must be at least 1 minute')
    .max(120, 'Forfeit time cannot exceed 120 minutes'),
  drawOffersPolicy: yup
    .string()
    .oneOf(
      ['allowed', 'restricted', 'prohibited'],
      'Invalid draw offers policy'
    ),
  mobilePhonePolicy: yup
    .string()
    .oneOf(
      ['allowed', 'silent_only', 'prohibited'],
      'Invalid mobile phone policy'
    ),
  lateEntryPolicy: yup
    .string()
    .oneOf(
      ['allowed', 'restricted', 'prohibited'],
      'Invalid late entry policy'
    ),
  organizerName: yup
    .string()
    .max(100, 'Organizer name cannot exceed 100 characters'),
  organizerEmail: yup
    .string()
    .email('Invalid email format')
    .max(100, 'Email cannot exceed 100 characters'),
  arbiterNotes: yup
    .string()
    .max(1000, 'Arbiter notes cannot exceed 1000 characters'),
});
