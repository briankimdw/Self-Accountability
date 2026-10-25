import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { signOut, useSession } from '../auth';
import { WeekStrip } from '../components/Calendar';
import { DayAgenda, GoalItem, STATUS_LABEL, useStatusColor } from '../components/items';
import { Screen, useWide } from '../components/Screen';
import { Button, Card, IconButton, KindIcon, Ring, SectionHeader, T } from '../components/ui';
import { nudge } from '../coach';
import { useGym, useJobs, useSettings } from '../data';
import { addDays, formatDay, fromDateKey, todayKey } from '../dates';
import { personalRecords } from '../gym';
import { jobStreak, STATUSES } from '../jobs';
import { useNav } from '../nav';
import { useTasks } from '../store';
import { Kind, useTheme } from '../theme';
import { Task } from '../types';

const byTime = (a: Task, b: Task) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function TodayScreen() {
  const c = useTheme();
  const nav = useNav();
  const wide = useWide();
  const { tasks } = useTasks();
  const { apps } = useJobs();
  const { workouts } = useGym();
  const { daily_app_target: appTarget, gym_weekly_target: gymTarget } = useSettings();
  const today = todayKey();

  const todays = tasks.filter((t) => t.dateKey === today);
  const goalsDone = todays.filter((t) => t.done).length;
  const overdue = tasks.filter((t) => !t.done && t.dateKey < today).sort(byTime);
  const upcoming = tasks.filter((t) => t.dateKey > today && t.dateKey <= addDays(today, 7)).sort(byTime);
  const appsToday = apps.filter((a) => a.applied_on === today).length;
  const gymWeek = workouts.filter((w) => w.performed_on > addDays(today, -7)).length;
  const left = todays.length - goalsDone + Math.max(appTarget - appsToday, 0);

  const headline =
    left === 0 && (todays.length || appsToday)
      ? 'Everything done today. You kept your word.'
      : todays.length - goalsDone > 0
        ? `${todays.length - goalsDone} ${todays.length - goalsDone === 1 ? 'goal' : 'goals'} left today. ${nudge(today)}`
        : appsToday < appTarget
          ? `${appTarget - appsToday} applications to go today. ${nudge(today, 1)}`
          : 'Nothing planned yet. Add something worth doing.';

  const main = (
    <View style={{ gap: 26 }}>
      <Card style={styles.rings}>
        <RingStat kind="goal" value={todays.length ? goalsDone / todays.length : 0} big={`${goalsDone}/${todays.length}`} label="Goals today" onPress={() => nav.openAdd('goal')} />
        <RingStat kind="job" value={appsToday / appTarget} big={`${appsToday}/${appTarget}`} label="Applications" onPress={() => nav.openAdd('job')} />
        <RingStat kind="gym" value={gymWeek / gymTarget} big={`${gymWeek}/${gymTarget}`} label="Workouts this wk" onPress={() => nav.openAdd('workout')} />
      </Card>

      {overdue.length > 0 && (
        <View>
          <SectionHeader title={`Missed · ${overdue.length}`} color={c.danger} />
          <T v="small" color={c.muted} style={{ marginTop: -4, marginBottom: 10 }}>Move these to today or let them go. Don't let them quietly pile up.</T>
          {overdue.slice(0, 5).map((t) => <GoalItem key={t.id} task={t} overdue />)}
        </View>
      )}

      <View>
        <SectionHeader title="Today" action="+ Add" onAction={() => nav.openAdd(undefined, today)} />
        <DayAgenda dateKey={today} onAdd={(d) => nav.openAdd(undefined, d)} onEditWorkout={(w) => nav.openAdd('workout', w.performed_on, w)} />
      </View>
    </View>
  );

  const side = (
    <View style={{ gap: 26 }}>
      <View>
        <SectionHeader title="Coming up" action="Calendar" onAction={() => nav.openCalendar(addDays(today, 1))} />
        {upcoming.length ? (
          <UpcomingList tasks={upcoming.slice(0, 6)} />
        ) : (
          <T v="small" color={c.muted}>Nothing planned for the next 7 days.</T>
        )}
      </View>
      <JobProgress />
      <StrengthProgress />
    </View>
  );

  return (
    <Screen>
      <Header headline={headline} />
      <View style={{ marginTop: 18, marginBottom: 22 }}>
        <WeekStrip selected={today} onSelect={(d) => nav.openCalendar(d)} />
      </View>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.35, minWidth: 0 }}>{main}</View>
          <View style={{ flex: 1, minWidth: 0 }}>{side}</View>
        </View>
      ) : (
        <View style={{ gap: 26 }}>{main}{side}</View>
      )}
    </Screen>
  );
}

function Header({ headline }: { headline: string }) {
  const c = useTheme();
  const session = useSession();
  const [menu, setMenu] = useState(false);
  const now = new Date();
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <T v="label" color={c.goal}>{greeting()} · {now.toLocaleDateString(undefined, { weekday: 'long' })}</T>
          <T v="hero" style={{ marginTop: 4 }}>{now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</T>
        </View>
        <IconButton icon={menu ? 'close' : 'person-outline'} label="Account" onPress={() => setMenu((m) => !m)} />
      </View>
      {menu && (
        <Card style={styles.menu}>
          <T v="small" color={c.muted} style={{ flex: 1 }} numberOfLines={1}>{session.user.email}</T>
          <Button kind="secondary" icon="log-out-outline" label="Sign out" onPress={signOut} />
        </Card>
      )}
      <T v="body" color={c.muted} style={{ maxWidth: 560 }}>{headline}</T>
    </View>
  );
}

