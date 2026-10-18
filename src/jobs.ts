import { addDays, todayKey } from './dates';

export type JobStatus = 'applied' | 'interview' | 'offer' | 'rejected';

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  url: string;
  url_key: string;
  status: JobStatus;
  applied_on: string;
  notes: string;
  created_at: string;
};

export const STATUSES: JobStatus[] = ['applied', 'interview', 'offer', 'rejected'];

// Query params that only track where a click came from, not which job it is.
const TRACKING = /^(utm_.*|ref|refid|ref_id|trk|trkinfo|trackingid|src|source|gh_src|lever-source|lever-origin|lever-via|iis|iisn|fbclid|gclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi|from|feedid|referer|referrer|campaign|ebp|eid|tk|vjs|cmp|sid|origin|position|pagenum|hl|lang|locale)$/i;

/**
 * Reduce a job posting URL to a stable key so the same posting reached from
 * different links (tracking params, www, trailing slash) counts as one.
 */
export function normalizeUrl(raw: string): string {
  const m = raw.trim().match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/?#\s]+)([^?#\s]*)(\?[^#\s]*)?/i);
  if (!m || !m[1].includes('.')) return '';
  const host = m[1].toLowerCase().replace(/^(www|m)\./, '').replace(/:\d+$/, '');
  const path = m[2].replace(/\/+$/, '').toLowerCase();
  const params = (m[3] ?? '')
    .slice(1)
    .split('&')
    .filter(Boolean)
    .map((p) => {
      const [k, v = ''] = p.split('=');
      return [decodeURIComponentSafe(k).toLowerCase(), decodeURIComponentSafe(v)] as const;
    });
  const get = (k: string) => params.find(([key]) => key === k)?.[1];

  if (host.endsWith('linkedin.com')) {
    const id = get('currentjobid') ?? path.match(/\/jobs\/view\/(?:[^/]*?-)?(\d+)/)?.[1];
    if (id) return `linkedin.com/jobs/view/${id}`;
  }
  if (host.endsWith('indeed.com')) {
    const jk = get('jk') ?? get('vjk');
    if (jk) return `indeed.com/viewjob?jk=${jk.toLowerCase()}`;
  }

  const kept = params
    .filter(([k]) => !TRACKING.test(k))
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  return host + path + (kept.length ? `?${kept.join('&')}` : '');
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

/** Best guess at the company name from common applicant-tracking-system URLs. */
export function guessCompany(raw: string): string {
  const key = normalizeUrl(raw);
  if (!key) return '';
  const [host, ...rest] = key.split('?')[0].split('/');
  const first = rest[0] ?? '';

  const pathBoards = /(^|\.)((boards|job-boards)\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|apply\.workable\.com|jobs\.smartrecruiters\.com|jobs\.jobvite\.com|ats\.rippling\.com|wellfound\.com)$/;
  if (pathBoards.test(host)) {
    const slug = host === 'wellfound.com' ? rest[1] : first;
    return slug ? titleCase(slug) : '';
  }
  const sub = host.match(/^([a-z0-9-]+)\.(?:wd\d+\.myworkdayjobs\.com|bamboohr\.com|recruitee\.com|breezy\.hr|teamtailor\.com|pinpointhq\.com|applytojob\.com)$/);
  if (sub) return titleCase(sub[1]);
  if (/(linkedin|indeed|glassdoor|ziprecruiter|monster|handshake|simplyhired)\./.test(host)) return '';

  // careers.acme.com, jobs.acme.co.uk, acme.com/careers
  const parts = host.split('.');
  const generic = new Set(['careers', 'jobs', 'career', 'apply', 'work', 'join', 'hire']);
  const core = parts.filter((p) => !generic.has(p));
  const sld = core.length >= 3 && core[core.length - 2].length <= 3 ? core[core.length - 3] : core[core.length - 2];
  return sld ? titleCase(sld) : '';
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export type DuplicateCheck = {
  /** Same posting URL already saved */
  exact?: JobApplication;
  /** Same company with the same or overlapping role */
  similar: JobApplication[];
};

export function findDuplicates(
  apps: JobApplication[],
  input: { url: string; company: string; role: string },
): DuplicateCheck {
  const key = normalizeUrl(input.url);
  const exact = key ? apps.find((a) => a.url_key === key) : undefined;
  const company = norm(input.company);
  const role = norm(input.role);
  const similar = !company
    ? []
    : apps.filter((a) => {
        if (a === exact || norm(a.company) !== company) return false;
        const r = norm(a.role);
        return !role || !r || r === role || r.includes(role) || role.includes(r);
      });
  return { exact, similar };
}

export function countByDay(apps: JobApplication[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of apps) m.set(a.applied_on, (m.get(a.applied_on) ?? 0) + 1);
  return m;
}

/** Consecutive days hitting the daily target. Today counts once met and never breaks the streak. */
export function jobStreak(apps: JobApplication[], target: number): number {
  const counts = countByDay(apps);
  let day = todayKey();
  let streak = 0;
  if ((counts.get(day) ?? 0) >= target) streak++;
  for (day = addDays(day, -1); (counts.get(day) ?? 0) >= target; day = addDays(day, -1)) streak++;
  return streak;
}
