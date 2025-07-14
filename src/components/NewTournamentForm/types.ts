import { FieldValues } from 'react-hook-form';

export interface TournamentFormValues extends FieldValues {
  name: string;
  city: string;
  country: string;
  startDate: Date | null;
  endDate: Date | null;
  mainReferee: string;
  type: string;
  pairingSystem: string;
  timeControlTemplate: number | string;
  rounds: number;
  additionalTime: number;
  additionalTimeUnit: string;
  // Advanced tournament settings
  forfeitTimeMinutes: number;
  drawOffersPolicy: string;
  mobilePhonePolicy: string;
  lateEntryPolicy: string;
  organizerName: string;
  organizerEmail: string;
  arbiterNotes: string;
}
