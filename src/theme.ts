import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F5F2',
  card: '#FFFFFF',
  text: '#1C1B19',
  muted: '#6E6A63',
  border: '#E4E1DA',
  accent: '#2F6B4F',
  accentSoft: '#DCEBE2',
  warn: '#B4532A',
  warnSoft: '#F6E3D8',
};

const dark: typeof light = {
  bg: '#121211',
  card: '#1D1C1A',
  text: '#F2F0EB',
  muted: '#A19C93',
  border: '#2E2C29',
  accent: '#6FBF95',
  accentSoft: '#1F3529',
  warn: '#E58D62',
  warnSoft: '#3A2419',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
