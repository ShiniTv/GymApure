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
  /* *-800 on tinted bg meets WCAG AA for 10px badges (was *-600 ~3:1) */
  admin: 'bg-purple-500/10 text-purple-800 dark:text-purple-300',
  trainer: 'bg-blue-500/10 text-blue-800 dark:text-blue-300',
  receptionist: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  member: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
};

export function roleBadgeClass(role: string): string {
  return ROLE_COLORS[role] || 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300';
}
