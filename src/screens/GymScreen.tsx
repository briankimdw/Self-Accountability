import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Label, SectionTitle } from '../components/ui';
import { DraftWorkout, useGym, useSettings } from '../data';
import { addDays, formatDay, todayKey } from '../dates';
import { formatSets, knownExercises, lastTime, personalRecords, previousBest, volume, Workout } from '../gym';
import { useTheme } from '../theme';
import { useToast } from '../toast';

type EditSet = { weight: string; reps: string };
type EditExercise = { key: string; name: string; sets: EditSet[] };
type Draft = { id?: string; performed_on: string; name: string; notes: string; exercises: EditExercise[] };

const uid = () => Math.random().toString(36).slice(2, 9);
const WORKOUT_NAMES = ['Push', 'Pull', 'Legs', 'Upper body', 'Lower body', 'Full body', 'Cardio'];

const emptyDraft = (): Draft => ({ performed_on: todayKey(), name: '', notes: '', exercises: [{ key: uid(), name: '', sets: [{ weight: '', reps: '' }] }] });

function toDraft(w: Workout): Draft {
  const byName = new Map<string, EditExercise>();
  for (const s of w.sets) {
    const k = s.exercise.trim().toLowerCase();
    if (!byName.has(k)) byName.set(k, { key: uid(), name: s.exercise.trim(), sets: [] });
    byName.get(k)!.sets.push({ weight: String(s.weight || ''), reps: String(s.reps) });
  }
  return { id: w.id, performed_on: w.performed_on, name: w.name, notes: w.notes, exercises: [...byName.values()] };
}

export function GymScreen() {
  const [draft, setDraft] = useState<Draft | null>(null);
  return draft ? (
    <WorkoutEditor draft={draft} setDraft={setDraft} onDone={() => setDraft(null)} />
  ) : (
    <GymHome onLog={() => setDraft(emptyDraft())} onEdit={(w) => setDraft(toDraft(w))} />
  );
}

function GymHome({ onLog, onEdit }: { onLog: () => void; onEdit: (w: Workout) => void }) {
  const c = useTheme();
  const { workouts } = useGym();
  const { weight_unit: unit, update } = useSettings();
  const [showAllPRs, setShowAllPRs] = useState(false);
  const today = todayKey();
  const thisWeek = workouts.filter((w) => w.performed_on > addDays(today, -7)).length;
  const thisMonth = workouts.filter((w) => w.performed_on > addDays(today, -30)).length;
  const last = workouts[0];
  const daysSince = last ? Math.round((Date.parse(today) - Date.parse(last.performed_on)) / 86_400_000) : null;
  const prs = useMemo(() => personalRecords(workouts), [workouts]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.h1, { color: c.text, flex: 1 }]}>Gym log</Text>
        <Chip label="lb" active={unit === 'lb'} onPress={() => update({ weight_unit: 'lb' })} />
        <Chip label="kg" active={unit === 'kg'} onPress={() => update({ weight_unit: 'kg' })} />
      </View>

      <View style={[styles.row, { marginTop: 14, gap: 8 }]}>
        <Stat value={String(thisWeek)} label="Last 7 days" />
        <Stat value={String(thisMonth)} label="Last 30 days" />
        <Stat value={daysSince === null ? '–' : daysSince === 0 ? 'Today' : `${daysSince}d`} label="Since last" />
      </View>
      {daysSince !== null && daysSince >= 3 && (
        <Text style={{ color: c.warn, marginTop: 10, fontWeight: '600' }}>
          {daysSince} days since your last workout. Today's a good day to get back in.
        </Text>
      )}

      <Button label="Log a workout" onPress={onLog} style={{ marginTop: 16 }} />

      {prs.length > 0 && (
        <>
          <SectionTitle text="Personal records" />
          <Card style={{ paddingVertical: 6 }}>
            {(showAllPRs ? prs : prs.slice(0, 6)).map((r, i) => (
              <View key={r.exercise} style={[styles.prRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
                <Text style={{ color: c.text, fontWeight: '600', flex: 1 }}>{r.exercise}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {r.weight > 0 ? `${r.weight} ${unit} × ${r.reps}` : `${r.reps} reps`}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    {r.weight > 0 ? `est. 1RM ${r.best1rm} ${unit} · ` : ''}{formatDay(r.date)}
                  </Text>
                </View>
              </View>
            ))}
            {prs.length > 6 && (
              <Pressable onPress={() => setShowAllPRs((s) => !s)} style={{ paddingVertical: 8 }}>
                <Text style={{ color: c.accent, fontWeight: '600' }}>{showAllPRs ? 'Show fewer' : `Show all ${prs.length}`}</Text>
              </Pressable>
            )}
          </Card>
        </>
      )}

      <SectionTitle text="History" />
      {workouts.length === 0 && (
        <Text style={{ color: c.muted }}>No workouts yet. Tap "Log a workout" to record exercises, weights and reps.</Text>
      )}
      {workouts.map((w) => <WorkoutCard key={w.id} workout={w} onEdit={() => onEdit(w)} />)}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const c = useTheme();
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

function WorkoutCard({ workout, onEdit }: { workout: Workout; onEdit: () => void }) {
  const c = useTheme();
  const { removeWorkout } = useGym();
  const { weight_unit: unit } = useSettings();
  const [confirm, setConfirm] = useState(false);
  const groups = new Map<string, typeof workout.sets>();
  for (const s of workout.sets) {
    const k = s.exercise.trim();
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const vol = volume(workout.sets);

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{workout.name || 'Workout'}</Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>
            {formatDay(workout.performed_on)} · {groups.size} exercise{groups.size === 1 ? '' : 's'} · {workout.sets.length} sets
            {vol > 0 ? ` · ${Math.round(vol).toLocaleString()} ${unit} total` : ''}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 8, gap: 4 }}>
        {[...groups].map(([name, sets]) => (
          <Text key={name} style={{ color: c.text }}>
            <Text style={{ fontWeight: '600' }}>{name}: </Text>{formatSets(sets, unit)}
          </Text>
        ))}
        {!!workout.notes && <Text style={{ color: c.muted, fontStyle: 'italic' }}>{workout.notes}</Text>}
      </View>
      <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
        {confirm ? (
          <>
            <Button kind="danger" label="Yes, delete" onPress={() => removeWorkout(workout.id)} />
            <Button kind="secondary" label="Cancel" onPress={() => setConfirm(false)} />
          </>
        ) : (
          <>
            <Button kind="secondary" label="Edit" onPress={onEdit} />
            <Button kind="secondary" label="Delete" onPress={() => setConfirm(true)} />
          </>
        )}
      </View>
    </Card>
  );
}

