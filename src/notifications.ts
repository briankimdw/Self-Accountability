import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { firstStep, nudge } from './coach';
import { addDays, formatTime, fromDateKey } from './dates';
import { Task } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
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

function remindersFor(task: Task): Reminder[] {
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
    {
      at: at(due, -15),
      title: `${task.title} starts in 15 minutes`,
      body: `Get ready: ${step}`,
    },
    {
      at: due,
      title: `Time to start: ${task.title}`,
      body: `${step}. ${nudge(task.id, 1)}`,
    },
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

/** Schedule every upcoming reminder for a task and return the ids. */
export async function scheduleTask(task: Task): Promise<string[]> {
  if (task.done) return [];
  const now = Date.now();
  const ids: string[] = [];
  for (const r of remindersFor(task)) {
    if (r.at.getTime() <= now + 5_000) continue;
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.at,
          channelId: 'default',
        },
      }),
    );
  }
  return ids;
}

export async function cancelIds(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}
