export type BiologicalSex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const ACTIVITY_LEVELS: {
  id: ActivityLevel;
  label: string;
  factor: number;
}[] = [
  { id: 'sedentary', label: 'Sedentario (poco o ningún ejercicio)', factor: 1.2 },
  { id: 'light', label: 'Ligero (1–3 días/semana)', factor: 1.375 },
  { id: 'moderate', label: 'Moderado (3–5 días/semana)', factor: 1.55 },
  { id: 'active', label: 'Activo (6–7 días/semana)', factor: 1.725 },
  { id: 'very_active', label: 'Muy activo (trabajo físico + gym)', factor: 1.9 },
];

const ACTIVITY_FACTOR_MAP = new Map(ACTIVITY_LEVELS.map((l) => [l.id, l.factor]));

export function getAgeFromDob(dob: string, referenceDate = new Date()): number {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) {
    throw new Error('Fecha de nacimiento inválida');
  }
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function validateMetabolicInputs({
  weightKg,
  heightCm,
  age,
}: {
  weightKg: number;
  heightCm: number;
  age: number;
}): string | null {
  if (weightKg < 30 || weightKg > 300) return 'Peso fuera de rango (30–300 kg)';
  if (heightCm < 100 || heightCm > 250) return 'Altura fuera de rango (100–250 cm)';
  if (age < 13 || age > 100) return 'Edad fuera de rango (13–100 años)';
  return null;
}

export function calculateBmrMifflinStJeor({
  sex,
  weightKg,
  heightCm,
  age,
}: {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const validation = validateMetabolicInputs({ weightKg, heightCm, age });
  if (validation) throw new Error(validation);

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  return Math.max(800, Math.round(bmr));
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  const factor = ACTIVITY_FACTOR_MAP.get(activityLevel);
  if (!factor) throw new Error('Nivel de actividad inválido');
  return Math.max(bmr, Math.round(bmr * factor));
}

export function isActivityLevel(value: string): value is ActivityLevel {
  return ACTIVITY_FACTOR_MAP.has(value as ActivityLevel);
}

export function isBiologicalSex(value: string): value is BiologicalSex {
  return value === 'male' || value === 'female';
}
