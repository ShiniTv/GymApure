/**
 * Configuración del test integral del sistema GymApure.
 * Simula 2 meses de operación con 6 días laborables por semana.
 */
import 'dotenv/config';
import { resolveDemoPassword } from '../../../src/lib/passwordPolicy.ts';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export const SIMULATION = {
  /** Contraseña compartida para todas las cuentas de simulación */
  password: process.env.SIMULATION_PASSWORD ?? resolveDemoPassword(),

  /** Dominio de email para cuentas de simulación */
  emailDomain: 'gym.test',

  /** Prefijo de email para identificar cuentas de simulación */
  emailPrefix: 'sim',

  /** Duración de la simulación en días calendario (2 meses ≈ 60 días) */
  simulationDays: parseInt(process.env.SIMULATION_DAYS ?? '60', 10),

  /** Días laborables por semana (lunes a sábado) */
  workDaysPerWeek: 6,

  /** Personal de simulación */
  staff: {
    admins: 1,
    receptionists: 1,
    trainers: 5,
  },

  /** Miembros por entrenador */
  membersPerTrainer: 20,

  /** Distribución de dificultad por entrenador (20 miembros): 7 principiantes, 7 intermedios, 6 avanzados */
  difficultyPerTrainer: {
    Beginner: 7,
    Intermediate: 7,
    Advanced: 6,
  } satisfies Record<DifficultyLevel, number>,

  /** Probabilidades de actividad diaria (0-1) */
  probabilities: {
    /** Miembros que asisten al gimnasio */
    attendance: 0.72,
    /** Miembros que completan entrenamiento (de los que asisten) */
    workout: 0.65,
    /** Miembros que registran comida */
    nutritionLog: 0.35,
    /** Entrenador envía mensaje a un miembro */
    trainerChat: 0.08,
    /** Walk-in en recepción (por día laborable) */
    walkIn: 0.04,
  },

  /** Membresías a crear si no existen */
  membershipPlans: [
    { name: 'Sim Mensual', duration_days: 30, price_usd: 30 },
    { name: 'Sim Trimestral', duration_days: 90, price_usd: 75 },
    { name: 'Sim Anual', duration_days: 365, price_usd: 250 },
  ],

  /** Turnos de entrenadores */
  trainerShifts: ['diurno', 'vespertino', 'nocturno'] as const,

  /** Niveles de entrenador */
  trainerLevels: ['basico', 'avanzado', 'especialista'] as const,
} as const;

export function simEmail(role: string, index?: number): string {
  const prefix = SIMULATION.emailPrefix;
  const domain = SIMULATION.emailDomain;
  if (role === 'admin') return `${prefix}.admin@${domain}`;
  if (role === 'receptionist') return `${prefix}.reception@${domain}`;
  if (role === 'trainer' && index != null) return `${prefix}.trainer${index}@${domain}`;
  if (role === 'member' && index != null) {
    const trainerIdx = Math.floor(index / SIMULATION.membersPerTrainer) + 1;
    const memberIdx = (index % SIMULATION.membersPerTrainer) + 1;
    return `${prefix}.t${trainerIdx}.m${memberIdx}@${domain}`;
  }
  return `${prefix}.${role}@${domain}`;
}

export function simCedula(type: 'staff' | 'member', index: number): string {
  if (type === 'staff') return `V-${String(10000000 + index).padStart(8, '0')}`;
  return `V-${String(20000000 + index).padStart(8, '0')}`;
}

export function simFullName(
  role: 'admin' | 'receptionist' | 'trainer' | 'member',
  index?: number
): string {
  const names = {
    admin: 'Carlos Administrador',
    receptionist: 'Ana Recepción',
    trainer: ['María Entrenadora', 'Pedro Coach', 'Laura Fitness', 'Diego Strength', 'Sofía Wellness'],
    member: [
      'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'José', 'Laura',
      'Miguel', 'Patricia', 'Roberto', 'Elena', 'Fernando', 'Isabel', 'Ricardo',
      'Gabriela', 'Andrés', 'Valentina', 'Daniel', 'Camila',
    ],
  };
  if (role === 'admin') return names.admin;
  if (role === 'receptionist') return names.receptionist;
  if (role === 'trainer' && index != null) return names.trainer[index - 1] ?? `Entrenador ${index}`;
  if (role === 'member' && index != null) {
    const memberIdx = index % 20;
    const lastNames = ['García', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'González', 'Pérez', 'Sánchez'];
    return `${names.member[memberIdx]} ${lastNames[memberIdx % lastNames.length]}`;
  }
  return 'Usuario Simulación';
}

/** Genera fechas laborables (lunes-sábado) hacia atrás desde hoy */
export function getWorkingDays(count: number, endDate = new Date()): Date[] {
  const days: Date[] = [];
  const cursor = new Date(endDate);
  cursor.setHours(12, 0, 0, 0);

  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0) {
      days.unshift(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shouldHappen(probability: number): boolean {
  return Math.random() < probability;
}

/** Total de miembros en la simulación */
export function totalMembers(): number {
  return SIMULATION.staff.trainers * SIMULATION.membersPerTrainer;
}

/** Distribución total de dificultad */
export function totalDifficultyDistribution(): Record<DifficultyLevel, number> {
  const per = SIMULATION.difficultyPerTrainer;
  const trainers = SIMULATION.staff.trainers;
  return {
    Beginner: per.Beginner * trainers,
    Intermediate: per.Intermediate * trainers,
    Advanced: per.Advanced * trainers,
  };
}
