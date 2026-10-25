import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthGate } from './src/auth';
import { useWide } from './src/components/Screen';
import { IconName, T } from './src/components/ui';
import { GymProvider, JobsProvider, SettingsProvider, useGym, useJobs } from './src/data';
import { Workout } from './src/gym';
import { AddIntent, AddKind, Nav, NavCtx, Tab } from './src/nav';
import { ensurePermissions } from './src/notifications';
import { AddScreen } from './src/screens/AddScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TaskProvider, useTasks } from './src/store';
import { useTheme } from './src/theme';
import { ToastProvider } from './src/toast';

const TABS: { id: Tab; icon: IconName; iconOn: IconName; label: string }[] = [
  { id: 'today', icon: 'sunny-outline', iconOn: 'sunny', label: 'Today' },
  { id: 'calendar', icon: 'calendar-outline', iconOn: 'calendar', label: 'Calendar' },
  { id: 'add', icon: 'add', iconOn: 'add', label: 'Add' },
];

function Shell() {
  const c = useTheme();
  const wide = useWide();
  const goals = useTasks();
  const jobs = useJobs();
  const gym = useGym();
  const [tab, setTab] = useState<Tab>('today');
  const [intent, setIntent] = useState<AddIntent>({ kind: 'goal', nonce: 0 });
  const [calendarDate, setCalendarDate] = useState<string>();

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

  const openAdd = useCallback((kind?: AddKind, date?: string, workout?: Workout) => {
    setIntent((cur) => ({ kind: kind ?? cur.kind, date, workout, nonce: cur.nonce + 1 }));
    setTab('add');
  }, []);
  const go = useCallback((t: Tab) => {
    if (t === 'add') setIntent((cur) => ({ kind: cur.kind, nonce: cur.nonce + 1 }));
    setTab(t);
  }, []);
  const openCalendar = useCallback((date: string) => {
    setCalendarDate(date);
    setTab('calendar');
  }, []);
  const nav: Nav = useMemo(() => ({ tab, go, openAdd, openCalendar, calendarDate, intent }), [tab, go, openAdd, openCalendar, calendarDate, intent]);

  const ready = goals.ready && jobs.ready && gym.ready;

  return (
    <NavCtx.Provider value={nav}>
      <View style={styles.flex}>
        {wide && <TopBar tab={tab} go={go} />}
        <View style={styles.flex}>
          {!ready ? (
            <ActivityIndicator style={styles.flex} color={c.goal} />
          ) : tab === 'today' ? (
            <TodayScreen />
          ) : tab === 'calendar' ? (
            <CalendarScreen />
          ) : (
            <AddScreen />
          )}
        </View>
        {!wide && <BottomBar tab={tab} go={go} />}
      </View>
    </NavCtx.Provider>
  );
}

function TopBar({ tab, go }: { tab: Tab; go: (t: Tab) => void }) {
  const c = useTheme();
  return (
    <View style={[styles.top, { borderBottomColor: c.line, backgroundColor: c.bg }]}>
      <View style={styles.topInner}>
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: c.goal }]}>
            <Ionicons name="checkmark-done" size={16} color={c.onAccent} />
          </View>
          <T v="heading">Self Accountability</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {TABS.filter((t) => t.id !== 'add').map((t) => {
            const on = tab === t.id;
            return (
              <Pressable key={t.id} onPress={() => go(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={[styles.topTab, on && { backgroundColor: c.surfaceAlt }]}>
                <Ionicons name={on ? t.iconOn : t.icon} size={17} color={on ? c.ink : c.muted} />
                <T v="smallStrong" color={on ? c.ink : c.muted}>{t.label}</T>
              </Pressable>
            );
          })}
          <Pressable onPress={() => go('add')} accessibilityRole="tab" accessibilityState={{ selected: tab === 'add' }}
            style={[styles.topTab, { backgroundColor: c.goal, marginLeft: 6 }]}>
            <Ionicons name="add" size={18} color={c.onAccent} />
            <T v="smallStrong" color={c.onAccent}>Add</T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BottomBar({ tab, go }: { tab: Tab; go: (t: Tab) => void }) {
  const c = useTheme();
  return (
    <View style={[styles.bottom, { borderTopColor: c.line, backgroundColor: c.surface }]}>
      {TABS.map((t) => {
        const on = tab === t.id;
        if (t.id === 'add') {
          return (
            <Pressable key={t.id} onPress={() => go('add')} style={styles.bottomTab} accessibilityRole="tab"
              accessibilityState={{ selected: on }} accessibilityLabel="Add">
              <View style={[styles.addBtn, { backgroundColor: c.goal }]}>
                <Ionicons name="add" size={26} color={c.onAccent} />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable key={t.id} onPress={() => go(t.id)} style={styles.bottomTab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Ionicons name={on ? t.iconOn : t.icon} size={22} color={on ? c.ink : c.faint} />
            <T v="smallStrong" color={on ? c.ink : c.faint} style={{ fontSize: 11 }}>{t.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const c = useTheme();
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
  });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="auto" />
        {!fontsLoaded ? (
          <ActivityIndicator style={styles.flex} color={c.goal} />
        ) : (
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
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { borderBottomWidth: 1, paddingHorizontal: 16 },
  topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1120, width: '100%', alignSelf: 'center', paddingVertical: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  topTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  bottom: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 6, paddingBottom: 4 },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4 },
  addBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
});
