import { useSession } from './auth';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { todayKey } from './dates';
import { Unit, Workout, WorkoutSet } from './gym';
import { JobApplication, JobStatus, normalizeUrl } from './jobs';
import { supabase } from './lib/supabase';
import { syncJobReminders } from './notifications';
import { useToast } from './toast';

/* ---------- Settings ---------- */

type Settings = { daily_app_target: number; weight_unit: Unit };
const DEFAULT_SETTINGS: Settings = { daily_app_target: 5, weight_unit: 'lb' };

type SettingsStore = Settings & { update: (s: Partial<Settings>) => Promise<void> };
const SettingsCtx = createContext<SettingsStore | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const session = useSession();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    supabase.from('settings').select('daily_app_target, weight_unit').maybeSingle().then(({ data }) => {
      if (data) setSettings(data as Settings);
    });
  }, []);

  const update = useCallback(
    async (changes: Partial<Settings>) => {
      const before = settings;
      const next = { ...settings, ...changes };
      setSettings(next);
      const { error } = await supabase.from('settings').upsert({ ...next, user_id: session.user.id, updated_at: new Date().toISOString() });
      if (error) {
        setSettings(before);
        toast(`Couldn't save setting: ${error.message}`, 'error');
      }
    },
    [settings, session, toast],
  );

  return <SettingsCtx.Provider value={{ ...settings, update }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => {
  const s = useContext(SettingsCtx);
  if (!s) throw new Error('useSettings must be used inside SettingsProvider');
  return s;
};

/* ---------- Job applications ---------- */

export type NewApplication = Pick<JobApplication, 'company' | 'role' | 'url' | 'notes' | 'applied_on'>;

type JobsStore = {
  apps: JobApplication[];
  ready: boolean;
  reload: () => Promise<void>;
  addApp: (input: NewApplication) => Promise<boolean>;
  setStatus: (id: string, status: JobStatus) => Promise<void>;
  removeApp: (id: string) => Promise<void>;
};
const JobsCtx = createContext<JobsStore | null>(null);

const newestApps = (a: JobApplication, b: JobApplication) =>
  b.applied_on.localeCompare(a.applied_on) || b.created_at.localeCompare(a.created_at);

export function JobsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { daily_app_target } = useSettings();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [ready, setReady] = useState(false);
  const ref = useRef<JobApplication[]>([]);
  const set = (next: JobApplication[]) => {
    ref.current = next;
    setApps(next);
  };

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('job_applications').select('*').order('applied_on', { ascending: false });
    if (error) toast(`Couldn't load applications: ${error.message}`, 'error');
    else set((data as JobApplication[]).sort(newestApps));
    setReady(true);
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const doneToday = useMemo(() => apps.filter((a) => a.applied_on === todayKey()).length, [apps]);
  useEffect(() => {
    if (ready) syncJobReminders(doneToday, daily_app_target);
  }, [ready, doneToday, daily_app_target]);

  const addApp = useCallback(
    async (input: NewApplication) => {
      const row = { ...input, url: input.url.trim(), url_key: normalizeUrl(input.url) };
      const { data, error } = await supabase.from('job_applications').insert(row).select().single();
      if (error) {
        toast(
          error.code === '23505' ? 'You already saved this job posting.' : `Couldn't save: ${error.message}`,
          'error',
        );
        return false;
      }
      set([data as JobApplication, ...ref.current].sort(newestApps));
      return true;
    },
    [toast],
  );

  const setStatus = useCallback(
    async (id: string, status: JobStatus) => {
      const before = ref.current;
      set(before.map((a) => (a.id === id ? { ...a, status } : a)));
      const { error } = await supabase.from('job_applications').update({ status }).eq('id', id);
      if (error) {
        set(before);
        toast(`Couldn't update: ${error.message}`, 'error');
      }
    },
    [toast],
  );

  const removeApp = useCallback(
    async (id: string) => {
      const before = ref.current;
      set(before.filter((a) => a.id !== id));
      const { error } = await supabase.from('job_applications').delete().eq('id', id);
      if (error) {
        set(before);
        toast(`Couldn't delete: ${error.message}`, 'error');
      }
    },
    [toast],
  );

  return (
    <JobsCtx.Provider value={{ apps, ready, reload, addApp, setStatus, removeApp }}>{children}</JobsCtx.Provider>
  );
}

export const useJobs = () => {
  const s = useContext(JobsCtx);
  if (!s) throw new Error('useJobs must be used inside JobsProvider');
  return s;
};

/* ---------- Gym ---------- */

export type DraftSet = { exercise: string; weight: number; reps: number };
export type DraftWorkout = { id?: string; performed_on: string; name: string; notes: string; sets: DraftSet[] };

type GymStore = {
  workouts: Workout[];
  ready: boolean;
  reload: () => Promise<void>;
  saveWorkout: (w: DraftWorkout) => Promise<boolean>;
  removeWorkout: (id: string) => Promise<void>;
};
const GymCtx = createContext<GymStore | null>(null);

type WorkoutRow = Omit<Workout, 'sets'> & { workout_sets: WorkoutSet[] };

export function GymProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select('id, performed_on, name, notes, created_at, workout_sets(id, workout_id, exercise, position, weight, reps)')
      .order('performed_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) toast(`Couldn't load workouts: ${error.message}`, 'error');
    else
      setWorkouts(
        (data as WorkoutRow[]).map(({ workout_sets, ...w }) => ({
          ...w,
          sets: [...workout_sets].map((s) => ({ ...s, weight: Number(s.weight) })).sort((a, b) => a.position - b.position),
        })),
      );
    setReady(true);
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveWorkout = useCallback(
    async (w: DraftWorkout) => {
      const fields = { performed_on: w.performed_on, name: w.name.trim(), notes: w.notes.trim() };
      let id = w.id;
      const res = id
        ? await supabase.from('workouts').update(fields).eq('id', id).select('id').single()
        : await supabase.from('workouts').insert(fields).select('id').single();
      if (res.error) {
        toast(`Couldn't save workout: ${res.error.message}`, 'error');
        return false;
      }
      id = res.data.id as string;

      // Write the new sets before removing the old ones, so a failure never loses data.
      const old = workouts.find((x) => x.id === id)?.sets.map((s) => s.id) ?? [];
      const rows = w.sets.map((s, i) => ({ workout_id: id, exercise: s.exercise.trim(), position: i, weight: s.weight, reps: s.reps }));
      if (rows.length) {
        const { error } = await supabase.from('workout_sets').insert(rows);
        if (error) {
          toast(`Couldn't save sets: ${error.message}`, 'error');
          await reload();
          return false;
        }
      }
      if (old.length) await supabase.from('workout_sets').delete().in('id', old);
      await reload();
      return true;
    },
    [workouts, reload, toast],
  );

  const removeWorkout = useCallback(
    async (id: string) => {
      const before = workouts;
      setWorkouts(before.filter((w) => w.id !== id));
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) {
        setWorkouts(before);
        toast(`Couldn't delete: ${error.message}`, 'error');
      }
    },
    [workouts, toast],
  );

  return <GymCtx.Provider value={{ workouts, ready, reload, saveWorkout, removeWorkout }}>{children}</GymCtx.Provider>;
}

export const useGym = () => {
  const s = useContext(GymCtx);
  if (!s) throw new Error('useGym must be used inside GymProvider');
  return s;
};
