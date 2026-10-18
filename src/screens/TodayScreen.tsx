import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signOut, useSession } from '../auth';
import { useGym, useJobs, useSettings } from '../data';
import { addDays } from '../dates';
import { TaskCard } from '../components/TaskCard';
import { nudge } from '../coach';
import { formatDay, todayKey } from '../dates';
import { completionRate, currentStreak } from '../streak';
import { useTasks } from '../store';
import { useTheme } from '../theme';
import { Task } from '../types';

const byTime = (a: Task, b: Task) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function TodayScreen({ onOpen }: { onOpen: (tab: 'jobs' | 'gym') => void }) {
  const c = useTheme();
  const session = useSession();
  const { tasks } = useTasks();
  const { apps } = useJobs();
  const { workouts } = useGym();
  const { daily_app_target: target } = useSettings();
  const today = todayKey();
  const appsToday = apps.filter((a) => a.applied_on === today).length;
  const gymWeek = workouts.filter((w) => w.performed_on > addDays(today, -7)).length;
  const lastWorkout = workouts[0];

  const overdue = tasks.filter((t) => !t.done && t.dateKey < today).sort(byTime);
  const todays = tasks.filter((t) => t.dateKey === today).sort(byTime);
  const upcoming = tasks.filter((t) => t.dateKey > today).sort(byTime).slice(0, 10);

  const left = todays.filter((t) => !t.done).length;
  const streak = currentStreak(tasks);
  const rate = Math.round(completionRate(tasks) * 100);

  const headline =
    !todays.length
      ? 'Nothing planned today. Add something worth doing.'
      : left === 0
        ? 'Everything done today. You kept your word.'
        : `${left} ${left === 1 ? 'thing' : 'things'} left today. ${nudge(today)}`;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.top}>
        <Text style={[styles.hello, { color: c.muted }]}>{greeting()}</Text>
        <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button">
          <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>{session.user.email} · Sign out</Text>
        </Pressable>
      </View>
      <Text style={[styles.headline, { color: c.text }]}>{headline}</Text>

      <View style={styles.stats}>
        <Stat label="Day streak" value={`${streak}🔥`} />
        <Stat label="Follow-through" value={`${rate}%`} />
        <Stat label="Done today" value={`${todays.length - left}/${todays.length}`} />
      </View>

      <View style={styles.stats}>
        <Pressable onPress={() => onOpen('jobs')} style={[styles.link, { backgroundColor: c.card, borderColor: appsToday >= target ? c.accent : c.border }]}>
          <Text style={[styles.statLabel, { color: c.muted }]}>JOB APPLICATIONS</Text>
          <Text style={[styles.statValue, { color: c.text }]}>{appsToday}/{target} today</Text>
          <Text style={{ color: appsToday >= target ? c.accent : c.muted, fontSize: 12, marginTop: 2 }}>
            {appsToday >= target ? 'Target hit ✓' : `${target - appsToday} to go ›`}
          </Text>
        </Pressable>
        <Pressable onPress={() => onOpen('gym')} style={[styles.link, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.statLabel, { color: c.muted }]}>GYM</Text>
          <Text style={[styles.statValue, { color: c.text }]}>{gymWeek} this week</Text>
          <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {lastWorkout ? `Last: ${lastWorkout.name || 'Workout'}, ${formatDay(lastWorkout.performed_on)}` : 'Log your first workout ›'}
          </Text>
        </Pressable>
      </View>

      {overdue.length > 0 && (
        <Section title="Missed. Let's recover these" color={c.warn}>
          {overdue.map((t) => <TaskCard key={t.id} task={t} overdue />)}
        </Section>
      )}
      <Section title="Today" color={c.muted}>
        {todays.length ? todays.map((t) => <TaskCard key={t.id} task={t} />) : <Empty text="No goals for today yet." />}
      </Section>
      {upcoming.length > 0 && (
        <Section title="Coming up" color={c.muted}>
          {upcoming.map((t) => <TaskCard key={t.id} task={t} />)}
        </Section>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={[styles.sectionTitle, { color }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const c = useTheme();
  return <Text style={{ color: c.muted, paddingVertical: 8 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 },
  hello: { fontSize: 14 },
  link: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  headline: { fontSize: 24, fontWeight: '700', marginTop: 4, lineHeight: 30 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
});
