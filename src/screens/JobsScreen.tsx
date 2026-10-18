import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Label, SectionTitle, Stepper } from '../components/ui';
import { useJobs, useSettings } from '../data';
import { addDays, formatDay, fromDateKey, todayKey } from '../dates';
import { countByDay, findDuplicates, guessCompany, JobApplication, jobStreak, STATUSES } from '../jobs';
import { useTheme } from '../theme';
import { useToast } from '../toast';

const STATUS_LABEL = { applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' } as const;

export function JobsScreen() {
  const c = useTheme();
  const toast = useToast();
  const { apps, addApp } = useJobs();
  const { daily_app_target: target, update } = useSettings();

  const [url, setUrl] = useState('');
  const [company, setCompany] = useState('');
  const [companyTouched, setCompanyTouched] = useState(false);
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [appliedOn, setAppliedOn] = useState(todayKey());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | JobApplication['status']>('all');
  const [query, setQuery] = useState('');

  const today = todayKey();
  const counts = useMemo(() => countByDay(apps), [apps]);
  const doneToday = counts.get(today) ?? 0;
  const streak = useMemo(() => jobStreak(apps, target), [apps, target]);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekTotal = week.reduce((n, d) => n + (counts.get(d) ?? 0), 0);

  const dupes = useMemo(() => findDuplicates(apps, { url, company, role }), [apps, url, company, role]);

  const onUrl = (v: string) => {
    setUrl(v);
    if (!companyTouched) setCompany(guessCompany(v));
  };

  const reset = () => {
    setUrl(''); setCompany(''); setCompanyTouched(false); setRole(''); setNotes('');
  };

  const save = async () => {
    if (!company.trim() || dupes.exact || saving) return;
    setSaving(true);
    const ok = await addApp({ company: company.trim(), role: role.trim(), url, notes: notes.trim(), applied_on: appliedOn });
    setSaving(false);
    if (!ok) return;
    reset();
    if (appliedOn !== today) return toast(`Logged for ${formatDay(appliedOn)}.`);
    const n = doneToday + 1;
    toast(n >= target ? (n === target ? `Target hit: ${n}/${target} today!` : `${n} today. Going past your target.`) : `Logged. ${n}/${target} today, ${target - n} to go.`);
  };

  const shown = apps.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${a.company} ${a.role}`.toLowerCase().includes(q);
  });
  const groups = new Map<string, JobApplication[]>();
  for (const a of shown.slice(0, 200)) groups.set(a.applied_on, [...(groups.get(a.applied_on) ?? []), a]);
  const pct = Math.min(doneToday / target, 1);

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={[styles.h1, { color: c.text }]}>Job applications</Text>

      <Card style={{ marginTop: 14 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.big, { color: c.text }]}>{doneToday}<Text style={{ color: c.muted, fontSize: 20 }}> / {target}</Text></Text>
            <Text style={{ color: c.muted }}>
              {doneToday >= target ? 'Daily target hit. Nice work.' : `${target - doneToday} more to hit today's target`}
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Stepper value={target} onChange={(n) => update({ daily_app_target: n })} min={1} max={50} />
            <Text style={{ color: c.muted, fontSize: 12 }}>daily target</Text>
          </View>
        </View>
        <View style={[styles.bar, { backgroundColor: c.accentSoft }]}>
          <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: c.accent }]} />
        </View>
        <View style={styles.week}>
          {week.map((d) => {
            const n = counts.get(d) ?? 0;
            const hit = n >= target;
            return (
              <View key={d} style={styles.day}>
                <View style={[styles.dayDot, { backgroundColor: hit ? c.accent : n ? c.accentSoft : 'transparent', borderColor: hit || n ? c.accent : c.border }]}>
                  <Text style={{ color: hit ? '#fff' : c.text, fontWeight: '700', fontSize: 13 }}>{n}</Text>
                </View>
                <Text style={{ color: d === today ? c.accent : c.muted, fontSize: 11, fontWeight: d === today ? '700' : '500' }}>
                  {fromDateKey(d).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={{ color: c.muted, fontSize: 13, marginTop: 8 }}>
          {weekTotal} this week · {streak} day{streak === 1 ? '' : 's'} in a row on target · {apps.length} total
        </Text>
      </Card>

      <SectionTitle text="Log an application" />
      <Card>
        <Field nativeID="job-url" value={url} onChangeText={onUrl} placeholder="Paste the job posting URL"
          autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        {dupes.exact && (
          <Warning tone="warn" text={`Already applied: ${dupes.exact.company}${dupes.exact.role ? ` · ${dupes.exact.role}` : ''} on ${formatDay(dupes.exact.applied_on)}. This posting can't be logged twice.`} />
        )}
        <Label text="Company" />
        <Field nativeID="job-company" value={company} onChangeText={(v) => { setCompany(v); setCompanyTouched(true); }}
          placeholder="e.g. Stripe" />
        <Label text="Role" />
        <Field nativeID="job-role" value={role} onChangeText={setRole} placeholder="e.g. Software Engineer, New Grad" />
        {!dupes.exact && dupes.similar.length > 0 && (
          <Warning tone="caution"
            text={`Possible duplicate. You applied to ${dupes.similar.length === 1 ? 'this' : `${dupes.similar.length} similar`} ${company.trim()} role${dupes.similar.length === 1 ? '' : 's'}: ${dupes.similar.slice(0, 3).map((a) => `${a.role || 'no role'} (${formatDay(a.applied_on)})`).join(', ')}. You can still log it if it's a different posting.`} />
        )}
        <Label text="Applied" />
        <View style={styles.wrapRow}>
          {[0, -1, -2].map((o) => {
            const d = addDays(today, o);
            return <Chip key={d} label={formatDay(d)} active={appliedOn === d} onPress={() => setAppliedOn(d)} />;
          })}
        </View>
        <Label text="Notes (optional)" />
        <Field nativeID="job-notes" value={notes} onChangeText={setNotes} placeholder="Referral, salary range, recruiter name…" />
        <Button label={saving ? 'Saving…' : 'Log application'} onPress={save}
          disabled={!company.trim() || !!dupes.exact || saving} style={{ marginTop: 14 }} />
      </Card>

      <SectionTitle text="History" />
      <Field nativeID="job-search" value={query} onChangeText={setQuery} placeholder="Search company or role" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        <Chip label={`All (${apps.length})`} active={filter === 'all'} onPress={() => setFilter('all')} />
        {STATUSES.map((s) => (
          <Chip key={s} label={`${STATUS_LABEL[s]} (${apps.filter((a) => a.status === s).length})`}
            active={filter === s} onPress={() => setFilter(s)} />
        ))}
      </ScrollView>
      {groups.size === 0 && (
        <Text style={{ color: c.muted, paddingVertical: 8 }}>
          {apps.length ? 'Nothing matches.' : 'No applications yet. Paste a job link above to log your first one.'}
        </Text>
      )}
      {[...groups].map(([day, list]) => (
        <View key={day} style={{ marginBottom: 6 }}>
          <Text style={{ color: c.muted, fontWeight: '600', marginVertical: 6 }}>
            {formatDay(day)} · {list.length}
          </Text>
          {list.map((a) => <AppRow key={a.id} app={a} />)}
        </View>
      ))}
    </ScrollView>
  );
}

function Warning({ text, tone }: { text: string; tone: 'warn' | 'caution' }) {
  const c = useTheme();
  return (
    <View style={[styles.warning, { backgroundColor: c.warnSoft, borderColor: tone === 'warn' ? c.warn : c.border }]}>
      <Text style={{ color: c.text }}>{tone === 'warn' ? '⛔ ' : '⚠️ '}{text}</Text>
    </View>
  );
}

function AppRow({ app }: { app: JobApplication }) {
  const c = useTheme();
  const { setStatus, removeApp } = useJobs();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const tone = { applied: c.muted, interview: c.accent, offer: c.accent, rejected: c.warn }[app.status];

  return (
    <Card style={{ marginBottom: 8, padding: 12 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{app.company}</Text>
          {!!app.role && <Text style={{ color: c.muted }}>{app.role}</Text>}
        </View>
        <View style={[styles.pill, { borderColor: tone }]}>
          <Text style={{ color: tone, fontWeight: '700', fontSize: 12 }}>{STATUS_LABEL[app.status]}</Text>
        </View>
      </Pressable>
      {open && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {!!app.url && (
            <Pressable onPress={() => Linking.openURL(/^https?:\/\//i.test(app.url) ? app.url : `https://${app.url}`)}>
              <Text style={{ color: c.accent, textDecorationLine: 'underline' }} numberOfLines={1}>{app.url}</Text>
            </Pressable>
          )}
          {!!app.notes && <Text style={{ color: c.text }}>{app.notes}</Text>}
          <View style={styles.wrapRow}>
            {STATUSES.map((s) => (
              <Chip key={s} label={STATUS_LABEL[s]} active={app.status === s} onPress={() => setStatus(app.id, s)} />
            ))}
          </View>
          {confirm ? (
            <View style={styles.wrapRow}>
              <Button kind="danger" label="Yes, delete" onPress={() => removeApp(app.id)} />
              <Button kind="secondary" label="Cancel" onPress={() => setConfirm(false)} />
            </View>
          ) : (
            <Button kind="secondary" label="Delete" onPress={() => setConfirm(true)} style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 60 },
  h1: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bar: { height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  barFill: { height: 6 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  day: { alignItems: 'center', gap: 4 },
  dayDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  warning: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10 },
  pill: { borderWidth: 1, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
