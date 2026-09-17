import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Custom @theme font sizes must not collide with text-* colors.
      'font-size': ['text-small', 'text-h1', 'text-h2', 'text-input'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip height utilities so Button size tokens win over call-site h-* / min-h-*. */
export function stripHeightUtilities(className?: string): string | undefined {
  if (!className) return className;
  return className
    .replace(
      /(?:^|\s)(?:sm:|md:|lg:|xl:|max-sm:|max-md:|max-lg:)?(?:min-h|h)-(?:\[[^\]]+\]|\S+)/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip Button size/type escapes so `size` tokens own height and type scale.
 * Keeps layout utilities (gap, w-*, mt-*, etc.).
 */
export function stripButtonSizeEscapes(className?: string): string | undefined {
  if (!className) return className;
  return stripHeightUtilities(className)
    ?.replace(/(?:^|\s)(?:sm:|md:|lg:|xl:)?(?:text-xs|text-small)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  admin: 'bg-accent/10 text-accent border border-accent/20',
  trainer: 'bg-brand/10 text-brand border border-brand/20',
  receptionist: 'bg-warning/10 text-warning border border-warning/20',
  member: 'bg-surface-raised text-text-secondary border border-border',
};

export function roleBadgeClass(role: string): string {
  return ROLE_COLORS[role] || 'bg-surface-raised text-text-secondary border border-border';
}
