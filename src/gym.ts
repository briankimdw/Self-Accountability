export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise: string;
  position: number;
  weight: number;
  reps: number;
};

export type Workout = {
  id: string;
  performed_on: string;
  name: string;
  notes: string;
  created_at: string;
  sets: WorkoutSet[];
};

export type Unit = 'lb' | 'kg';

const key = (exercise: string) => exercise.trim().toLowerCase();

/** Estimated one-rep max (Epley). */
export const e1rm = (weight: number, reps: number) =>
  reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

export const volume = (sets: WorkoutSet[]) =>
  sets.reduce((sum, s) => sum + Number(s.weight) * s.reps, 0);

const newestFirst = (a: Workout, b: Workout) =>
  (b.performed_on + b.created_at).localeCompare(a.performed_on + a.created_at);

/** Sets from the most recent workout that included this exercise. */
export function lastTime(workouts: Workout[], exercise: string): { date: string; sets: WorkoutSet[] } | null {
  const k = key(exercise);
  if (!k) return null;
  for (const w of [...workouts].sort(newestFirst)) {
    const sets = w.sets.filter((s) => key(s.exercise) === k);
    if (sets.length) return { date: w.performed_on, sets: sets.sort((a, b) => a.position - b.position) };
  }
  return null;
}

export type Record = { exercise: string; weight: number; reps: number; date: string; best1rm: number };

/** Heaviest set per exercise, newest exercises first. */
export function personalRecords(workouts: Workout[]): Record[] {
  const best = new Map<string, Record>();
  for (const w of [...workouts].sort(newestFirst).reverse()) {
    for (const s of w.sets) {
      const k = key(s.exercise);
      const weight = Number(s.weight);
      const cur = best.get(k);
      const est = e1rm(weight, s.reps);
      if (!cur || weight > cur.weight || (weight === cur.weight && s.reps > cur.reps)) {
        best.set(k, { exercise: s.exercise.trim(), weight, reps: s.reps, date: w.performed_on, best1rm: Math.max(est, cur?.best1rm ?? 0) });
      } else if (est > cur.best1rm) {
        cur.best1rm = est;
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date) || a.exercise.localeCompare(b.exercise));
}

/** Previous best weight for an exercise, ignoring one workout (the one being edited). */
export function previousBest(workouts: Workout[], exercise: string, excludeId?: string): number {
  const k = key(exercise);
  let max = 0;
  for (const w of workouts) {
    if (w.id === excludeId) continue;
    for (const s of w.sets) if (key(s.exercise) === k) max = Math.max(max, Number(s.weight));
  }
  return max;
}

/** Exercise names used before, most recent first, for quick picking. */
export function knownExercises(workouts: Workout[]): string[] {
  const seen = new Map<string, string>();
  for (const w of [...workouts].sort(newestFirst))
    for (const s of w.sets) if (!seen.has(key(s.exercise))) seen.set(key(s.exercise), s.exercise.trim());
  return [...seen.values()];
}

export function formatSets(sets: WorkoutSet[], unit: Unit): string {
  const weights = new Set(sets.map((s) => Number(s.weight)));
  const reps = sets.map((s) => s.reps).join(', ');
  if (weights.size === 1) {
    const w = Number(sets[0].weight);
    return w > 0 ? `${w} ${unit} × ${reps}` : `${reps} reps`;
  }
  return sets.map((s) => `${Number(s.weight)}×${s.reps}`).join(', ') + ` ${unit}`;
}
