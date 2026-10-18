import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { firstStep, nudge } from './coach';
import { addDays, formatTime, fromDateKey, todayKey } from './dates';
import { Task } from './types';

const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensurePermissions(): Promise<boolean> {
  if (isWeb) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Accountability reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

type Reminder = { at: Date; title: string; body: string };

function goalReminders(task: Task): Reminder[] {
  const due = fromDateKey(task.dateKey, task.time);
  const at = (d: Date, mins: number) => new Date(d.getTime() + mins * 60_000);
  const step = firstStep(task);
  const t = formatTime(task.time);

  return [
    {
      at: fromDateKey(addDays(task.dateKey, -1), '20:00'),
      title: `Tomorrow: ${task.title}`,
      body: `At ${t}. Your first step: ${step}`,
    },
    {
      at: fromDateKey(task.dateKey, '08:00'),
      title: `Today's commitment: ${task.title}`,
      body: task.why ? `Remember why: ${task.why}` : `Planned for ${t}. ${nudge(task.id)}`,
    },
    { at: at(due, -15), title: `${task.title} starts in 15 minutes`, body: `Get ready: ${step}` },
    { at: due, title: `Time to start: ${task.title}`, body: `${step}. ${nudge(task.id, 1)}` },
    {
      at: at(due, 60),
      title: `How is "${task.title}" going?`,
      body: 'Done? Check it off. Not yet? Even 10 minutes counts.',
    },
    {
      at: at(due, 180),
      title: `Still open: ${task.title}`,
      body: `${nudge(task.id, 2)} Finish it or move it to a new time.`,
    },
  ];
}

async function schedule(reminders: Reminder[]): Promise<string[]> {
  const now = Date.now();
  const ids: string[] = [];
  for (const r of reminders) {
    if (r.at.getTime() <= now + 5_000) continue;
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: 'default' },
      }),
    );
  }
  return ids;
}

async function cancel(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

// Scheduled notifications live on each device, so this device remembers what
// it scheduled and reconciles against the synced data whenever it changes.
type Scheduled = Record<string, { sig: string; ids: string[] }>;
const GOALS_KEY = 'reminders/goals/v1';
const JOBS_KEY = 'reminders/jobs/v1';

async function readMap(key: string): Promise<Scheduled> {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) ?? '{}');
  } catch {
    return {};
  }
}

let queue: Promise<unknown> = Promise.resolve();
const serial = (fn: () => Promise<void>) => (queue = queue.then(fn, fn).catch(() => {}));

export function syncGoalReminders(tasks: Task[]) {
  if (isWeb) return;
  return serial(async () => {
    const prev = await readMap(GOALS_KEY);
    const next: Scheduled = {};
    for (const t of tasks) {
      const sig = [t.dateKey, t.time, t.done, t.title, t.why, firstStep(t)].join('|');
      const old = prev[t.id];
      delete prev[t.id];
      if (old?.sig === sig) {
        next[t.id] = old;
        continue;
      }
      if (old) await cancel(old.ids);
      next[t.id] = { sig, ids: t.done ? [] : await schedule(goalReminders(t)) };
    }
    for (const gone of Object.values(prev)) await cancel(gone.ids);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
  });
}

/** Morning and evening nudges toward the daily application target for the next week. */
export function syncJobReminders(doneToday: number, target: number) {
  if (isWeb) return;
  return serial(async () => {
    const prev = await readMap(JOBS_KEY);
    const today = todayKey();
    const sig = `${today}|${doneToday}|${target}`;
    if (prev.all?.sig === sig) return;
    if (prev.all) await cancel(prev.all.ids);

    const left = Math.max(target - doneToday, 0);
    const reminders: Reminder[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      if (i > 0 || doneToday === 0) {
        reminders.push({
          at: fromDateKey(day, '10:00'),
          title: `Today's target: ${target} job applications`,
          body: 'Knock out the first one before lunch.',
        });
      }
      if (i > 0 || left > 0) {
        reminders.push({
          at: fromDateKey(day, '18:00'),
          title: i === 0 ? `${doneToday}/${target} applications today` : `Did you hit ${target} applications today?`,
          body: i === 0 ? `${left} to go. One more application gets you closer.` : 'Log them in the Jobs tab.',
        });
      }
    }
    await AsyncStorage.setItem(JOBS_KEY, JSON.stringify({ all: { sig, ids: await schedule(reminders) } }));
  });
}
