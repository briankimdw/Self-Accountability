import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { cheer, progress } from '../coach';
import { addDays, formatDay, formatTime, todayKey } from '../dates';
import { useTasks } from '../store';
import { useTheme } from '../theme';
import { Task } from '../types';

export function TaskCard({ task, overdue = false }: { task: Task; overdue?: boolean }) {
  const c = useTheme();
  const { toggleDone, toggleStep, reschedule, removeTask } = useTasks();
  const [open, setOpen] = useState(false);
  const pct = progress(task);

  const onDone = async () => {
    Haptics.notificationAsync(
      task.done ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
    await toggleDone(task.id);
    if (!task.done) Alert.alert('Promise kept', cheer(task.id));
  };

  const onDelete = () =>
    Alert.alert('Delete goal?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTask(task.id) },
    ]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: overdue ? c.warn : c.border },
      ]}
    >
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.row} accessibilityRole="button">
        <Pressable
          onPress={onDone}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={`Mark ${task.title} ${task.done ? 'not done' : 'done'}`}
          style={[
            styles.check,
            { borderColor: task.done ? c.accent : c.muted, backgroundColor: task.done ? c.accent : 'transparent' },
          ]}
        >
          {task.done && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: task.done ? c.muted : c.text, textDecorationLine: task.done ? 'line-through' : 'none' },
            ]}
          >
            {task.title}
          </Text>
          <Text style={[styles.meta, { color: overdue ? c.warn : c.muted }]}>
            {formatDay(task.dateKey)} · {formatTime(task.time)} · {task.minutes} min
          </Text>
        </View>
        <Text style={{ color: c.muted, fontSize: 18 }}>{open ? '▾' : '▸'}</Text>
      </Pressable>

      {!task.done && pct > 0 && (
        <View style={[styles.bar, { backgroundColor: c.accentSoft }]}>
          <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: c.accent }]} />
        </View>
      )}

      {open && (
        <View style={styles.body}>
          {!!task.why && (
            <Text style={[styles.why, { color: c.text, backgroundColor: c.accentSoft }]}>
              Why it matters: {task.why}
            </Text>
          )}
          <Text style={[styles.section, { color: c.muted }]}>YOUR PLAN</Text>
          {task.plan.map((s) => (
            <Pressable key={s.id} onPress={() => toggleStep(task.id, s.id)} style={styles.step}>
              <Text style={{ color: s.done ? c.accent : c.muted, width: 22 }}>{s.done ? '●' : '○'}</Text>
              <Text
                style={{ flex: 1, color: s.done ? c.muted : c.text, textDecorationLine: s.done ? 'line-through' : 'none' }}
              >
                {s.text}
              </Text>
            </Pressable>
          ))}
          <View style={styles.actions}>
            {!task.done && (
              <Action label={overdue ? 'Move to today' : 'Push to tomorrow'} color={c.text} border={c.border}
                onPress={() => reschedule(task.id, overdue ? todayKey() : addDays(task.dateKey, 1))} />
            )}
            <Action label="Delete" color={c.warn} border={c.border} onPress={onDelete} />
          </View>
        </View>
      )}
    </View>
  );
}

function Action(p: { label: string; color: string; border: string; onPress: () => void }) {
  return (
    <Pressable onPress={p.onPress} style={[styles.action, { borderColor: p.border }]}>
      <Text style={{ color: p.color, fontWeight: '600' }}>{p.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 2 },
  bar: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 4 },
  body: { marginTop: 12 },
  why: { padding: 10, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  step: { flexDirection: 'row', paddingVertical: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  action: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
});
