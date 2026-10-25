import { useColorScheme } from 'react-native';

// Three kinds of things you hold yourself to, each with its own hue:
// goals (green), job applications (blue), workouts (orange).
const light = {
  bg: '#F3F4F1',
  surface: '#FFFFFF',
  surfaceAlt: '#EBEDE8',
  ink: '#161A17',
  muted: '#6B716C',
  faint: '#A3A9A4',
  line: '#E1E4DE',
  goal: '#2F6B4F',
  goalSoft: '#DDEBE2',
  job: '#3557A8',
  jobSoft: '#E1E8F6',
  gym: '#B8561B',
  gymSoft: '#F6E4D7',
  danger: '#B42318',
  dangerSoft: '#FBE6E3',
  onAccent: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#0F1210',
  surface: '#181C19',
  surfaceAlt: '#212622',
  ink: '#EEF1EC',
  muted: '#9AA29B',
  faint: '#5D655F',
  line: '#2A302B',
  goal: '#6CC497',
  goalSoft: '#1C3428',
  job: '#8EA9EE',
  jobSoft: '#1E2742',
  gym: '#F0975E',
  gymSoft: '#3A2517',
  danger: '#F07B6E',
  dangerSoft: '#3B1D1A',
  onAccent: '#0F1210',
};

export type Palette = typeof light & {
  // Aliases used by older components
  text: string; card: string; border: string; accent: string; accentSoft: string; warn: string; warnSoft: string;
};

const withAliases = (p: typeof light): Palette => ({
  ...p,
  text: p.ink,
  card: p.surface,
  border: p.line,
  accent: p.goal,
  accentSoft: p.goalSoft,
  warn: p.danger,
  warnSoft: p.dangerSoft,
});

const LIGHT = withAliases(light);
const DARK = withAliases(dark);

export type Theme = Palette;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

export type Kind = 'goal' | 'job' | 'gym';

export const KIND_ICON = { goal: 'flag', job: 'briefcase', gym: 'barbell' } as const;
export const KIND_LABEL = { goal: 'Goal', job: 'Application', gym: 'Workout' } as const;

export const kindColor = (c: Theme, k: Kind) => ({ fg: c[k], soft: c[`${k}Soft`] as string });

export const font = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};
