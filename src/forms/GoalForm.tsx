import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Field, T } from '../components/ui';
import { buildPlan } from '../coach';
import { addDays, formatDay, formatTime, fromDateKey, todayKey } from '../dates';
import { useTasks } from '../store';
import { useTheme } from '../theme';
import { useToast } from '../toast';

const EFFORT = [15, 30, 45, 60, 90, 120, 180];
const PRESETS = [
  { label: 'Morning', time: '08:00' },
  { label: 'Noon', time: '12:00' },
  { label: 'Afternoon', time: '15:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '21:00' },
];
const pad = (n: number) => String(n).padStart(2, '0');

function nextHour() {
  const d = new Date(Date.now() + 60 * 60_000);
  return `${pad(d.getHours())}:00`;
}

export function GoalForm({ initialDate, onSaved }: { initialDate?: string; onSaved: (date: string) => void }) {
  const c = useTheme();
  const toast = useToast();
  const { addTask } = useTasks();
  const today = todayKey();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [dateKey, setDateKey] = useState(initialDate && initialDate >= today ? initialDate : today);
  const [time, setTime] = useState(initialDate && initialDate > today ? '09:00' : nextHour());
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    const list = Array.from({ length: 21 }, (_, i) => addDays(today, i));
    return list.includes(dateKey) ? list : [...list, dateKey];
  }, [today, dateKey]);
  const plan = useMemo(() => buildPlan(title.trim() || 'your goal', minutes), [title, minutes]);
  const inPast = fromDateKey(dateKey, time).getTime() < Date.now();
  const ready = !!title.trim() && !inPast && !saving;

  const shift = (mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const total = (h * 60 + m + mins + 1440) % 1440;
    setTime(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    const ok = await addTask({ title: title.trim(), why: why.trim(), dateKey, time, minutes });
    setSaving(false);
    if (!ok) return;
    toast(`Committed for ${formatDay(dateKey).toLowerCase()} at ${formatTime(time)}.`);
    onSaved(dateKey);
  };

  return (
    <View style={{ gap: 18 }}>
      <Field nativeID="goal-title" label="What will you do?" value={title} onChangeText={setTitle}
        placeholder="e.g. Go for a 3 mile run" returnKeyType="next" />
      <Field nativeID="goal-why" label="Why does it matter? Shown in your reminders" value={why} onChangeText={setWhy}
        placeholder="e.g. I want to feel strong for the race" />

      <View style={{ gap: 8 }}>
        <T v="smallStrong" color={c.muted}>Day</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d) => <Chip key={d} label={formatDay(d)} active={d === dateKey} onPress={() => setDateKey(d)} />)}
        </ScrollView>
      </View>

      <View style={{ gap: 8 }}>
        <T v="smallStrong" color={c.muted}>Time</T>
        <Card style={{ gap: 12, alignItems: 'center' }}>
          <T v="hero" style={{ fontVariant: ['tabular-nums'] }}>{formatTime(time)}</T>
          <View style={styles.row}>
            {[-60, -15, 15, 60].map((m) => (
              <Chip key={m} label={`${m > 0 ? '+' : '−'}${Math.abs(m) === 60 ? '1h' : `${Math.abs(m)}m`}`} onPress={() => shift(m)} />
            ))}
          </View>
          <View style={styles.wrap}>
            {PRESETS.map((p) => <Chip key={p.label} label={p.label} active={time === p.time} onPress={() => setTime(p.time)} />)}
          </View>
        </Card>
        {inPast && <T v="small" color={c.danger}>That time has already passed. Pick a later time.</T>}
      </View>

      <View style={{ gap: 8 }}>
        <T v="smallStrong" color={c.muted}>How long will it take?</T>
        <View style={styles.wrapLeft}>
          {EFFORT.map((m) => (
            <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} hr`} active={m === minutes} onPress={() => setMinutes(m)} />
          ))}
        </View>
      </View>

      <Card style={{ backgroundColor: c.goalSoft, borderColor: c.goalSoft, gap: 6 }}>
        <T v="label" color={c.goal}>Your plan</T>
        {plan.map((s, i) => (
          <View key={s.id} style={{ flexDirection: 'row', gap: 8 }}>
            <T v="smallStrong" color={c.goal} style={{ width: 16 }}>{i + 1}</T>
            <T v="small" style={{ flex: 1 }}>{s.text}</T>
          </View>
        ))}
        <T v="small" color={c.muted} style={{ marginTop: 6 }}>
          Reminders the night before, that morning, 15 minutes before and at the start, then check-ins until it's done.
        </T>
      </Card>

      <Button label={saving ? 'Saving…' : 'Commit to it'} icon="flag" onPress={save} disabled={!ready} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  wrapLeft: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