function RingStat({ kind, value, big, label, onPress }: { kind: Kind; value: number; big: string; label: string; onPress: () => void }) {
  const c = useTheme();
  const done = value >= 1;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ringStat, { opacity: pressed ? 0.75 : 1 }]} accessibilityRole="button" accessibilityLabel={`${label}: ${big}`}>
      <Ring value={value} size={78} stroke={8} color={c[kind]} track={c[`${kind}Soft`]}>
        {done ? <Ionicons name="checkmark" size={26} color={c[kind]} /> : <KindIcon kind={kind} size={30} />}
      </Ring>
      <T v="num" style={{ fontSize: 19, marginTop: 8 }}>{big}</T>
      <T v="small" color={c.muted} style={{ textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

function UpcomingList({ tasks }: { tasks: Task[] }) {
  const c = useTheme();
  const days = [...new Set(tasks.map((t) => t.dateKey))];
  return (
    <View style={{ gap: 6 }}>
      {days.map((d) => (
        <View key={d}>
          <View style={styles.dayLabel}>
            <T v="smallStrong">{formatDay(d)}</T>
            {formatDay(d) === 'Tomorrow' && (
              <T v="small" color={c.faint}>{fromDateKey(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</T>
            )}
          </View>
          {tasks.filter((t) => t.dateKey === d).map((t) => <GoalItem key={t.id} task={t} />)}
        </View>
      ))}
    </View>
  );
}

function JobProgress() {
  const c = useTheme();
  const nav = useNav();
  const statusColor = useStatusColor();
  const { apps } = useJobs();
  const { daily_app_target: target } = useSettings();
  const today = todayKey();
  const week = apps.filter((a) => a.applied_on > addDays(today, -7)).length;
  const streak = useMemo(() => jobStreak(apps, target), [apps, target]);
  const counts = STATUSES.map((s) => ({ s, n: apps.filter((a) => a.status === s).length }));

  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.cardHead}>
        <KindIcon kind="job" size={30} />
        <T v="heading" style={{ flex: 1 }}>Job search</T>
        <Button kind="ghost" label="Log" icon="add" color={c.job} onPress={() => nav.openAdd('job')} style={{ paddingHorizontal: 6 }} />
      </View>
      <View style={styles.statRow}>
        <MiniStat value={apps.length} label="total" />
        <MiniStat value={week} label="last 7 days" />
        <MiniStat value={streak} label={`day${streak === 1 ? '' : 's'} on target`} />
      </View>
      {apps.length > 0 && (
        <View style={{ gap: 8 }}>
          <View style={[styles.stack, { backgroundColor: c.surfaceAlt }]}>
            {counts.filter((x) => x.n).map(({ s, n }) => (
              <View key={s} style={{ flex: n, backgroundColor: statusColor(s).fg }} />
            ))}
          </View>
          <View style={styles.legend}>
            {counts.map(({ s, n }) => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: statusColor(s).fg }]} />
                <T v="small" color={c.muted}>{STATUS_LABEL[s]} <T v="smallStrong">{n}</T></T>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

function StrengthProgress() {
  const c = useTheme();
  const nav = useNav();
  const { workouts } = useGym();
  const { weight_unit: unit, update } = useSettings();
  const [all, setAll] = useState(false);
  const prs = useMemo(() => personalRecords(workouts), [workouts]);
  const last = workouts[0];
  const since = last ? Math.round((fromDateKey(todayKey()).getTime() - fromDateKey(last.performed_on).getTime()) / 86_400_000) : null;

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.cardHead}>
        <KindIcon kind="gym" size={30} />
        <T v="heading" style={{ flex: 1 }}>Strength</T>
        <Pressable onPress={() => update({ weight_unit: unit === 'lb' ? 'kg' : 'lb' })} hitSlop={6}
          style={[styles.unit, { backgroundColor: c.surfaceAlt }]} accessibilityLabel="Switch weight unit">
          <T v="smallStrong" color={c.muted}>{unit}</T>
        </Pressable>
        <Button kind="ghost" label="Log" icon="add" color={c.gym} onPress={() => nav.openAdd('workout')} style={{ paddingHorizontal: 6 }} />
      </View>
      {since !== null && (
        <T v="small" color={since >= 3 ? c.danger : c.muted}>
          {since === 0 ? 'Trained today.' : `${since} day${since === 1 ? '' : 's'} since your last workout${since >= 3 ? '. Time to get back in.' : '.'}`}
        </T>
      )}
      {prs.length === 0 ? (
        <T v="small" color={c.muted}>Log a workout to start tracking personal records.</T>
      ) : (
        <View>
          {(all ? prs : prs.slice(0, 5)).map((r, i) => (
            <View key={r.exercise} style={[styles.prRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
              <View style={{ flex: 1 }}>
                <T v="strong" numberOfLines={1}>{r.exercise}</T>
                <T v="small" color={c.faint}>{formatDay(r.date)}{r.weight > 0 ? ` · est. 1RM ${r.best1rm}` : ''}</T>
              </View>
              <T v="num" style={{ fontSize: 17 }}>
                {r.weight > 0 ? `${r.weight}` : r.reps}
                <T v="small" color={c.muted}>{r.weight > 0 ? ` ${unit} × ${r.reps}` : ' reps'}</T>
              </T>
            </View>
          ))}
          {prs.length > 5 && (
            <Pressable onPress={() => setAll((x) => !x)} style={{ paddingTop: 8 }}>
              <T v="smallStrong" color={c.gym}>{all ? 'Show fewer' : `All ${prs.length} records`}</T>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <T v="num">{value}</T>
      <T v="small" color={c.muted}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rings: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
  ringStat: { alignItems: 'center', flex: 1 },
  dayLabel: { flexDirection: 'row', gap: 8, alignItems: 'baseline', marginBottom: 8, marginTop: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statRow: { flexDirection: 'row', gap: 8 },
  stack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  unit: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
});

