import type { DateStr, Priority, TimeStr } from '../types';
import { addDays, normalizeTime, weekday } from './date';

/**
 * 簡易スマート入力解析 (外部AIなし)
 *  "レポート 明日"            → title: レポート, due: 明日
 *  "ゴミ出し 月曜 #家"         → due: 次の月曜, tags: [家]
 *  "資料送付 金曜日 !"         → due: 次の金曜, priority: high
 *  "英語30分 毎日"             → repeat: daily
 *  "バイト 18:00"             → time: 18:00
 *  "旅行 10/12" "旅行 10月12日" "3日後" "来週" "いつか"
 */
export interface ParsedInput {
  title: string;
  dueDate?: DateStr;
  someday?: boolean;
  time?: TimeStr;
  priority?: Priority;
  tags: string[];
  repeat?: 'daily' | 'weekdays' | 'weekly';
  /** 認識されたトークン (UIのチップ表示用) */
  chips: string[];
}

const WD: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
const WD_EN: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

/**
 * 今日以降で最も近い指定曜日 (今日が該当なら今日)。
 * forceNextWeek=true なら「来週(月曜始まり)の その曜日」。
 */
function nextWeekday(today: DateStr, target: number, forceNextWeek = false): DateStr {
  const cur = weekday(today);
  if (forceNextWeek) {
    const toNextMonday = (8 - cur) % 7 || 7;
    return addDays(today, toNextMonday + ((target + 6) % 7));
  }
  return addDays(today, (target - cur + 7) % 7);
}

function monthDay(today: DateStr, m: number, d: number): DateStr | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const y = Number(today.slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, '0');
  let s = `${y}-${pad(m)}-${pad(d)}`;
  if (s < today) s = `${y + 1}-${pad(m)}-${pad(d)}`;
  return s;
}

interface TokenResult {
  date?: DateStr;
  someday?: boolean;
  time?: TimeStr;
  priority?: Priority;
  tag?: string;
  repeat?: ParsedInput['repeat'];
  label: string;
}

function parseToken(raw: string, today: DateStr): TokenResult | null {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (!t) return null;

  if (/^[#＃]\S+/.test(t)) return { tag: t.slice(1), label: '#' + t.slice(1) };

  if (/^[!！]{1,3}$/.test(t) || t === '重要' || t === '!高' || lower === '!high')
    return { priority: 'high', label: '優先度 High' };
  if (lower === '!low' || t === '!低') return { priority: 'low', label: '優先度 Low' };
  if (lower === '!mid' || t === '!中') return { priority: 'medium', label: '優先度 Medium' };

  if (['今日', 'きょう', 'today', '本日'].includes(lower)) return { date: today, label: '今日' };
  if (['明日', 'あした', 'あす', 'tomorrow', 'tmr'].includes(lower))
    return { date: addDays(today, 1), label: '明日' };
  if (['明後日', 'あさって'].includes(lower)) return { date: addDays(today, 2), label: '明後日' };
  if (['来週'].includes(lower)) return { date: nextWeekday(today, 1, true), label: '来週月曜' };
  if (['週末', '今週末'].includes(lower)) return { date: nextWeekday(today, 6), label: '週末' };
  if (['いつか', 'someday', 'そのうち'].includes(lower)) return { someday: true, label: 'いつか' };
  if (['毎日', 'daily'].includes(lower)) return { repeat: 'daily', date: today, label: '毎日' };
  if (['平日', 'weekdays'].includes(lower)) return { repeat: 'weekdays', date: today, label: '平日' };

  let m = t.match(/^(\d{1,3})日後$/);
  if (m) return { date: addDays(today, Number(m[1])), label: `${m[1]}日後` };

  m = t.match(/^(来週|次の)?([日月火水木金土])(曜日?|曜)?$/);
  if (m && (m[1] || m[3])) {
    const target = WD[m[2]];
    const d = nextWeekday(today, target, m[1] === '来週');
    return { date: d, label: `${m[1] ?? ''}${m[2]}曜` };
  }
  m = t.match(/^毎週([日月火水木金土])(曜日?)?$/);
  if (m) return { repeat: 'weekly', date: nextWeekday(today, WD[m[1]]), label: `毎週${m[1]}曜` };

  if (lower in WD_EN) {
    return { date: nextWeekday(today, WD_EN[lower]), label: t };
  }

  m = t.match(/^(\d{1,2})[/／.](\d{1,2})$/) ?? t.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (m) {
    const d = monthDay(today, Number(m[1]), Number(m[2]));
    if (d) return { date: d, label: `${Number(m[1])}/${Number(m[2])}` };
  }

  m = t.match(/^([01]?\d|2[0-3])[:：]([0-5]\d)$/);
  if (m) return { time: normalizeTime(`${m[1]}:${m[2]}`), label: normalizeTime(`${m[1]}:${m[2]}`) };
  m = t.match(/^([01]?\d|2[0-3])時(半|([0-5]?\d)分)?$/);
  if (m) {
    const min = m[2] === '半' ? 30 : m[3] ? Number(m[3]) : 0;
    const tm = normalizeTime(`${m[1]}:${min}`);
    return { time: tm, label: tm };
  }
  return null;
}

/** 空白なしで末尾に付いた日付語 ("レポート明日") を切り出す */
const SUFFIX = /(今日|明日|明後日|あした|あさって|来週|週末|[日月火水木金土]曜日?)$/;

export function parseQuickInput(input: string, today: DateStr): ParsedInput {
  const result: ParsedInput = { title: '', tags: [], chips: [] };
  const words = input.trim().split(/[\s　]+/).filter(Boolean);
  const rest: string[] = [];

  const apply = (r: TokenResult) => {
    if (r.tag) result.tags.push(r.tag);
    if (r.date) result.dueDate = r.date;
    if (r.someday) result.someday = true;
    if (r.time) result.time = r.time;
    if (r.priority) result.priority = r.priority;
    if (r.repeat) result.repeat = r.repeat;
    result.chips.push(r.label);
  };

  words.forEach((w, i) => {
    // タイトル先頭の単語は日付語でもタイトルとして扱う ("明日の準備" 対策は下で)
    const r = parseToken(w, today);
    if (r && !(i === 0 && words.length === 1 && !r.tag && !r.priority)) apply(r);
    else rest.push(w);
  });

  let title = rest.join(' ');
  if (!result.dueDate && !result.someday && rest.length > 0) {
    const last = rest[rest.length - 1];
    const sm = last.match(SUFFIX);
    if (sm && last.length > sm[0].length) {
      const r = parseToken(sm[0], today);
      if (r) {
        apply(r);
        rest[rest.length - 1] = last.slice(0, -sm[0].length);
        title = rest.join(' ');
      }
    }
  }
  result.title = title.trim();
  if (!result.title) result.title = input.trim();
  return result;
}
