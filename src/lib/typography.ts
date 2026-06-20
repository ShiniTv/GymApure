/** Shared typography class names — titles stay bold; body/forms stay readable. */
export const typography = {
  pageTitle:
    'text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight',
  pageTitleAccent: 'text-orange-500 font-bold',
  pageSubtitle: 'text-zinc-500 font-medium mt-1 text-sm',
  sectionTitle: 'text-sm font-semibold text-zinc-500 dark:text-zinc-400',
  label: 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1',
  labelCaps: 'text-xs font-semibold uppercase tracking-wide text-zinc-500',
  badge: 'text-xs font-semibold uppercase tracking-wide text-zinc-500',
  cardTitle: 'text-base font-semibold text-zinc-900 dark:text-white',
  body: 'text-sm text-zinc-600 dark:text-zinc-300',
  statValue: 'text-3xl font-bold text-zinc-900 dark:text-white tracking-tight',
  statLabel: 'text-xs font-medium uppercase tracking-wide text-zinc-500',
  button: 'font-semibold tracking-wide',
} as const;
