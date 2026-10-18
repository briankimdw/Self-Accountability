import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './theme';

type Toast = (text: string, kind?: 'info' | 'error') => void;
const Ctx = createContext<Toast>(() => {});
export const useToast = () => useContext(Ctx);

/** Short message bar above the tab bar. Works the same on phone and web. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useTheme();
  const [msg, setMsg] = useState<{ text: string; kind: 'info' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<Toast>((text, kind = 'info') => {
    clearTimeout(timer.current);
    setMsg({ text, kind });
    timer.current = setTimeout(() => setMsg(null), kind === 'error' ? 5000 : 2800);
  }, []);

  return (
    <Ctx.Provider value={show}>
      <View style={{ flex: 1 }}>
        {children}
        {msg && (
          <View pointerEvents="none" style={styles.wrap}>
            <View style={[styles.toast, { backgroundColor: msg.kind === 'error' ? c.warn : c.text }]}>
              <Text style={{ color: c.bg, fontWeight: '600', textAlign: 'center' }}>{msg.text}</Text>
            </View>
          </View>
        )}
      </View>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 80, alignItems: 'center' },
  toast: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, maxWidth: 480 },
});
