import { addDays, todayKey } from './dates';
import { Task } from './types';

/**
 * A day is "kept" when every goal scheduled that day is done.
 * Days with no goals neither extend nor break the streak.
 * Today only counts once everything is done, but never breaks it while open.
 */
export function currentStreak(tasks: Task[]): number {
  const byDay = new Map<string, Task[]>();
  for (const t of tasks) byDay.set(t.dateKey, [...(byDay.get(t.dateKey) ?? []), t]);

  const today = todayKey();
  const earliest = [...byDay.keys()].sort()[0];
  if (!earliest) return 0;

  let streak = 0;
  for (let day = today; day >= earliest; day = addDays(day, -1)) {
    const list = byDay.get(day);
    if (!list) continue;
    const allDone = list.every((t) => t.done);
    if (allDone) streak++;
    else if (day !== today) break;
  }
  return streak;
}

export function completionRate(tasks: Task[]): number {
  const today = todayKey();
  const due = tasks.filter((t) => t.dateKey <= today);
  if (!due.length) return 0;
  return due.filter((t) => t.done).length / due.length;
}
