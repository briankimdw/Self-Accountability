import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { font, Kind, KIND_ICON, kindColor, useTheme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const VARIANTS: Record<string, TextStyle> = {
  hero: { fontFamily: font.displayHeavy, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 29, letterSpacing: -0.4 },
  heading: { fontFamily: font.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  strong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  num: { fontFamily: font.display, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] },
};

export type Variant = keyof typeof VARIANTS;

export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  const c = useTheme();
  return <Text {...rest} style={[VARIANTS[v], { color: color ?? c.ink }, style]} />;
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: string }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: tone ?? c.line }, style]}>{children}</View>
  );
}

export function KindIcon({ kind, size = 34, filled }: { kind: Kind; size?: number; filled?: boolean }) {
  const c = useTheme();
  const { fg, soft } = kindColor(c, kind);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: filled ? fg : soft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={KIND_ICON[kind]} size={size * 0.5} color={filled ? c.onAccent : fg} />
    </View>
  );
}

export function Chip({ label, active, onPress, color, icon }: {
  label: string; active?: boolean; onPress: () => void; color?: string; icon?: IconName;
}) {
  const c = useTheme();
  const fg = color ?? c.goal;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.chip, {
        borderColor: active ? fg : c.line,
        backgroundColor: active ? fg : c.surface,
        opacity: pressed ? 0.8 : 1,
      }]}>
      {icon && <Ionicons name={icon} size={14} color={active ? c.onAccent : c.muted} />}
      <T v="smallStrong" color={active ? c.onAccent : c.ink}>{label}</T>
    </Pressable>
  );
}

export function Button({ label, onPress, disabled, kind = 'primary', icon, color, style }: {
  label: string; onPress: () => void; disabled?: boolean; kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName; color?: string; style?: ViewStyle;
}) {
  const c = useTheme();
  const accent = color ?? c.goal;
  const bg = kind === 'primary' ? accent : kind === 'danger' ? c.dangerSoft : kind === 'secondary' ? c.surface : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.danger : kind === 'ghost' ? accent : c.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [styles.button, {
        backgroundColor: bg,
        borderColor: kind === 'secondary' ? c.line : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        paddingVertical: kind === 'primary' ? 15 : 10,
      }, style]}>
      {icon && <Ionicons name={icon} size={kind === 'primary' ? 18 : 16} color={fg} />}
      <T v={kind === 'primary' ? 'strong' : 'smallStrong'} color={fg}>{label}</T>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityRole="button" hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={18} color={color ?? c.ink} />
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <T v="smallStrong" color={c.muted}>{label}</T>}
      <TextInput placeholderTextColor={c.faint} {...props}
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink, fontFamily: font.body }, style]} />
    </View>
  );
}

export function Segmented<K extends string>({ value, options, onChange }: {
  value: K; onChange: (k: K) => void; options: { key: K; label: string; icon?: IconName; color?: string }[];
}) {
  const c = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[styles.segmentItem, on && { backgroundColor: c.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }]}>
            {o.icon && <Ionicons name={o.icon} size={16} color={on ? o.color ?? c.ink : c.muted} />}
            <T v="smallStrong" color={on ? c.ink : c.muted} numberOfLines={1}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 100, label }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; label?: string;
}) {
  const c = useTheme();
  const btn = (icon: IconName, next: number, a11y: string) => (
    <Pressable onPress={() => onChange(Math.min(max, Math.max(min, next)))} hitSlop={6} accessibilityLabel={a11y}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: c.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={16} color={c.ink} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('remove', value - 1, `Decrease ${label ?? ''}`)}
      <T v="num" style={{ minWidth: 32, textAlign: 'center', fontSize: 18 }}>{value}</T>
      {btn('add', value + 1, `Increase ${label ?? ''}`)}
    </View>
  );
}

/** Circular progress. `value` is 0..1; values above 1 draw a full ring. */
export function Ring({ value, size = 76, stroke = 8, color, track, children }: {
  value: number; size?: number; stroke?: number; color: string; track: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - pct)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
      </Svg>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action, onAction, color }: { title: string; action?: string; onAction?: () => void; color?: string }) {
  const c = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <T v="label" color={color ?? c.muted}>{title}</T>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={8}><T v="smallStrong" color={c.goal}>{action}</T></Pressable>
      )}
    </View>
  );
}

export function Pill({ text, color, soft }: { text: string; color: string; soft: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      <T v="label" color={color} style={{ fontSize: 10, letterSpacing: 0.6 }}>{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  button: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  segmentItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
});
