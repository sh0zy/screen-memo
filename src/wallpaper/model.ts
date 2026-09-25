import type {
  CompletedDisplay,
  Countdown,
  DateStr,
  Habit,
  IconName,
  MiniCard,
  Note,
  ScheduleItem,
  ScreenDoc,
  SectionKind,
  Task,
} from '../types';
import { addDays, diffDays, formatLong, timeOfDay } from '../lib/date';
import { habitDueOn, habitStreak, isLive, isTodayTask, sortByImportance, byOrder } from '../lib/logic';
import { SECTION_LABEL } from './templates';

export const MASK = '••••••';

export interface WPItem {
  id: string;
  text: string;
  done: boolean;
  high?: boolean;
  meta?: string;
  /** サブタスク進捗 '1/3' */
  sub?: string;
}

export interface WPSection {
  kind: SectionKind;
  title: string;
  icon?: IconName;
  items: WPItem[];
  /** 表示しきれなかった件数 */
  more: number;
  cards?: MiniCard[];
  countdowns?: { id: string; title: string; days: number }[];
  habits?: { id: string; title: string; done: boolean; streak: number; icon: IconName }[];
  schedule?: { id: string; time: string; end?: string; title: string; past?: boolean }[];
  memoLines?: string[];
}

export interface WallpaperModel {
  date: DateStr;
  dateInfo: ReturnType<typeof formatLong>;
  headline: string;
  heroLabel: string;
  goals: WPItem[];
  sections: WPSection[];
  progress: { done: number; total: number };
  totalItems: number;
}

export interface ModelInput {
  screen: ScreenDoc;
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
  schedule: ScheduleItem[];
  countdowns: Countdown[];
  today: DateStr;
  completedDisplay: CompletedDisplay;
  /** Tomorrow Planning (§77) */
  tomorrow?: boolean;
  /** Preview では sensitive を伏せ字 */
  mask?: boolean;
  /** 表示できる項目数の上限 (自動最適化 §32) */
  budget?: number;
  now?: Date;
}

const maskText = (t: string, sensitive: boolean, mask?: boolean) => (sensitive && mask ? MASK : t);

