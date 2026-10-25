import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MonthCalendar, useDayMarks } from '../components/Calendar';
import { DayAgenda } from '../components/items';
import { Screen, useWide } from '../components/Screen';
import { Button, Card, T } from '../components/ui';
import { fromDateKey, todayKey } from '../dates';
import { useNav } from '../nav';
import { useTheme } from '../theme';

export function CalendarScreen() {
  const c = useTheme();
  const nav = useNav();
  const wide = useWide();
  const marks = useDayMarks();
  const [selected, setSelected] = useState(nav.calendarDate ?? todayKey());
  const [month, setMonth] = useState(selected);

  // Jumping here from another screen selects that day.
  useEffect(() => {
    if (nav.calendarDate) {
      setSelected(nav.calendarDate);
      setMonth(nav.calendarDate);
    }
  }, [nav.calendarDate]);

  const monthStats = useMemo(() => {
    const prefix = month.slice(0, 7);
    let goals = 0, done = 0, apps = 0, workouts = 0;
    for (const [d, m] of marks) {
      if (!d.startsWith(prefix)) continue;
      goals += m.goals; done += m.goalsDone; apps += m.apps; workouts += m.workouts;
    }
    return { goals, done, apps, workouts };
  }, [marks, month]);

  const date = fromDateKey(selected);
  const isToday = selected === todayKey();

  const calendar = (
    <View style={{ gap: 14 }}>
      <Card style={{ paddingVertical: 18 }}>
        <MonthCalendar month={month} selected={selected} onMonth={setMonth}
          onSelect={(d) => { setSelected(d); if (d.slice(0, 7) !== month.slice(0, 7)) setMonth(d); }} />
      </Card>
      <View style={styles.stats}>
        <Stat color={c.goal} value={`${monthStats.done}/${monthStats.goals}`} label="goals done" />
        <Stat color={c.job} value={String(monthStats.apps)} label="applications" />
        <Stat color={c.gym} value={String(monthStats.workouts)} label="workouts" />
      </View>
    </View>
  );

  const agenda = (
    <View style={{ gap: 14 }}>
      <View style={styles.dayHead}>
        <View style={{ flex: 1 }}>
          <T v="label" color={isToday ? c.goal : c.muted}>{isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long' })}</T>
          <T v="title">{date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</T>
        </View>
        {!isToday && <Button kind="secondary" label="Today" onPress={() => { setSelected(todayKey()); setMonth(todayKey()); }} />}
        <Button kind="secondary" icon="add" label="Add" onPress={() => nav.openAdd(undefined, selected)} />
      </View>
      <DayAgenda dateKey={selected} onAdd={(d) => nav.openAdd(undefined, d)}
        onEditWorkout={(w) => nav.openAdd('workout', w.performed_on, w)} />
    </View>
  );

  return (
    <Screen>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>{calendar}</View>
          <View style={{ flex: 1.1, minWidth: 0 }}>{agenda}</View>
        </View>
      ) : (
        <View style={{ gap: 24 }}>{calendar}{agenda}</View>
      )}
    </Screen>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  const c = useTheme();
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: color, marginBottom: 6 }} />
      <T v="num" style={{ fontSize: 18 }}>{value}</T>
      <T v="small" color={c.muted}>{label}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  dayHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
});
