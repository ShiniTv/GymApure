/** Consecutive calendar days with completed workouts (today or yesterday as anchor). */
export function computeWorkoutStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0;

  const daySet = new Set(
    isoDates.map((d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let anchor = today;
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (!daySet.has(todayKey)) {
    anchor = new Date(today);
    anchor.setDate(anchor.getDate() - 1);
  }

  let streak = 0;
  const cursor = new Date(anchor);
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!daySet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
