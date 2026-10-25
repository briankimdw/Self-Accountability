import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGym, useJobs, useSettings } from '../data';
import { addDays, fromDateKey, toDateKey, todayKey } from '../dates';
import { useTasks } from '../store';
import { useTheme } from '../theme';
import { T } from './ui';

export type DayMarks = { goals: number; goalsDone: number; missed: boolean; apps: number; workouts: number };

/** Per-day counts of everything you logged or planned, for dots on calendars. */
export function useDayMarks(): Map<string, DayMarks> {
  const { tasks } = useTasks();
  const { apps } = useJobs();
  const { workouts } = useGym();
  return useMemo(() => {
    const today = todayKey();
    const m = new Map<string, DayMarks>();
    const get = (k: string) => {
      if (!m.has(k)) m.set(k, { goals: 0, goalsDone: 0, missed: false, apps: 0, workouts: 0 });
      return m.get(k)!;
    };
    for (const t of tasks) {
      const d = get(t.dateKey);
      d.goals++;
      if (t.done) d.goalsDone++;
      else if (t.dateKey < today) d.missed = true;
    }
    for (const a of apps) get(a.applied_on).apps++;
    for (const w of workouts) get(w.performed_on).workouts++;
    return m;
  }, [tasks, apps, workouts]);
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Dots({ marks, size = 5 }: { marks?: DayMarks; size?: number }) {
  const c = useTheme();
  const { daily_app_target } = useSettings();
  if (!marks) return <View style={{ height: size }} />;
  const dots: string[] = [];
  if (marks.goals) dots.push(marks.missed ? c.danger : c.goal);
  if (marks.apps) dots.push(marks.apps >= daily_app_target ? c.job : c.job + '88');
  if (marks.workouts) dots.push(c.gym);
  return (
    <View style={{ flexDirection: 'row', gap: 3, height: size }}>
      {dots.map((col, i) => <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col }} />)}
    </View>
  );
}

export function MonthCalendar({ month, selected, onSelect, onMonth }: {
  /** Any date key inside the month to show */
  month: string; selected: string; onSelect: (d: string) => void; onMonth: (d: string) => void;
}) {
  const c = useTheme();
  const marks = useDayMarks();
  const today = todayKey();
  const first = fromDateKey(month);
  first.setDate(1);
  const firstKey = toDateKey(first);
  const start = addDays(firstKey, -first.getDay());
  const monthIdx = first.getMonth();
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const visibleWeeks = weeks.filter((wk, i) => i < 5 || fromDateKey(wk[0]).getMonth() === monthIdx);
  const shift = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    onMonth(toDateKey(d));
  };

  return (
    <View>
      <View style={styles.header}>
        <T v="title" style={{ flex: 1 }}>
          {first.toLocaleDateString(undefined, { month: 'long' })}{' '}
          <T v="title" color={c.faint}>{first.getFullYear()}</T>
        </T>
        <Pressable onPress={() => shift(-1)} hitSlop={8} accessibilityLabel="Previous month" style={[styles.nav, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="chevron-back" size={18} color={c.ink} />
        </Pressable>
        <Pressable onPress={() => shift(1)} hitSlop={8} accessibilityLabel="Next month" style={[styles.nav, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="chevron-forward" size={18} color={c.ink} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => <T key={i} v="label" color={c.faint} style={styles.weekday}>{d}</T>)}
      </View>
      {visibleWeeks.map((wk) => (
        <View key={wk[0]} style={styles.week}>
          {wk.map((d) => {
            const inMonth = fromDateKey(d).getMonth() === monthIdx;
            const isSel = d === selected;
            const isToday = d === today;
            return (
              <Pressable key={d} onPress={() => onSelect(d)} style={styles.cell} accessibilityRole="button"
                accessibilityState={{ selected: isSel }} accessibilityLabel={fromDateKey(d).toDateString()}>
                <View style={[styles.dayNum, isSel && { backgroundColor: c.ink }, !isSel && isToday && { borderWidth: 1.5, borderColor: c.goal }]}>
                  <T v={isSel || isToday ? 'smallStrong' : 'small'} color={isSel ? c.bg : !inMonth ? c.faint : isToday ? c.goal : c.ink}>
                    {fromDateKey(d).getDate()}
                  </T>
                </View>
                <Dots marks={marks.get(d)} />
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Legend color={c.goal} label="Goals" />
        <Legend color={c.job} label="Applications" />
        <Legend color={c.gym} label="Workouts" />
        <Legend color={c.danger} label="Missed" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <T v="small" color={c.muted} style={{ fontSize: 12 }}>{label}</T>
    </View>
  );
}

/** This week (Sun–Sat) as a compact strip. */
export function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const c = useTheme();
  const marks = useDayMarks();
  const today = todayKey();
  const start = addDays(today, -fromDateKey(today).getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={styles.strip}>
      {days.map((d) => {
        const on = d === selected;
        const date = fromDateKey(d);
        return (
          <Pressable key={d} onPress={() => onSelect(d)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[styles.stripDay, { backgroundColor: on ? c.ink : c.surface, borderColor: on ? c.ink : c.line }]}>
            <T v="label" color={on ? c.bg : c.muted} style={{ fontSize: 10 }}>
              {date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}
            </T>
            <T v="num" color={on ? c.bg : d < today ? c.muted : c.ink} style={{ fontSize: 18, lineHeight: 22 }}>{date.getDate()}</T>
            <Dots marks={marks.get(d)} size={4} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', marginBottom: 6 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3, minHeight: 50 },
  dayNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10, justifyContent: 'center' },
  strip: { flexDirection: 'row', gap: 6 },
  stripDay: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 8, gap: 3 },
});
