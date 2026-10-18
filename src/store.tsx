import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { buildPlan } from './coach';
import { supabase } from './lib/supabase';
import { syncGoalReminders } from './notifications';
import { useToast } from './toast';
import { Task } from './types';

type NewTask = Pick<Task, 'title' | 'why' | 'dateKey' | 'time' | 'minutes'>;

type Store = {
  tasks: Task[];
  ready: boolean;
  reload: () => Promise<void>;
  addTask: (input: NewTask) => Promise<boolean>;
  toggleDone: (id: string) => Promise<void>;
  toggleStep: (taskId: string, stepId: string) => Promise<void>;
  reschedule: (id: string, dateKey: string, time?: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
};

type Row = {
  id: string; title: string; why: string; date_key: string; time: string; minutes: number;
  plan: Task['plan']; done: boolean; done_at: string | null; created_at: string;
};

const fromRow = (r: Row): Task => ({
  id: r.id, title: r.title, why: r.why, dateKey: r.date_key, time: r.time, minutes: r.minutes,
  plan: r.plan ?? [], done: r.done, doneAt: r.done_at ? Date.parse(r.done_at) : undefined,
  createdAt: Date.parse(r.created_at),
});

const toRow = (t: Partial<Task>) => ({
  ...(t.title !== undefined && { title: t.title }),
  ...(t.why !== undefined && { why: t.why }),
  ...(t.dateKey !== undefined && { date_key: t.dateKey }),
  ...(t.time !== undefined && { time: t.time }),
  ...(t.minutes !== undefined && { minutes: t.minutes }),
  ...(t.plan !== undefined && { plan: t.plan }),
  ...(t.done !== undefined && { done: t.done, done_at: t.done ? new Date().toISOString() : null }),
});

/** Goals saved on this device before the database existed. */
const LEGACY_KEY = 'self-accountability/tasks/v1';

async function migrateLegacy() {
  const raw = await AsyncStorage.getItem(LEGACY_KEY).catch(() => null);
  if (!raw) return;
  const old = JSON.parse(raw) as Task[];
  const real = old.filter((t) => !t.id.startsWith('ex-')); // skip the web preview's examples
  if (real.length) {
    const { error } = await supabase.from('goals').insert(real.map((t) => toRow(t)));
    if (error) return;
  }
  await AsyncStorage.removeItem(LEGACY_KEY);
}

const Ctx = createContext<Store | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const ref = useRef<Task[]>([]);

  const set = useCallback((next: Task[]) => {
    ref.current = next;
    setTasks(next);
    syncGoalReminders(next);
  }, []);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('goals').select('*').order('date_key').order('time');
    if (error) toast(`Couldn't load goals: ${error.message}`, 'error');
    else set((data as Row[]).map(fromRow));
    setReady(true);
  }, [set, toast]);

  useEffect(() => {
    migrateLegacy().finally(reload);
  }, [reload]);

  /** Optimistic update: apply locally, write to the database, roll back on failure. */
  const patch = useCallback(
    async (id: string, fn: (t: Task) => Partial<Task>) => {
      const before = ref.current;
      const cur = before.find((t) => t.id === id);
      if (!cur) return;
      const changes = fn(cur);
      set(before.map((t) => (t.id === id ? { ...t, ...changes } : t)));
      const { error } = await supabase.from('goals').update(toRow(changes)).eq('id', id);
      if (error) {
        set(before);
        toast(`Couldn't save: ${error.message}`, 'error');
      }
    },
    [set, toast],
  );

  const addTask = useCallback(
    async (input: NewTask) => {
      const { data, error } = await supabase
        .from('goals')
        .insert(toRow({ ...input, plan: buildPlan(input.title, input.minutes) }))
        .select()
        .single();
      if (error) {
        toast(`Couldn't save goal: ${error.message}`, 'error');
        return false;
      }
      set([...ref.current, fromRow(data as Row)]);
      return true;
    },
    [set, toast],
  );

  const toggleDone = useCallback((id: string) => patch(id, (t) => ({ done: !t.done })), [patch]);

  const toggleStep = useCallback(
    (taskId: string, stepId: string) =>
      patch(taskId, (t) => ({ plan: t.plan.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) })),
    [patch],
  );

  const reschedule = useCallback(
    (id: string, dateKey: string, time?: string) =>
      patch(id, (t) => ({ dateKey, time: time ?? t.time, done: false })),
    [patch],
  );

  const removeTask = useCallback(
    async (id: string) => {
      const before = ref.current;
      set(before.filter((t) => t.id !== id));
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) {
        set(before);
        toast(`Couldn't delete: ${error.message}`, 'error');
      }
    },
    [set, toast],
  );

  return (
    <Ctx.Provider value={{ tasks, ready, reload, addTask, toggleDone, toggleStep, reschedule, removeTask }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTasks(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useTasks must be used inside TaskProvider');
  return s;
}