export function buildWallpaperModel(input: ModelInput): WallpaperModel {
  const { screen, completedDisplay, mask } = input;
  const date = input.tomorrow ? addDays(input.today, 1) : input.today;
  const now = input.now ?? new Date();
  const tod = screen.timeOfDay === 'auto' && !input.tomorrow ? timeOfDay(now) : null;
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  /* ---------- tasks ---------- */
  const ownTask = (t: Task) => (screen.onlyOwnTasks ? t.screenId === screen.id : !t.screenId || t.screenId === screen.id);
  const allDay = input.tasks.filter((t) =>
    input.tomorrow
      ? isLive(t) && ownTask(t) && t.dueDate === date
      : ownTask(t) && isTodayTask(t, date),
  );
  const progress = {
    done: allDay.filter((t) => t.completed).length,
    total: allDay.length,
  };
  const hideCompleted = completedDisplay === 'hide' || tod === 'afternoon' || tod === 'night';
  let dayTasks = allDay.filter((t) => !t.hideFromWallpaper && (!hideCompleted || !t.completed));
  dayTasks = dayTasks.slice().sort((a, b) => Number(a.completed) - Number(b.completed) || byOrder(a, b));

  const toItem = (t: Task): WPItem => {
    const doneSubs = t.subtasks.filter((s) => s.completed).length;
    return {
      id: t.id,
      text: maskText(t.title, t.sensitive, mask),
      done: t.completed,
      high: t.priority === 'high',
      meta: !t.completed && t.dueDate && t.dueDate < date ? 'Overdue' : undefined,
      sub: t.subtasks.length ? `${doneSubs}/${t.subtasks.length}` : undefined,
    };
  };

  let priorityTasks: Task[];
  let otherTasks: Task[];
  if (screen.focusMode) {
    // Focus Mode (§17): 本当に重要な3つだけ
    priorityTasks = sortByImportance(dayTasks.filter((t) => !t.completed), date).slice(0, 3);
    otherTasks = [];
  } else {
    priorityTasks = dayTasks.filter((t) => t.priority === 'high');
    otherTasks = dayTasks.filter((t) => t.priority !== 'high');
    // 今日期限 / 期限切れを上へ
    otherTasks = otherTasks
      .slice()
      .sort(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          Number((b.dueDate ?? '') < date) - Number((a.dueDate ?? '') < date) ||
          byOrder(a, b),
      );
  }

  /* ---------- goals ---------- */
  const goals: WPItem[] = screen.goals
    .filter((g) => g.text.trim())
    .map((g) => ({ id: g.id, text: g.text, done: g.done }));

  /* ---------- schedule ---------- */
  const schedDate = tod === 'night' ? addDays(date, 1) : date;
  let sched = input.schedule
    .filter((s) => s.date === schedDate && !s.hideFromWallpaper)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((s) => ({
      id: s.id,
      time: s.startTime,
      end: s.endTime,
      title: s.title,
      past: !input.tomorrow && tod !== 'night' && (s.endTime ?? s.startTime) < nowHM,
    }));
  if (tod === 'afternoon') sched = sched.filter((s) => !s.past);

  /* ---------- habits ---------- */
  const habits = input.habits
    .filter((h) => !h.archived && !h.hideFromWallpaper && habitDueOn(h, date))
    .map((h) => ({
      id: h.id,
      title: h.title,
      icon: h.icon,
      done: h.completedDates.includes(date),
      streak: habitStreak(h, input.today),
    }));

  /* ---------- memo ---------- */
  const memoLines: string[] = [];
  if (screen.memo.trim()) memoLines.push(...screen.memo.split('\n').filter((l) => l.trim()));
  input.notes
    .filter((n) => isLive(n) && n.showOnScreen && !n.hideFromWallpaper)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
    .forEach((n) => {
      if (n.kind === 'checklist') {
        if (n.title) memoLines.push(maskText(n.title, n.sensitive, mask));
        n.items
          .filter((i) => !i.checked)
          .slice(0, 4)
          .forEach((i) => memoLines.push('・' + maskText(i.text, n.sensitive, mask)));
      } else {
        const text = n.title || n.content.split('\n').find((l) => l.trim()) || '';
        if (text) memoLines.push(maskText(text.replace(/^#+\s*/, ''), n.sensitive, mask));
      }
    });

  /* ---------- countdowns ---------- */
  const countdowns = input.countdowns
    .filter((c) => !c.hideFromWallpaper && c.targetDate >= date)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    .map((c) => ({ id: c.id, title: c.title, days: diffDays(date, c.targetDate) }));

  /* ---------- 予算配分 (§32 優先順位) ---------- */
  let budget = input.budget ?? Infinity;
  const take = <T,>(arr: T[]): [T[], number] => {
    const n = Math.max(0, Math.min(arr.length, budget));
    budget -= n;
    return [arr.slice(0, n), arr.length - n];
  };
  // Goal は常に最優先
  const [goalsShown] = take(goals);
  const [prioShown, prioMore] = take(priorityTasks.map(toItem));
  // 今日が期限の通常タスクを先に確保
  const [schedShown, schedMore] = take(sched);
  const [habitsShown, habitsMore] = take(habits);
  const [tasksShown, tasksMore] = take(otherTasks.map(toItem));
  const [memoShown, memoMore] = take(memoLines);
  const [cdShown, cdMore] = take(countdowns);
  const [cardsShown, cardsMore] = take(screen.miniCards);

  const titleOf = (kind: SectionKind) => {
    const conf = screen.sections.find((s) => s.kind === kind);
    if (conf?.title) return conf.title;
    if (kind === 'priority' && screen.focusMode) return 'Focus';
    if (kind === 'schedule' && tod === 'night') return 'Tomorrow';
    return SECTION_LABEL[kind];
  };
  const iconOf = (kind: SectionKind) => screen.sections.find((s) => s.kind === kind)?.icon;

  const built: Record<SectionKind, WPSection | null> = {
    goal: null, // Goal はヒーロー扱いで別描画
    priority: prioShown.length
      ? { kind: 'priority', title: titleOf('priority'), icon: iconOf('priority'), items: prioShown, more: prioMore }
      : null,
    tasks:
      tasksShown.length && !screen.focusMode
        ? { kind: 'tasks', title: titleOf('tasks'), icon: iconOf('tasks'), items: tasksShown, more: tasksMore }
        : null,
    schedule: schedShown.length
      ? { kind: 'schedule', title: titleOf('schedule'), icon: iconOf('schedule'), items: [], more: schedMore, schedule: schedShown }
      : null,
    habits: habitsShown.length
      ? { kind: 'habits', title: titleOf('habits'), icon: iconOf('habits'), items: [], more: habitsMore, habits: habitsShown }
      : null,
    memo: memoShown.length
      ? { kind: 'memo', title: titleOf('memo'), icon: iconOf('memo'), items: [], more: memoMore, memoLines: memoShown }
      : null,
    countdown: cdShown.length
      ? { kind: 'countdown', title: titleOf('countdown'), icon: iconOf('countdown'), items: [], more: cdMore, countdowns: cdShown }
      : null,
    cards: cardsShown.length
      ? { kind: 'cards', title: titleOf('cards'), icon: iconOf('cards'), items: [], more: cardsMore, cards: cardsShown }
      : null,
  };

  // 朝は予定と目標を先に、夜は未完了→明日の予定
  let order = screen.sections.filter((s) => s.visible).map((s) => s.kind);
  if (tod === 'morning') order = moveFront(order, ['goal', 'schedule']);
  if (tod === 'night') order = [...order.filter((k) => k !== 'schedule'), ...(order.includes('schedule') ? ['schedule' as const] : [])];

  const sections = order.map((k) => built[k]).filter((s): s is WPSection => !!s);
  const goalVisible = screen.sections.some((s) => s.kind === 'goal' && s.visible);

  return {
    date,
    dateInfo: formatLong(date),
    headline: screen.headline,
    heroLabel: input.tomorrow ? 'TOMORROW' : tod === 'night' ? 'TONIGHT' : 'TODAY',
    goals: goalVisible ? goalsShown : [],
    sections,
    progress,
    totalItems:
      goals.length + priorityTasks.length + sched.length + habits.length + otherTasks.length +
      memoLines.length + countdowns.length + screen.miniCards.length,
  };
}

function moveFront(order: SectionKind[], front: SectionKind[]): SectionKind[] {
  const f = front.filter((k) => order.includes(k));
  return [...f, ...order.filter((k) => !f.includes(k))];
}
