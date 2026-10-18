import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from './lib/supabase';
import { useTheme } from './theme';

const Ctx = createContext<Session | null>(null);

export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be used when signed in');
  return s;
};

export const signOut = () => supabase.auth.signOut();

/** Renders children only once signed in; otherwise shows the sign-in screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const c = useTheme();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <ActivityIndicator style={{ flex: 1 }} color={c.accent} />;
  if (!session) return <SignIn />;
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

function SignIn() {
  const c = useTheme();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const submit = async () => {
    if (!email.trim() || password.length < 6 || busy) return;
    setBusy(true);
    setMsg(null);
    const creds = { email: email.trim(), password };
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) setMsg({ text: error.message, error: true });
    } else {
      const { data, error } = await supabase.auth.signUp(creds);
      if (error) setMsg({ text: error.message, error: true });
      else if (!data.session) {
        setMode('in');
        setMsg({ text: `We sent a confirmation link to ${creds.email}. Tap it, then sign in here.`, error: false });
      }
    }
    setBusy(false);
  };

  const input = [styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }];
  const ready = !!email.trim() && password.length >= 6;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.h1, { color: c.text }]}>Self Accountability</Text>
      <Text style={{ color: c.muted, marginBottom: 24 }}>
        Sign in to sync your goals, job applications and workouts across your phone and computer.
      </Text>
      <TextInput nativeID="email" style={input} value={email} onChangeText={setEmail} placeholder="Email"
        placeholderTextColor={c.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput nativeID="password" style={input} value={password} onChangeText={setPassword}
        placeholder="Password (6+ characters)" placeholderTextColor={c.muted} secureTextEntry
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'} onSubmitEditing={submit} />
      {msg && <Text style={{ color: msg.error ? c.warn : c.accent, marginTop: 4 }}>{msg.text}</Text>}
      <Pressable onPress={submit} disabled={!ready || busy}
        style={[styles.btn, { backgroundColor: c.accent, opacity: ready && !busy ? 1 : 0.4 }]}>
        <Text style={styles.btnText}>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}</Text>
      </Pressable>
      <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }} style={{ padding: 12 }}>
        <Text style={{ color: c.accent, textAlign: 'center', fontWeight: '600' }}>
          {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  h1: { fontSize: 28, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  btn: { marginTop: 8, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
