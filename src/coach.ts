import { Step, Task } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Break a goal into a short, concrete plan sized to the time available.
 * Small first steps lower the barrier to starting, which is the hard part.
 */
export function buildPlan(title: string, minutes: number): Step[] {
  const s = (text: string): Step => ({ id: uid(), text, done: false });
  const steps: Step[] = [
    s('Set up: gather what you need and silence distractions (2 min)'),
    s(`Just start "${title}" for 5 minutes. Stopping after that is allowed`),
  ];

  if (minutes <= 20) {
    steps.push(s('Finish it off and check it here'));
    return steps;
  }

  // Longer goals become focus blocks with short breaks.
  const blocks = Math.min(Math.ceil(minutes / 30), 6);
  for (let i = 1; i <= blocks; i++) {
    steps.push(s(`Focus block ${i} of ${blocks} (about ${Math.round(minutes / blocks)} min)`));
    if (i < blocks) steps.push(s('Stand up, water, 5 minute break'));
  }
  steps.push(s('Wrap up: note what is left, then check it off'));
  return steps;
}

const hash = (str: string) =>
  [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const pick = <T,>(arr: T[], seed: string, salt = 0): T =>
  arr[(hash(seed) + salt) % arr.length];

const NUDGES = [
  'Future you is counting on this.',
  'Momentum beats motivation. Start small.',
  'You said it mattered. Show up for it.',
  'Ten focused minutes beats zero.',
  'Do it badly if you have to. Just do it.',
  'Every kept promise makes the next one easier.',
];

const CHEERS = [
  'Done. That is a promise kept.',
  'Nice work. You did what you said you would.',
  'Crushed it. Enjoy that feeling.',
  'Proof you can count on yourself.',
];

export const nudge = (seed: string, salt = 0) => pick(NUDGES, seed, salt);
export const cheer = (seed: string) => pick(CHEERS, seed);

export function firstStep(task: Pick<Task, 'plan'>): string {
  return task.plan.find((p) => !p.done)?.text ?? 'Get started';
}

export function progress(task: Task): number {
  if (task.done) return 1;
  if (!task.plan.length) return 0;
  return task.plan.filter((p) => p.done).length / task.plan.length;
}
