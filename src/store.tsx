import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { buildPlan } from './coach';
import { cancelIds, scheduleTask } from './notifications';
import { loadTasks, saveTasks } from './storage';
import { Task } from './types';

type NewTask = Pick<Task, 'title' | 'why' | 'dateKey' | 'time' | 'minutes'>;

type Store = {
  tasks: Task[];
  ready: boolean;
  addTask: (input: NewTask) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  toggleStep: (taskId: string, stepId: string) => Promise<void>;
  reschedule: (id: string, dateKey: string, time?: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const ref = useRef<Task[]>([]);

  useEffect(() => {
    loadTasks().then((t) => {
      ref.current = t;
      setTasks(t);
      setReady(true);
    });
  }, []);

  const commit = useCallback(async (next: Task[]) => {
    ref.current = next;
    setTasks(next);
    await saveTasks(next);
  }, []);

  const update = useCallback(
    async (id: string, fn: (t: Task) => Task | Promise<Task>) => {
      const cur = ref.current.find((t) => t.id === id);
      if (!cur) return;
      const updated = await fn(cur);
      await commit(ref.current.map((t) => (t.id === id ? updated : t)));
    },
    [commit],
  );

  const addTask = useCallback(
    async (input: NewTask) => {
      const task: Task = {
        ...input,
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        plan: buildPlan(input.title, input.minutes),
        done: false,
        notifIds: [],
        createdAt: Date.now(),
      };
      task.notifIds = await scheduleTask(task).catch(() => []);
      await commit([...ref.current, task]);
    },
    [commit],
  );

  const toggleDone = useCallback(
    (id: string) =>
      update(id, async (t) => {
        await cancelIds(t.notifIds);
        const next = { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() };
        next.notifIds = await scheduleTask(next).catch(() => []);
        return next;
      }),
    [update],
  );

  const toggleStep = useCallback(
    (taskId: string, stepId: string) =>
      update(taskId, (t) => ({
        ...t,
        plan: t.plan.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
      })),
    [update],
  );

  const reschedule = useCallback(
    (id: string, dateKey: string, time?: string) =>
      update(id, async (t) => {
        await cancelIds(t.notifIds);
        const next = { ...t, dateKey, time: time ?? t.time, done: false, doneAt: undefined };
        next.notifIds = await scheduleTask(next).catch(() => []);
        return next;
      }),
    [update],
  );

  const removeTask = useCallback(
    async (id: string) => {
      const t = ref.current.find((x) => x.id === id);
      if (t) await cancelIds(t.notifIds);
      await commit(ref.current.filter((x) => x.id !== id));
    },
    [commit],
  );

  return (
    <Ctx.Provider value={{ tasks, ready, addTask, toggleDone, toggleStep, reschedule, removeTask }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTasks(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useTasks must be used inside TaskProvider');
  return s;
}
