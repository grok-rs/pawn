import type { TFunction } from 'i18next';
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
  timeControlTemplate: null,
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

export const createTournamentFormSchema = (t: TFunction) =>
  yup.object().shape({
    name: yup.string().required(t('validation.form.nameRequired')),
    city: yup.string().required(t('validation.form.cityRequired')),
    country: yup.string().required(t('validation.form.countryRequired')),
    startDate: yup
      .date()
      .required(t('validation.form.startDateRequired'))
      .nullable(),
    endDate: yup
      .date()
      .required(t('validation.form.endDateRequired'))
      .nullable(),
    mainReferee: yup.string(),
    type: yup.string().required(t('validation.form.typeRequired')),
    pairingSystem: yup.string().required(t('validation.form.formatRequired')),
    timeControlTemplate: yup.mixed().nullable(),
    rounds: yup
      .number()
      .min(1, t('validation.form.roundsMin'))
      .max(99, t('validation.form.roundsMax'))
      .required(t('validation.form.roundsRequired')),
    additionalTime: yup.number().min(0, t('validation.form.additionalTimeMin')),
    additionalTimeUnit: yup.string(),
    // Advanced tournament settings validation
    forfeitTimeMinutes: yup
      .number()
      .min(1, t('validation.form.forfeitTimeMin'))
      .max(120, t('validation.form.forfeitTimeMax')),
    drawOffersPolicy: yup
      .string()
      .oneOf(
        ['allowed', 'restricted', 'prohibited'],
        t('validation.form.invalidPolicy')
      ),
    mobilePhonePolicy: yup
      .string()
      .oneOf(
        ['allowed', 'silent_only', 'prohibited'],
        t('validation.form.invalidPolicy')
      ),
    lateEntryPolicy: yup
      .string()
      .oneOf(
        ['allowed', 'restricted', 'prohibited'],
        t('validation.form.invalidPolicy')
      ),
    organizerName: yup.string().max(100, t('validation.form.organizerNameMax')),
    organizerEmail: yup
      .string()
      .email(t('validation.form.invalidEmail'))
      .max(100, t('validation.form.emailMax')),
    arbiterNotes: yup.string().max(1000, t('validation.form.arbiterNotesMax')),
  });

/** @deprecated Use createTournamentFormSchema(t) instead */
export const TOURNAMENT_FORM_SCHEMA = createTournamentFormSchema(
  ((key: string) => key) as unknown as TFunction
);
