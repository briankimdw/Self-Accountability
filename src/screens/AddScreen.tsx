import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { buildPlan } from '../coach';
import { addDays, formatDay, formatTime, fromDateKey, todayKey } from '../dates';
import { useTasks } from '../store';
import { useTheme } from '../theme';

const EFFORT = [15, 30, 60, 90, 120, 180];
const pad = (n: number) => String(n).padStart(2, '0');

function defaultTime() {
  const d = new Date(Date.now() + 60 * 60_000);
  return `${pad(d.getHours())}:00`;
}

export function AddScreen({ onSaved }: { onSaved: () => void }) {
  const c = useTheme();
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [dateKey, setDateKey] = useState(todayKey());
  const [time, setTime] = useState(defaultTime());
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayKey(), i)), []);
  const plan = useMemo(() => buildPlan(title.trim() || 'your goal', minutes), [title, minutes]);
  const inPast = fromDateKey(dateKey, time).getTime() < Date.now();

  const shift = (mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const total = (h * 60 + m + mins + 1440) % 1440;
    setTime(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await addTask({ title: title.trim(), why: why.trim(), dateKey, time, minutes });
    setTitle('');
    setWhy('');
    setSaving(false);
    onSaved();
  };

  const input = [styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }];

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={[styles.h1, { color: c.text }]}>New commitment</Text>

      <Label text="What will you do?" />
      <TextInput style={input} value={title} onChangeText={setTitle}
        placeholder="e.g. Go for a 3 mile run" placeholderTextColor={c.muted} returnKeyType="next" />

      <Label text="Why does it matter? (shown in reminders)" />
      <TextInput style={input} value={why} onChangeText={setWhy}
        placeholder="e.g. I want to feel strong for the race" placeholderTextColor={c.muted} />

      <Label text="Which day?" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d) => (
          <Chip key={d} label={formatDay(d)} active={d === dateKey} onPress={() => setDateKey(d)} />
        ))}
      </ScrollView>

      <Label text="What time?" />
      <View style={styles.timeRow}>
        <Chip label="−1h" onPress={() => shift(-60)} />
        <Chip label="−15m" onPress={() => shift(-15)} />
        <Text style={[styles.time, { color: c.text }]}>{formatTime(time)}</Text>
        <Chip label="+15m" onPress={() => shift(15)} />
        <Chip label="+1h" onPress={() => shift(60)} />
      </View>
      {inPast && <Text style={{ color: c.warn, marginTop: 6 }}>That time already passed today. Pick a later time.</Text>}

      <Label text="How long will it take?" />
      <View style={styles.wrapRow}>
        {EFFORT.map((m) => (
          <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} hr`} active={m === minutes} onPress={() => setMinutes(m)} />
        ))}
      </View>

      <Label text="Your plan" />
      <View style={[styles.plan, { backgroundColor: c.card, borderColor: c.border }]}>
        {plan.map((s, i) => (
          <Text key={s.id} style={{ color: c.text, paddingVertical: 3 }}>
            {i + 1}. {s.text}
          </Text>
        ))}
        <Text style={{ color: c.muted, marginTop: 8, fontSize: 12 }}>
          Reminders: the night before, that morning, 15 min before, at start, then check-ins until it's done.
        </Text>
      </View>

      <Pressable onPress={save} disabled={!title.trim() || inPast || saving}
        style={[styles.save, { backgroundColor: c.accent, opacity: !title.trim() || inPast || saving ? 0.4 : 1 }]}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Commit to it'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  const c = useTheme();
  return <Text style={[styles.label, { color: c.muted }]}>{text}</Text>;
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress}
      style={[styles.chip, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentSoft : c.card }]}>
      <Text style={{ color: active ? c.accent : c.text, fontWeight: active ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 60 },
  h1: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time: { fontSize: 20, fontWeight: '700', minWidth: 96, textAlign: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plan: { borderWidth: 1, borderRadius: 12, padding: 12 },
  save: { marginTop: 24, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
