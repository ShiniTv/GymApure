import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DIFFICULTY_LABELS: Record<string, string> = {
  Beginner: 'Principiante',
  Intermediate: 'Intermedio',
  Advanced: 'Avanzado',
};

export function formatDifficulty(value: string): string {
  return DIFFICULTY_LABELS[value] ?? value;
}

export function formatMoney(value: number): string {
  return `$${value.toFixed(Number.isInteger(value) ? 0 : 2)}`;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  trainer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  receptionist: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  member: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
};

export function roleBadgeClass(role: string): string {
  return ROLE_COLORS[role] || 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';
}
