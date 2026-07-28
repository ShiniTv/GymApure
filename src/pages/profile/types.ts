export type ProfileTab = 'datos' | 'salud' | 'progreso' | 'seguridad' | 'apariencia' | 'carne';

export interface ProfileFormState {
  phone: string;
  initial_weight: string;
  height: string;
  goal: string;
  dob: string;
}

export interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface MeasurementFormState {
  date: string;
  weight: string;
  body_fat_percentage: string;
  waist: string;
  arm: string;
  leg: string;
}