function WorkoutEditor({ draft, setDraft, onDone }: { draft: Draft; setDraft: (d: Draft) => void; onDone: () => void }) {
  const c = useTheme();
  const toast = useToast();
  const { workouts, saveWorkout } = useGym();
  const { weight_unit: unit } = useSettings();
  const [saving, setSaving] = useState(false);
  const known = useMemo(() => knownExercises(workouts), [workouts]);
  const used = new Set(draft.exercises.map((e) => e.name.trim().toLowerCase()));
  const suggestions = known.filter((k) => !used.has(k.toLowerCase())).slice(0, 10);
  const names = [...new Set([...workouts.map((w) => w.name).filter(Boolean), ...WORKOUT_NAMES])].slice(0, 8);

  const setEx = (key: string, fn: (e: EditExercise) => EditExercise) =>
    setDraft({ ...draft, exercises: draft.exercises.map((e) => (e.key === key ? fn(e) : e)) });

  const addExercise = (name = '') => {
    const prev = name ? lastTime(workouts, name) : null;
    // Pre-fill with what you did last time, so logging is mostly tapping Save.
    const sets = prev?.sets.map((s) => ({ weight: s.weight ? String(s.weight) : '', reps: String(s.reps) })) ?? [{ weight: '', reps: '' }];
    const blank = draft.exercises.length === 1 && !draft.exercises[0].name && draft.exercises[0].sets.every((s) => !s.weight && !s.reps);
    const ex = { key: uid(), name, sets };
    setDraft({ ...draft, exercises: blank ? [ex] : [...draft.exercises, ex] });
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
    toast(prs.length ? `Saved. New PR on ${prs.map((e) => e.name.trim()).join(', ')}! 🏆` : 'Workout saved. Showing up is the win.');
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.row}>
        <Text style={[styles.h1, { color: c.text, flex: 1 }]}>{draft.id ? 'Edit workout' : 'Log workout'}</Text>
        <Button kind="secondary" label="Cancel" onPress={onDone} />
      </View>

      <Label text="Workout" />
      <Field nativeID="workout-name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="e.g. Leg day" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
        {names.map((n) => <Chip key={n} label={n} active={draft.name === n} onPress={() => setDraft({ ...draft, name: n })} />)}
      </ScrollView>

      <Label text="When" />
      <View style={[styles.row, { gap: 8 }]}>
        {[0, -1, -2].map((o) => {
          const d = addDays(todayKey(), o);
          return <Chip key={d} label={formatDay(d)} active={draft.performed_on === d} onPress={() => setDraft({ ...draft, performed_on: d })} />;
        })}
        {![0, -1, -2].some((o) => addDays(todayKey(), o) === draft.performed_on) && (
          <Chip label={formatDay(draft.performed_on)} active onPress={() => {}} />
        )}
      </View>

      {draft.exercises.map((ex, i) => {
        const prev = lastTime(workouts.filter((w) => w.id !== draft.id), ex.name);
        const best = previousBest(workouts, ex.name, draft.id);
        return (
          <Card key={ex.key} style={{ marginTop: 16 }}>
            <View style={styles.row}>
              <Field nativeID={`ex-${i}`} value={ex.name} onChangeText={(name) => setEx(ex.key, (e) => ({ ...e, name }))}
                placeholder="Exercise, e.g. Squat" style={{ flex: 1 }} />
              <Pressable onPress={() => setDraft({ ...draft, exercises: draft.exercises.filter((e) => e.key !== ex.key) })}
                hitSlop={8} accessibilityLabel="Remove exercise" style={{ padding: 6 }}>
                <Text style={{ color: c.muted, fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>
            {prev && (
              <Text style={{ color: c.muted, fontSize: 13, marginTop: 6 }}>
                Last time ({formatDay(prev.date)}): {formatSets(prev.sets, unit)}
              </Text>
            )}
            <View style={[styles.setHead]}>
              <Text style={[styles.setCol, { color: c.muted }]}>Set</Text>
              <Text style={[styles.colHead, { color: c.muted }]}>Weight ({unit})</Text>
              <Text style={[styles.colHead, { color: c.muted }]}>Reps</Text>
              <View style={{ width: 28 }} />
            </View>
            {ex.sets.map((s, j) => {
              const pr = best > 0 && Number(s.weight) > best && Number(s.reps) > 0;
              const change = (patch: Partial<EditSet>) =>
                setEx(ex.key, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === j ? { ...x, ...patch } : x)) }));
              return (
                <View key={j} style={styles.setRow}>
                  <Text style={[styles.setCol, { color: pr ? c.accent : c.text, fontWeight: '700' }]}>{pr ? '🏆' : j + 1}</Text>
                  <Field nativeID={`w-${i}-${j}`} value={s.weight} onChangeText={(weight) => change({ weight: weight.replace(/[^0-9.]/g, '') })}
                    placeholder="0" keyboardType="decimal-pad" style={styles.inputCol} />
                  <Field nativeID={`r-${i}-${j}`} value={s.reps} onChangeText={(reps) => change({ reps: reps.replace(/[^0-9]/g, '') })}
                    placeholder="0" keyboardType="number-pad" style={styles.inputCol} />
                  <Pressable onPress={() => setEx(ex.key, (e) => ({ ...e, sets: e.sets.filter((_, k) => k !== j) }))}
                    hitSlop={8} accessibilityLabel="Remove set" style={{ width: 28, alignItems: 'center' }}>
                    <Text style={{ color: c.muted }}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={() => setEx(ex.key, (e) => ({ ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? { weight: '', reps: '' }) }] }))}
              style={{ paddingTop: 10 }}>
              <Text style={{ color: c.accent, fontWeight: '700' }}>+ Add set</Text>
            </Pressable>
          </Card>
        );
      })}

      <Label text="Add exercise" />
      <View style={styles.wrapRow}>
        {suggestions.map((n) => <Chip key={n} label={n} onPress={() => addExercise(n)} />)}
        <Chip label="+ New exercise" onPress={() => addExercise()} />
      </View>

      <Label text="Notes (optional)" />
      <Field nativeID="workout-notes" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })} placeholder="How it felt, what to change next time" />

      <Button label={saving ? 'Saving…' : `Save workout${validSets.length ? ` (${validSets.length} sets)` : ''}`}
        onPress={save} disabled={!validSets.length || saving} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 60 },
  h1: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  setCol: { width: 32, textAlign: 'center', fontSize: 12 },
  colHead: { flex: 1, fontSize: 12 },
  inputCol: { flex: 1, minWidth: 0, textAlign: 'center' },
});
