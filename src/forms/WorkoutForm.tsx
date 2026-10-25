import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Chip, Field, Ring, Stepper, T } from '../components/ui';
import { DraftWorkout, useGym, useSettings } from '../data';
import { addDays, formatDay, todayKey } from '../dates';
import { formatSets, knownExercises, lastTime, previousBest, Workout } from '../gym';
import { font, useTheme } from '../theme';
import { useToast } from '../toast';

type EditSet = { weight: string; reps: string };
type EditExercise = { key: string; name: string; sets: EditSet[] };
type Draft = { id?: string; performed_on: string; name: string; notes: string; exercises: EditExercise[] };

const uid = () => Math.random().toString(36).slice(2, 9);
const WORKOUT_NAMES = ['Push', 'Pull', 'Legs', 'Upper body', 'Lower body', 'Full body', 'Cardio'];

function toDraft(w: Workout | undefined, date: string): Draft {
  if (!w) return { performed_on: date, name: '', notes: '', exercises: [{ key: uid(), name: '', sets: [{ weight: '', reps: '' }] }] };
  const byName = new Map<string, EditExercise>();
  for (const s of w.sets) {
    const k = s.exercise.trim().toLowerCase();
    if (!byName.has(k)) byName.set(k, { key: uid(), name: s.exercise.trim(), sets: [] });
    byName.get(k)!.sets.push({ weight: s.weight ? String(s.weight) : '', reps: String(s.reps) });
  }
  return { id: w.id, performed_on: w.performed_on, name: w.name, notes: w.notes, exercises: [...byName.values()] };
}

