import type { DateStr } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateStr(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * 「論理上の今日」。resetHour 前 (例: 深夜3時に reset=4) なら前日扱い。
 */
export function logicalToday(resetHour = 0, now = new Date()): DateStr {
  const d = new Date(now);
  if (d.getHours() < resetHour) d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** b - a (日数) */
export function diffDays(a: DateStr, b: DateStr): number {
  const ms = parseDateStr(b).getTime() - parseDateStr(a).getTime();
  return Math.round(ms / 86400000);
}

export function weekday(s: DateStr): number {
  return parseDateStr(s).getDay();
}

export const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatLong(s: DateStr) {
  const d = parseDateStr(s);
  return {
    weekday: WEEKDAY_EN[d.getDay()],
    weekdayShort: WEEKDAY_SHORT[d.getDay()],
    weekdayJa: WEEKDAY_JA[d.getDay()],
    month: MONTH_SHORT[d.getMonth()],
    day: d.getDate(),
    monthNum: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

/** 'Sep 20' */
export function formatShort(s: DateStr) {
  const f = formatLong(s);
  return `${f.month} ${f.day}`;
}

/** 相対ラベル: 今日 / 明日 / 昨日 / 9/24(水) */
export function relativeLabel(s: DateStr, today: DateStr): string {
  const diff = diffDays(today, s);
  if (diff === 0) return '今日';
  if (diff === 1) return '明日';
  if (diff === -1) return '昨日';
  const f = formatLong(s);
  const sameYear = f.year === parseDateStr(today).getFullYear();
  return `${sameYear ? '' : f.year + '/'}${f.monthNum}/${f.day}(${f.weekdayJa})`;
}

export function timeOfDay(now = new Date()): 'morning' | 'afternoon' | 'night' {
  const h = now.getHours();
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
}

export function isValidTime(t: string) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);
}

export function normalizeTime(t: string) {
  const [h, m] = t.split(':');
  return `${pad(Number(h))}:${pad(Number(m))}`;
}
