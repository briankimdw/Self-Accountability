import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthGate } from './src/auth';
import { GymProvider, JobsProvider, SettingsProvider, useGym, useJobs } from './src/data';
import { ensurePermissions } from './src/notifications';
import { AddScreen } from './src/screens/AddScreen';
import { GymScreen } from './src/screens/GymScreen';
import { JobsScreen } from './src/screens/JobsScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TaskProvider, useTasks } from './src/store';
import { useTheme } from './src/theme';
import { ToastProvider } from './src/toast';

type Tab = 'today' | 'jobs' | 'gym' | 'add';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'today', icon: '☀︎', label: 'Today' },
  { id: 'jobs', icon: '✉︎', label: 'Jobs' },
  { id: 'gym', icon: '⚑', label: 'Gym' },
  { id: 'add', icon: '＋', label: 'Add goal' },
];

function Shell() {
  const c = useTheme();
  const goals = useTasks();
  const jobs = useJobs();
  const gym = useGym();
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    ensurePermissions().catch(() => {});
    // Pick up changes made on another device when the app comes back to the foreground.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        goals.reload();
        jobs.reload();
        gym.reload();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = goals.ready && jobs.ready && gym.ready;

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {!ready ? (
          <ActivityIndicator style={styles.flex} color={c.accent} />
        ) : tab === 'today' ? (
          <TodayScreen onOpen={setTab} />
        ) : tab === 'jobs' ? (
          <JobsScreen />
        ) : tab === 'gym' ? (
          <GymScreen />
        ) : (
          <AddScreen onSaved={() => setTab('today')} />
        )}
      </View>
      <View style={[styles.tabs, { borderTopColor: c.border, backgroundColor: c.card }]}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={styles.tab} accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}>
            <Text style={{ fontSize: 20, color: tab === t.id ? c.accent : c.muted }}>{t.icon}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: tab === t.id ? c.accent : c.muted }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const c = useTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="auto" />
        <ToastProvider>
          <AuthGate>
            <SettingsProvider>
              <TaskProvider>
                <JobsProvider>
                  <GymProvider>
                    <Shell />
                  </GymProvider>
                </JobsProvider>
              </TaskProvider>
            </SettingsProvider>
          </AuthGate>
        </ToastProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
});
