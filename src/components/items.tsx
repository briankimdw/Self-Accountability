import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { cheer, progress } from '../coach';
import { useGym, useJobs, useSettings } from '../data';
import { addDays, formatDay, formatTime, todayKey } from '../dates';
import { formatSets, volume, Workout } from '../gym';
import { JobApplication, JobStatus, STATUSES } from '../jobs';
import { useTasks } from '../store';
import { useTheme } from '../theme';
import { useToast } from '../toast';
import { Task } from '../types';
import { Button, Card, Chip, KindIcon, Pill, T } from './ui';

export const STATUS_LABEL: Record<JobStatus, string> = { applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' };

export function useStatusColor() {
  const c = useTheme();
  return (s: JobStatus) =>
    ({
      applied: { fg: c.job, soft: c.jobSoft },
      interview: { fg: c.gym, soft: c.gymSoft },
      offer: { fg: c.goal, soft: c.goalSoft },
      rejected: { fg: c.muted, soft: c.surfaceAlt },
    })[s];
}

function ConfirmDelete({ onDelete }: { onDelete: () => void }) {
  const c = useTheme();
  const [ask, setAsk] = useState(false);
  return ask ? (
    <View style={styles.actions}>
      <Button kind="danger" icon="trash-outline" label="Yes, delete" onPress={onDelete} />
      <Button kind="ghost" label="Cancel" onPress={() => setAsk(false)} />
    </View>
  ) : (
    <Button kind="ghost" icon="trash-outline" label="Delete" color={c.muted} onPress={() => setAsk(true)} />
  );
}

/* ---------- Goals ---------- */

export function GoalItem({ task, overdue, showDay }: { task: Task; overdue?: boolean; showDay?: boolean }) {
  const c = useTheme();
  const toast = useToast();
  const { toggleDone, toggleStep, reschedule, removeTask } = useTasks();
  const [open, setOpen] = useState(false);
  const pct = progress(task);
  const stepsDone = task.plan.filter((s) => s.done).length;

  const onCheck = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(task.done ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    await toggleDone(task.id);
    if (!task.done) toast(cheer(task.id));
  };

  return (
    <Card style={[styles.item, task.done && { opacity: 0.72 }]} tone={overdue ? c.danger : undefined}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.row} accessibilityRole="button" accessibilityLabel={`${task.title}, show plan`}>
        <View style={{ flex: 1, gap: 3 }}>
          <T v="strong" style={task.done && { textDecorationLine: 'line-through', color: c.muted }}>{task.title}</T>
          <View style={styles.metaRow}>
            {(showDay || overdue) && (
              <T v="small" color={overdue ? c.danger : c.muted}>{formatDay(task.dateKey)} · {formatTime(task.time)} · </T>
            )}
            <Ionicons name="time-outline" size={13} color={c.muted} />
            <T v="small" color={c.muted}>{task.minutes} min</T>
            {task.plan.length > 0 && !task.done && (
              <T v="small" color={c.muted}> · {stepsDone}/{task.plan.length} steps</T>
            )}
          </View>
        </View>
        <Pressable onPress={onCheck} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}
          accessibilityLabel={`Mark ${task.title} ${task.done ? 'not done' : 'done'}`}
          style={[styles.check, { borderColor: task.done ? c.goal : c.faint, backgroundColor: task.done ? c.goal : 'transparent' }]}>
          {task.done && <Ionicons name="checkmark" size={18} color={c.onAccent} />}
        </Pressable>
      </Pressable>

      {!task.done && pct > 0 && (
        <View style={[styles.track, { backgroundColor: c.goalSoft }]}>
          <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: c.goal, borderRadius: 2 }} />
        </View>
      )}

      {open && (
        <View style={{ marginTop: 14, gap: 12 }}>
          {!!task.why && (
            <View style={[styles.why, { backgroundColor: c.goalSoft }]}>
              <Ionicons name="heart" size={14} color={c.goal} style={{ marginTop: 3 }} />
              <T v="body" style={{ flex: 1 }}>{task.why}</T>
            </View>
          )}
          <View style={{ gap: 2 }}>
            {task.plan.map((s, i) => (
              <Pressable key={s.id} onPress={() => toggleStep(task.id, s.id)} style={styles.step} accessibilityRole="checkbox" accessibilityState={{ checked: s.done }}>
                <View style={[styles.stepNum, { backgroundColor: s.done ? c.goal : c.surfaceAlt }]}>
                  {s.done ? <Ionicons name="checkmark" size={13} color={c.onAccent} /> : <T v="smallStrong" color={c.muted} style={{ fontSize: 11 }}>{i + 1}</T>}
                </View>
                <T v="body" color={s.done ? c.muted : c.ink} style={[{ flex: 1 }, s.done && { textDecorationLine: 'line-through' }]}>{s.text}</T>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            {!task.done && (
              <Button kind="secondary" icon={overdue ? 'today-outline' : 'arrow-forward'}
                label={overdue ? 'Move to today' : 'Push to tomorrow'}
                onPress={() => reschedule(task.id, overdue ? todayKey() : addDays(task.dateKey, 1))} />
            )}
            <ConfirmDelete onDelete={() => removeTask(task.id)} />
          </View>
        </View>
      )}
    </Card>
  );
}

/** Goals laid out against the clock, with a rail joining them. */
export function GoalTimeline({ tasks }: { tasks: Task[] }) {
  const c = useTheme();
  return (
    <View>
      {tasks.map((t, i) => {
        const [time, ampm] = formatTime(t.time).split(' ');
        return (
          <View key={t.id} style={styles.tlRow}>
            <View style={styles.tlTime}>
              <T v="smallStrong" style={{ fontVariant: ['tabular-nums'] }}>{time}</T>
              <T v="small" color={c.muted} style={{ fontSize: 11 }}>{ampm}</T>
            </View>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { borderColor: c.goal, backgroundColor: t.done ? c.goal : c.bg }]} />
              {i < tasks.length - 1 && <View style={[styles.tlLine, { backgroundColor: c.line }]} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 10 }}>
              <GoalItem task={t} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ---------- Job applications ---------- */

export function JobItem({ app, last }: { app: JobApplication; last?: boolean }) {
  const c = useTheme();
  const statusColor = useStatusColor();
  const { setStatus, removeApp } = useJobs();
  const [open, setOpen] = useState(false);
  const sc = statusColor(app.status);
  const href = /^https?:\/\//i.test(app.url) ? app.url : `https://${app.url}`;

  return (
    <View style={[styles.listRow, !last && { borderBottomWidth: 1, borderBottomColor: c.line }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.row} accessibilityRole="button">
        <View style={[styles.logo, { backgroundColor: c.jobSoft }]}>
          <T v="smallStrong" color={c.job}>{app.company.slice(0, 1).toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T v="strong" numberOfLines={1}>{app.company}</T>
          {!!app.role && <T v="small" color={c.muted} numberOfLines={1}>{app.role}</T>}
        </View>
        <Pill text={STATUS_LABEL[app.status]} color={sc.fg} soft={sc.soft} />
      </Pressable>
      {open && (
        <View style={{ marginTop: 12, gap: 10, paddingLeft: 46 }}>
          {!!app.url && (
            <Pressable onPress={() => Linking.openURL(href)} style={styles.row}>
              <Ionicons name="open-outline" size={15} color={c.job} />
              <T v="small" color={c.job} numberOfLines={1} style={{ flex: 1, textDecorationLine: 'underline' }}>{app.url}</T>
            </Pressable>
          )}
          {!!app.notes && <T v="small">{app.notes}</T>}
          <T v="small" color={c.muted}>Applied {formatDay(app.applied_on).toLowerCase()}</T>
          <View style={styles.actions}>
            {STATUSES.map((s) => (
              <Chip key={s} label={STATUS_LABEL[s]} active={app.status === s} color={statusColor(s).fg}
                onPress={() => setStatus(app.id, s)} />
            ))}
          </View>
          <ConfirmDelete onDelete={() => removeApp(app.id)} />
        </View>
      )}
    </View>
  );
}

export function JobGroup({ apps, target, title }: { apps: JobApplication[]; target?: number; title?: string }) {
  const c = useTheme();
  const [all, setAll] = useState(false);
  const shown = all ? apps : apps.slice(0, 4);
  const hit = target !== undefined && apps.length >= target;
  return (
    <Card style={styles.item}>
      <View style={[styles.row, { marginBottom: 6 }]}>
        <KindIcon kind="job" size={30} />
        <T v="heading" style={{ flex: 1 }}>{title ?? 'Applications'}</T>
        {target !== undefined && (
          <Pill text={hit ? `${apps.length}/${target} ✓` : `${apps.length}/${target}`} color={hit ? c.goal : c.job} soft={hit ? c.goalSoft : c.jobSoft} />
        )}
      </View>
      {shown.map((a, i) => <JobItem key={a.id} app={a} last={i === shown.length - 1} />)}
      {apps.length > 4 && (
        <Pressable onPress={() => setAll((x) => !x)} style={{ paddingTop: 10 }}>
          <T v="smallStrong" color={c.job}>{all ? 'Show fewer' : `Show all ${apps.length}`}</T>
        </Pressable>
      )}
    </Card>
  );
}

/* ---------- Workouts ---------- */

export function WorkoutItem({ workout, onEdit }: { workout: Workout; onEdit: (w: Workout) => void }) {
  const c = useTheme();
  const { removeWorkout } = useGym();
  const { weight_unit: unit } = useSettings();
  const [open, setOpen] = useState(false);
  const groups = new Map<string, Workout['sets']>();
  for (const s of workout.sets) groups.set(s.exercise.trim(), [...(groups.get(s.exercise.trim()) ?? []), s]);
  const vol = volume(workout.sets);

  return (
    <Card style={styles.item}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.row} accessibilityRole="button">
        <KindIcon kind="gym" size={30} />
        <View style={{ flex: 1 }}>
          <T v="heading">{workout.name || 'Workout'}</T>
          <T v="small" color={c.muted}>
            {groups.size} exercise{groups.size === 1 ? '' : 's'} · {workout.sets.length} sets{vol > 0 ? ` · ${Math.round(vol).toLocaleString()} ${unit}` : ''}
          </T>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
      </Pressable>
      <View style={{ marginTop: 10, gap: 6 }}>
        {[...groups].slice(0, open ? undefined : 3).map(([name, sets]) => (
          <View key={name} style={styles.exRow}>
            <T v="smallStrong" style={{ width: 120 }} numberOfLines={1}>{name}</T>
            <T v="small" color={c.muted} style={{ flex: 1 }}>{formatSets(sets, unit)}</T>
          </View>
        ))}
        {!open && groups.size > 3 && <T v="small" color={c.muted}>+{groups.size - 3} more</T>}
      </View>
      {open && (
        <View style={{ marginTop: 12, gap: 10 }}>
          {!!workout.notes && <T v="small" color={c.muted} style={{ fontStyle: 'italic' }}>{workout.notes}</T>}
          <View style={styles.actions}>
            <Button kind="secondary" icon="create-outline" label="Edit" onPress={() => onEdit(workout)} />
            <ConfirmDelete onDelete={() => removeWorkout(workout.id)} />
          </View>
        </View>
      )}
    </Card>
  );
}

/* ---------- A whole day ---------- */

export function DayAgenda({ dateKey, onAdd, onEditWorkout }: {
  dateKey: string; onAdd: (date: string) => void; onEditWorkout: (w: Workout) => void;
}) {
  const c = useTheme();
  const { tasks } = useTasks();
  const { apps } = useJobs();
  const { workouts } = useGym();
  const { daily_app_target } = useSettings();

  const goals = tasks.filter((t) => t.dateKey === dateKey).sort((a, b) => a.time.localeCompare(b.time));
  const dayApps = apps.filter((a) => a.applied_on === dateKey);
  const dayWorkouts = workouts.filter((w) => w.performed_on === dateKey);
  const isFuture = dateKey > todayKey();

  if (!goals.length && !dayApps.length && !dayWorkouts.length) {
    return (
      <Pressable onPress={() => onAdd(dateKey)} style={[styles.empty, { borderColor: c.line }]}>
        <Ionicons name="add-circle-outline" size={26} color={c.faint} />
        <T v="strong" color={c.muted}>{isFuture ? 'Nothing planned yet' : 'Nothing logged'}</T>
        <T v="small" color={c.faint}>Tap to add a goal, application or workout</T>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 4 }}>
      {goals.length > 0 && <GoalTimeline tasks={goals} />}
      {dayApps.length > 0 && <JobGroup apps={dayApps} target={isFuture ? undefined : daily_app_target} />}
      {dayWorkouts.map((w) => <WorkoutItem key={w.id} workout={w} onEdit={onEditWorkout} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  why: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12 },
  step: { flexDirection: 'row', gap: 10, paddingVertical: 6, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: -1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tlRow: { flexDirection: 'row', gap: 10 },
  tlTime: { width: 50, alignItems: 'flex-end', paddingTop: 16 },
  tlRail: { width: 14, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, marginTop: 20 },
  tlLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  listRow: { paddingVertical: 10 },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exRow: { flexDirection: 'row', gap: 10 },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 18, padding: 22, alignItems: 'center', gap: 4 },
});

