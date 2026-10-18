import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ensurePermissions } from './src/notifications';
import { AddScreen } from './src/screens/AddScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TaskProvider, useTasks } from './src/store';
import { useTheme } from './src/theme';

type Tab = 'today' | 'add';

function Shell() {
  const c = useTheme();
  const { ready } = useTasks();
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    ensurePermissions().catch(() => {});
  }, []);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="auto" />
      <View style={styles.flex}>
        {!ready ? (
          <ActivityIndicator style={styles.flex} color={c.accent} />
        ) : tab === 'today' ? (
          <TodayScreen />
        ) : (
          <AddScreen onSaved={() => setTab('today')} />
        )}
      </View>
      <View style={[styles.tabs, { borderTopColor: c.border, backgroundColor: c.card }]}>
        {(['today', 'add'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tab} accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}>
            <Text style={{ fontSize: 20, color: tab === t ? c.accent : c.muted }}>{t === 'today' ? '☀︎' : '＋'}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: tab === t ? c.accent : c.muted }}>
              {t === 'today' ? 'Today' : 'Add goal'}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TaskProvider>
        <Shell />
      </TaskProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
});
