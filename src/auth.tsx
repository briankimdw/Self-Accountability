import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button, Field, T } from './components/ui';
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

  const ready = !!email.trim() && password.length >= 6;

  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <View style={[styles.mark, { backgroundColor: c.goal }]}>
          <Ionicons name="checkmark-done" size={26} color={c.onAccent} />
        </View>
        <T v="hero">Self Accountability</T>
        <T v="body" color={c.muted} style={{ marginBottom: 12 }}>
          Do what you said you would. Goals, job applications and workouts, synced across your phone and computer.
        </T>
        <Field nativeID="email" label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
          autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field nativeID="password" label="Password" value={password} onChangeText={setPassword}
          placeholder="Password (6+ characters)" secureTextEntry
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'} onSubmitEditing={submit} />
        {msg && <T v="small" color={msg.error ? c.danger : c.goal}>{msg.text}</T>}
        <Button label={busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit}
          disabled={!ready || busy} style={{ marginTop: 6 }} />
        <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }} style={{ padding: 12 }}>
          <T v="smallStrong" color={c.goal} style={{ textAlign: 'center' }}>
            {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24 },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 },
  mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
