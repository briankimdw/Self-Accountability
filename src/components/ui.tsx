import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export function Chip({ label, active, onPress, tone }: { label: string; active?: boolean; onPress: () => void; tone?: string }) {
  const c = useTheme();
  const color = tone ?? c.accent;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={[styles.chip, { borderColor: active ? color : c.border, backgroundColor: active ? c.accentSoft : c.card }]}>
      <Text style={{ color: active ? color : c.text, fontWeight: active ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Label({ text }: { text: string }) {
  const c = useTheme();
  return <Text style={[styles.label, { color: c.muted }]}>{text}</Text>;
}

export function Field(props: TextInputProps) {
  const c = useTheme();
  return (
    <TextInput placeholderTextColor={c.muted} {...props}
      style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }, props.style]} />
  );
}

export function Button({ label, onPress, disabled, kind = 'primary', style }: {
  label: string; onPress: () => void; disabled?: boolean; kind?: 'primary' | 'secondary' | 'danger'; style?: ViewStyle;
}) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.accent : c.card;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? c.warn : c.text;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={[styles.button, { backgroundColor: bg, borderColor: kind === 'primary' ? bg : c.border, opacity: disabled ? 0.4 : 1 }, style]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: kind === 'primary' ? 16 : 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, border }: { children: ReactNode; style?: ViewStyle; border?: string }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: border ?? c.border }, style]}>{children}</View>;
}

export function SectionTitle({ text, color }: { text: string; color?: string }) {
  const c = useTheme();
  return <Text style={[styles.section, { color: color ?? c.muted }]}>{text.toUpperCase()}</Text>;
}

export function Stepper({ value, onChange, min = 1, max = 100, suffix }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; suffix?: string;
}) {
  const c = useTheme();
  const btn = (label: string, next: number) => (
    <Pressable onPress={() => onChange(Math.min(max, Math.max(min, next)))} hitSlop={8} accessibilityLabel={label}
      style={[styles.step, { borderColor: c.border, backgroundColor: c.card }]}>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('−', value - 1)}
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>
        {value}{suffix}
      </Text>
      {btn('+', value + 1)}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  button: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 22 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
