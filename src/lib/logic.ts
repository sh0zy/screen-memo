import type { DateStr, Habit, Priority, RepeatRule, Task, TaskBucket } from '../types';
import { addDays, diffDays, parseDateStr, toDateStr, weekday } from './date';

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function isLive(t: { deletedAt?: number; archived: boolean }) {
  return !t.deletedAt && !t.archived;
}

export function bucketOf(task: Task, today: DateStr): TaskBucket {
  if (task.completed) return 'completed';
  if (!task.dueDate) return 'someday';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  if (task.dueDate === addDays(today, 1)) return 'tomorrow';
  return 'upcoming';
}

export function completedOn(task: Task, day: DateStr) {
  return task.completed && task.completedAt !== undefined && toDateStr(new Date(task.completedAt)) === day;
}

/** Today に並ぶタスク: 期限切れ + 今日期限 + 今日完了したもの */
export function isTodayTask(task: Task, today: DateStr) {
  if (!isLive(task)) return false;
  if (task.completed) return (task.dueDate !== undefined && task.dueDate === today) || completedOn(task, today);
  return task.dueDate !== undefined && task.dueDate <= today;
}

export function byOrder(a: Task, b: Task) {
  return a.order - b.order || a.createdAt - b.createdAt;
}

/** 重要度スコア (§32) : 小さいほど重要 */
export function importance(task: Task, today: DateStr): number {
  let s = PRIORITY_RANK[task.priority] * 10;
  if (task.dueDate && task.dueDate < today) s -= 6; // overdue
  else if (task.dueDate === today) s -= 3;
  if (task.completed) s += 100;
  return s;
}

export function sortByImportance(tasks: Task[], today: DateStr) {
  return tasks.slice().sort((a, b) => importance(a, today) - importance(b, today) || byOrder(a, b));
}

/* ---------- 繰り返し (§35) ---------- */

export function repeatLabel(r: RepeatRule): string {
  const JA = ['日', '月', '火', '水', '木', '金', '土'];
  switch (r.type) {
    case 'daily':
      return '毎日';
    case 'weekdays':
      return '平日';
    case 'weekly':
      return `毎週${(r.days ?? []).map((d) => JA[d]).join('・')}曜`;
    case 'days':
      return (r.days ?? []).map((d) => JA[d]).join('・');
    case 'monthly':
      return `毎月${r.monthDay ?? 1}日`;
    default:
      return '';
  }
}

export function nextOccurrence(rule: RepeatRule, from: DateStr): DateStr | undefined {
  switch (rule.type) {
    case 'none':
      return undefined;
    case 'daily':
      return addDays(from, 1);
    case 'weekdays': {
      let d = addDays(from, 1);
      while ([0, 6].includes(weekday(d))) d = addDays(d, 1);
      return d;
    }
    case 'weekly':
    case 'days': {
      const days = rule.days && rule.days.length ? rule.days : [weekday(from)];
      for (let i = 1; i <= 7; i++) {
        const d = addDays(from, i);
        if (days.includes(weekday(d))) return d;
      }
      return addDays(from, 7);
    }
    case 'monthly': {
      const base = parseDateStr(from);
      const md = rule.monthDay ?? base.getDate();
      const y = base.getFullYear();
      const m = base.getMonth() + 1;
      const last = new Date(y, m + 1, 0).getDate();
      return toDateStr(new Date(y, m, Math.min(md, last)));
    }
  }
}

/* ---------- 習慣 (§14) ---------- */

export function habitDueOn(h: Habit, day: DateStr) {
  return h.repeatDays.length === 0 || h.repeatDays.includes(weekday(day));
}

/**
 * 連続達成日数。予定日のみカウントし、予定外の日はスキップ。
 * 今日が未達成でも昨日まで続いていれば streak は維持 (今日はまだ途中)。
 */
export function habitStreak(h: Habit, today: DateStr): number {
  const set = new Set(h.completedDates);
  let streak = 0;
  let d = today;
  if (!set.has(today)) d = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    if (habitDueOn(h, d)) {
      if (set.has(d)) streak++;
      else break;
    }
    d = addDays(d, -1);
    if (diffDays(d, today) > 400) break;
  }
  return streak;
}
