import { FieldValues } from 'react-hook-form';

export interface TournamentFormValues extends FieldValues {
  name: string;
  city: string;
  country: string;
  startDate: Date | null;
  endDate: Date | null;
  mainReferee: string;
}
