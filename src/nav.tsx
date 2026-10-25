import { createContext, useContext } from 'react';
import { Workout } from './gym';

export type Tab = 'today' | 'calendar' | 'add';
export type AddKind = 'goal' | 'job' | 'workout';
export type AddIntent = { kind: AddKind; date?: string; workout?: Workout; nonce: number };

export type Nav = {
  tab: Tab;
  go: (tab: Tab) => void;
  /** Open the Add tab on a form, optionally for a given day or to edit a workout. */
  openAdd: (kind?: AddKind, date?: string, workout?: Workout) => void;
  openCalendar: (date: string) => void;
  /** Day the calendar should show; set by openCalendar. */
  calendarDate?: string;
  intent: AddIntent;
};

export const NavCtx = createContext<Nav | null>(null);

export function useNav(): Nav {
  const n = useContext(NavCtx);
  if (!n) throw new Error('useNav must be used inside NavCtx');
  return n;
}
