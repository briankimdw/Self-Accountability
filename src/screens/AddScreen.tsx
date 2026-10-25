import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { Segmented, T } from '../components/ui';
import { GoalForm } from '../forms/GoalForm';
import { JobForm } from '../forms/JobForm';
import { WorkoutForm } from '../forms/WorkoutForm';
import { formatDay, todayKey } from '../dates';
import { AddKind, useNav } from '../nav';
import { useTheme } from '../theme';

const SUBTITLE: Record<AddKind, string> = {
  goal: 'Pick a day and time. You get a step-by-step plan and reminders until it is done.',
  job: 'Paste the posting link. Duplicates are caught automatically.',
  workout: 'Log exercises, weight and reps. Exercises you have done before fill in from last time.',
};

export function AddScreen() {
  const c = useTheme();
  const nav = useNav();
  const { intent } = nav;
  const kind = intent.kind;
  const switchTo = (k: AddKind) => nav.openAdd(k, intent.date);
  const done = (date: string) => (date === todayKey() ? nav.go('today') : nav.openCalendar(date));

  return (
    <Screen max={640}>
      <View style={{ gap: 6, marginBottom: 18 }}>
        <T v="label" color={c.muted}>{intent.date ? `For ${formatDay(intent.date).toLowerCase()}` : 'Add'}</T>
        <T v="hero">{intent.workout ? 'Edit workout' : 'What are you committing to?'}</T>
      </View>
      {!intent.workout && (
        <Segmented value={kind} onChange={switchTo} options={[
          { key: 'goal', label: 'Goal', icon: 'flag', color: c.goal },
          { key: 'job', label: 'Application', icon: 'briefcase', color: c.job },
          { key: 'workout', label: 'Workout', icon: 'barbell', color: c.gym },
        ]} />
      )}
      <T v="small" color={c.muted} style={{ marginTop: 12, marginBottom: 18 }}>{SUBTITLE[kind]}</T>
      <View key={`${kind}-${intent.nonce}`}>
        {kind === 'goal' && <GoalForm initialDate={intent.date} onSaved={done} />}
        {kind === 'job' && <JobForm initialDate={intent.date} />}
        {kind === 'workout' && (
          <WorkoutForm workout={intent.workout} initialDate={intent.date} onSaved={done}
            onCancel={intent.workout ? () => nav.openCalendar(intent.workout!.performed_on) : undefined} />
        )}
      </View>
    </Screen>
  );
}
