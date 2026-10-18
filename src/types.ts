export type Step = { id: string; text: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  why: string;
  /** Local calendar day, YYYY-MM-DD */
  dateKey: string;
  /** Local time of day, HH:mm */
  time: string;
  /** Estimated effort in minutes */
  minutes: number;
  plan: Step[];
  done: boolean;
  doneAt?: number;
  /** Ids of scheduled local notifications, so we can cancel them */
  notifIds: string[];
  createdAt: number;
};
