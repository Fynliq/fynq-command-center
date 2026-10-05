/**
 * Time, in one place.
 *
 * Every timestamp is handled as a UTC instant. Calendar days and hours are
 * America/Chicago, because that is where the people reading the dashboard
 * are: "today" starts at midnight Chicago time, and a daily chart groups by
 * the Chicago calendar day.
 */

export const DISPLAY_TZ = 'America/Chicago';
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const dayLabelFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const hourLabelFormat = new Intl.DateTimeFormat('en-US', { timeZone: DISPLAY_TZ, hour: 'numeric' });

/** "2026-09-30": the Chicago calendar day of an instant. */
export function dayKey(at: Date | number): string {
  return dayKeyFormat.format(typeof at === 'number' ? new Date(at) : at);
}

/** "Sep 30" for a day key. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayLabelFormat.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** "3 PM" in Chicago for an instant. */
export function hourLabel(at: number): string {
  return hourLabelFormat.format(new Date(at));
}

/** Chicago wall-clock minus UTC, in ms, at an instant (e.g. -5h in summer). */
function offsetAt(ms: number): number {
  const parts = partsFormat.formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return wall - (ms - (ms % 1000));
}

/** The UTC instant of midnight Chicago time on a day key. Handles DST. */
export function startOfDay(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let at = guess - offsetAt(guess);
  const corrected = guess - offsetAt(at);
  if (corrected !== at) at = corrected;
  return at;
}

/** The day key after (or before, with a negative step) another. Pure calendar arithmetic. */
export function addDays(key: string, step: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + step));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/** Every day key from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < 4000; k = addDays(k, 1)) out.push(k);
  return out;
}

export const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : null;
};

/**
 * The windows every "change vs previous period" uses.
 * Today is compared with yesterday up to the same clock time, so a morning
 * is never compared with a whole day.
 */
export interface Window { start: number; end: number }
export interface WindowPair { current: Window; previous: Window; label: string; compareLabel: string }

export function windows(now: number) {
  const todayStart = startOfDay(dayKey(now));
  const yesterdayStart = startOfDay(addDays(dayKey(now), -1));
  const pair = (span: number, label: string, compareLabel: string): WindowPair => ({
    current: { start: now - span, end: now + 1 },
    previous: { start: now - 2 * span, end: now - span },
    label,
    compareLabel,
  });
  return {
    today: { current: { start: todayStart, end: now + 1 }, previous: { start: yesterdayStart, end: yesterdayStart + (now - todayStart) }, label: 'Today', compareLabel: 'vs yesterday at this time' } as WindowPair,
    h24: pair(DAY, '24H', 'vs previous 24 hours'),
    d7: pair(7 * DAY, '7D', 'vs previous 7 days'),
    d30: pair(30 * DAY, '30D', 'vs previous 30 days'),
    /** Totals and rates are compared with their own value as of 7 days ago. */
    weekAgo: now - 7 * DAY,
  };
}

export const inWindow = (ms: number | null, w: Window) => ms !== null && ms >= w.start && ms < w.end;