export function WorkoutForm({ workout, initialDate, onSaved, onCancel }: {
  workout?: Workout; initialDate?: string; onSaved: (date: string) => void; onCancel?: () => void;
}) {
  const c = useTheme();
  const toast = useToast();
  const { workouts, saveWorkout } = useGym();
  const { weight_unit: unit, gym_weekly_target: weekly, update } = useSettings();
  const today = todayKey();
  const [draft, setDraft] = useState<Draft>(() => toDraft(workout, initialDate && initialDate <= today ? initialDate : today));
  const [saving, setSaving] = useState(false);

  const others = useMemo(() => workouts.filter((w) => w.id !== draft.id), [workouts, draft.id]);
  const known = useMemo(() => knownExercises(workouts), [workouts]);
  const used = new Set(draft.exercises.map((e) => e.name.trim().toLowerCase()));
  const suggestions = known.filter((k) => !used.has(k.toLowerCase())).slice(0, 10);
  const names = [...new Set([...workouts.map((w) => w.name).filter(Boolean), ...WORKOUT_NAMES])].slice(0, 8);
  const thisWeek = workouts.filter((w) => w.performed_on > addDays(today, -7)).length;
  const dates = [...new Set([today, addDays(today, -1), addDays(today, -2), draft.performed_on])].sort().reverse();

  const setEx = (key: string, fn: (e: EditExercise) => EditExercise) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? fn(e) : e)) }));

  const addExercise = (name = '') => {
    // Start from what you did last time, so logging is mostly confirming.
    const prev = name ? lastTime(others, name) : null;
    const sets = prev?.sets.map((s) => ({ weight: s.weight ? String(s.weight) : '', reps: String(s.reps) })) ?? [{ weight: '', reps: '' }];
    setDraft((d) => {
      const blank = d.exercises.length === 1 && !d.exercises[0].name && d.exercises[0].sets.every((s) => !s.weight && !s.reps);
      const ex = { key: uid(), name, sets };
      return { ...d, exercises: blank ? [ex] : [...d.exercises, ex] };
    });
  };

  const validSets = draft.exercises.flatMap((e) =>
    e.name.trim()
      ? e.sets
          .filter((s) => Number(s.reps) > 0)
          .map((s) => ({ exercise: e.name.trim(), weight: Math.max(0, Number(s.weight) || 0), reps: Math.round(Number(s.reps)) }))
      : [],
  );

  const save = async () => {
    if (!validSets.length || saving) return;
    setSaving(true);
    const w: DraftWorkout = { id: draft.id, performed_on: draft.performed_on, name: draft.name, notes: draft.notes, sets: validSets };
    const prs = draft.exercises.filter((e) => {
      const best = previousBest(workouts, e.name, draft.id);
      return best > 0 && e.sets.some((s) => Number(s.weight) > best && Number(s.reps) > 0);
    });
    const ok = await saveWorkout(w);
    setSaving(false);
    if (!ok) return;
    toast(prs.length ? `New PR on ${prs.map((e) => e.name.trim()).join(', ')}! 🏆` : draft.id ? 'Workout updated.' : 'Workout saved. Showing up is the win.');
    onSaved(draft.performed_on);
  };

  return (
    <View style={{ gap: 18 }}>
      {draft.id ? (
        <View style={styles.row}>
          <T v="heading" style={{ flex: 1 }}>Editing {draft.name || 'workout'}</T>
          {onCancel && <Button kind="secondary" label="Cancel" onPress={onCancel} />}
        </View>
      ) : (
        <Card style={styles.progress}>
          <Ring value={thisWeek / weekly} size={64} stroke={7} color={c.gym} track={c.gymSoft}>
            <T v="num" style={{ fontSize: 18 }}>{thisWeek}</T>
          </Ring>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="strong">{thisWeek >= weekly ? 'Weekly target hit' : `${weekly - thisWeek} more this week`}</T>
            <T v="small" color={c.muted}>Workouts per week</T>
          </View>
          <Stepper value={weekly} onChange={(n) => update({ gym_weekly_target: n })} min={1} max={14} label="weekly target" />
        </Card>
      )}

      <View style={{ gap: 8 }}>
        <Field nativeID="workout-name" label="Workout" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="e.g. Leg day" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {names.map((n) => <Chip key={n} label={n} color={c.gym} active={draft.name === n} onPress={() => setDraft({ ...draft, name: n })} />)}
        </ScrollView>
      </View>

      <View style={{ gap: 8 }}>
        <T v="smallStrong" color={c.muted}>When</T>
        <View style={styles.wrap}>
          {dates.map((d) => <Chip key={d} label={formatDay(d)} color={c.gym} active={draft.performed_on === d} onPress={() => setDraft({ ...draft, performed_on: d })} />)}
        </View>
      </View>

      {draft.exercises.map((ex, i) => {
        const prev = lastTime(others, ex.name);
        const best = previousBest(workouts, ex.name, draft.id);
        return (
          <Card key={ex.key} style={{ gap: 10 }}>
            <View style={styles.row}>
              <View style={[styles.exNum, { backgroundColor: c.gymSoft }]}>
                <T v="smallStrong" color={c.gym}>{i + 1}</T>
              </View>
              <TextInput nativeID={`ex-${i}`} value={ex.name} onChangeText={(name) => setEx(ex.key, (e) => ({ ...e, name }))}
                placeholder="Exercise, e.g. Squat" placeholderTextColor={c.faint}
                style={[styles.exName, { color: c.ink, fontFamily: font.display }]} />
              <Pressable onPress={() => setDraft({ ...draft, exercises: draft.exercises.filter((e) => e.key !== ex.key) })}
                hitSlop={8} accessibilityLabel="Remove exercise">
                <Ionicons name="close" size={20} color={c.faint} />
              </Pressable>
            </View>
            {prev && (
              <View style={[styles.last, { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name="time-outline" size={14} color={c.muted} />
                <T v="small" color={c.muted} style={{ flex: 1 }}>Last time, {formatDay(prev.date).toLowerCase()}: {formatSets(prev.sets, unit)}</T>
              </View>
            )}
            <View style={styles.setHead}>
              <T v="label" color={c.faint} style={styles.setCol}>Set</T>
              <T v="label" color={c.faint} style={{ flex: 1 }}>{unit}</T>
              <T v="label" color={c.faint} style={{ flex: 1 }}>Reps</T>
              <View style={{ width: 24 }} />
            </View>
            {ex.sets.map((s, j) => {
              const pr = best > 0 && Number(s.weight) > best && Number(s.reps) > 0;
              const change = (patch: Partial<EditSet>) =>
                setEx(ex.key, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === j ? { ...x, ...patch } : x)) }));
              const input = [styles.setInput, { backgroundColor: c.surfaceAlt, color: c.ink, fontFamily: font.semibold }];
              return (
                <View key={j} style={styles.setRow}>
                  <View style={styles.setCol}>
                    {pr ? <Ionicons name="trophy" size={16} color={c.gym} accessibilityLabel="New personal record" /> : <T v="smallStrong" color={c.muted}>{j + 1}</T>}
                  </View>
                  <TextInput nativeID={`w-${i}-${j}`} value={s.weight} onChangeText={(weight) => change({ weight: weight.replace(/[^0-9.]/g, '') })}
                    placeholder="0" placeholderTextColor={c.faint} keyboardType="decimal-pad"
                    style={[input, pr && { backgroundColor: c.gymSoft, color: c.gym }]} />
                  <TextInput nativeID={`r-${i}-${j}`} value={s.reps} onChangeText={(reps) => change({ reps: reps.replace(/[^0-9]/g, '') })}
                    placeholder="0" placeholderTextColor={c.faint} keyboardType="number-pad" style={input} />
                  <Pressable onPress={() => setEx(ex.key, (e) => ({ ...e, sets: e.sets.filter((_, k) => k !== j) }))}
                    hitSlop={8} accessibilityLabel="Remove set" style={{ width: 24, alignItems: 'center' }}>
                    <Ionicons name="remove-circle-outline" size={18} color={c.faint} />
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={() => setEx(ex.key, (e) => ({ ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? { weight: '', reps: '' }) }] }))}
              style={styles.addSet}>
              <Ionicons name="add" size={16} color={c.gym} />
              <T v="smallStrong" color={c.gym}>Add set</T>
            </Pressable>
          </Card>
        );
      })}

      <View style={{ gap: 8 }}>
        <T v="smallStrong" color={c.muted}>Add exercise</T>
        <View style={styles.wrap}>
          {suggestions.map((n) => <Chip key={n} label={n} onPress={() => addExercise(n)} />)}
          <Chip label="New exercise" icon="add" onPress={() => addExercise()} />
        </View>
      </View>

      <Field nativeID="workout-notes" label="Notes (optional)" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })}
        placeholder="How it felt, what to change next time" />

      <Button label={saving ? 'Saving…' : `${draft.id ? 'Update' : 'Save'} workout${validSets.length ? ` · ${validSets.length} sets` : ''}`}
        icon="barbell" color={c.gym} onPress={save} disabled={!validSets.length || saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  exNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exName: { flex: 1, fontSize: 18, paddingVertical: 4, minWidth: 0 },
  last: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8, borderRadius: 10 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setCol: { width: 28, alignItems: 'center', textAlign: 'center' },
  setInput: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, textAlign: 'center' },
  addSet: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
});
