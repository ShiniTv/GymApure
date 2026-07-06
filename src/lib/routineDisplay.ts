export function formatExerciseCount(count: number): string {
  const safe = Math.max(0, count);
  return `${safe} ejercicio${safe !== 1 ? 's' : ''}`;
}

export function buildExerciseSummary(options: {
  count: number;
  preview?: string | null;
  loadedExercises?: { name: string }[];
}): { label: string; preview: string | null } {
  const { count, preview, loadedExercises } = options;
  const label = formatExerciseCount(count);

  if (count === 0) {
    return { label, preview: 'Sin ejercicios asignados' };
  }

  if (loadedExercises?.length) {
    const names = loadedExercises.slice(0, 3).map((e) => e.name);
    const remaining = count - names.length;
    const base = names.join(' · ');
    return {
      label,
      preview: remaining > 0 ? `${base} · +${remaining} más` : base,
    };
  }

  if (preview?.trim()) {
    const previewCount = preview.split(' · ').filter(Boolean).length;
    const remaining = count - previewCount;
    return {
      label,
      preview: remaining > 0 ? `${preview} · +${remaining} más` : preview,
    };
  }

  return { label, preview: null };
}
