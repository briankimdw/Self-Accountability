import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Field, Ring, Stepper, T } from '../components/ui';
import { useJobs, useSettings } from '../data';
import { addDays, formatDay, todayKey } from '../dates';
import { findDuplicates, guessCompany } from '../jobs';
import { useTheme } from '../theme';
import { useToast } from '../toast';

export function JobForm({ initialDate }: { initialDate?: string }) {
  const c = useTheme();
  const toast = useToast();
  const { apps, addApp } = useJobs();
  const { daily_app_target: target, update } = useSettings();
  const today = todayKey();

  const [url, setUrl] = useState('');
  const [company, setCompany] = useState('');
  const [companyTouched, setCompanyTouched] = useState(false);
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [appliedOn, setAppliedOn] = useState(initialDate && initialDate <= today ? initialDate : today);
  const [saving, setSaving] = useState(false);

  const doneToday = apps.filter((a) => a.applied_on === today).length;
  const dupes = useMemo(() => findDuplicates(apps, { url, company, role }), [apps, url, company, role]);
  const dates = [...new Set([today, addDays(today, -1), addDays(today, -2), appliedOn])].sort().reverse();

  const onUrl = (v: string) => {
    setUrl(v);
    if (!companyTouched) setCompany(guessCompany(v));
  };

  const save = async () => {
    if (!company.trim() || dupes.exact || saving) return;
    setSaving(true);
    const ok = await addApp({ company: company.trim(), role: role.trim(), url, notes: notes.trim(), applied_on: appliedOn });
    setSaving(false);
    if (!ok) return;
    setUrl(''); setCompany(''); setCompanyTouched(false); setRole(''); setNotes('');
    if (appliedOn !== today) return toast(`Logged for ${formatDay(appliedOn).toLowerCase()}.`);
    const n = doneToday + 1;
    toast(n === target ? `Target hit: ${n}/${target} today!` : n > target ? `${n} today. Past your target.` : `Logged. ${n}/${target} today, ${target - n} to go.`);
  };

  return (
    <View style={{ gap: 18 }}>
      <Card style={styles.progress}>
        <Ring value={doneToday / target} size={64} stroke={7} color={c.job} track={c.jobSoft}>
          <T v="num" style={{ fontSize: 18 }}>{doneToday}</T>
        </Ring>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="strong">{doneToday >= target ? 'Daily target hit' : `${target - doneToday} to go today`}</T>
          <T v="small" color={c.muted}>Daily target</T>
        </View>
        <Stepper value={target} onChange={(n) => update({ daily_app_target: n })} min={1} max={50} label="daily target" />
      </Card>

      <Field nativeID="job-url" label="Job posting link" value={url} onChangeText={onUrl}
        placeholder="Paste the URL" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      {dupes.exact && (
        <Warning tone="block" title="Already applied"
          text={`${dupes.exact.company}${dupes.exact.role ? ` · ${dupes.exact.role}` : ''}, ${formatDay(dupes.exact.applied_on).toLowerCase()}. The same posting can't be logged twice.`} />
      )}
      <View style={styles.pair}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Field nativeID="job-company" label="Company" value={company}
            onChangeText={(v) => { setCompany(v); setCompanyTouched(true); }} placeholder="e.g. Stripe" />
        </View>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Field nativeID="job-role" label="Role" value={role} onChangeText={setRole} placeholder="e.g. Software Engineer" />
        </View>
      </View>
      {!dupes.exact && dupes.similar.length > 0 && (
        <Warning tone="caution" title="Possible duplicate"
          text={`You applied to ${dupes.similar.slice(0, 3).map((a) => `${a.company} · ${a.role || 'no role'} (${formatDay(a.applied_on).toLowerCase()})`).join(', ')}. You can still log it if it's a different posting.`} />
      )}

      <View style={{ gap: 8 }}>
        <T v="smallStrong" color={c.muted}>Applied</T>
        <View style={styles.wrap}>
          {dates.map((d) => <Chip key={d} label={formatDay(d)} color={c.job} active={appliedOn === d} onPress={() => setAppliedOn(d)} />)}
        </View>
      </View>

      <Field nativeID="job-notes" label="Notes (optional)" value={notes} onChangeText={setNotes}
        placeholder="Referral, salary range, recruiter name…" />

      <Button label={saving ? 'Saving…' : 'Log application'} icon="briefcase" color={c.job} onPress={save}
        disabled={!company.trim() || !!dupes.exact || saving} />
    </View>
  );
}

function Warning({ title, text, tone }: { title: string; text: string; tone: 'block' | 'caution' }) {
  const c = useTheme();
  const fg = tone === 'block' ? c.danger : c.gym;
  return (
    <View style={[styles.warning, { backgroundColor: tone === 'block' ? c.dangerSoft : c.gymSoft }]}>
      <Ionicons name={tone === 'block' ? 'close-circle' : 'alert-circle'} size={18} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="smallStrong" color={fg}>{title}</T>
        <T v="small">{text}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pair: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warning: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, marginTop: -8 },
});
