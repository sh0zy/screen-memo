import type {
  Category,
  Countdown,
  DateStr,
  Habit,
  Note,
  ScheduleItem,
  ScreenDoc,
  Task,
  TemplateId,
} from '../types';
import { uid } from '../lib/id';
import { DEFAULT_BACKGROUND, DEFAULT_FONT, getTemplate, sectionsFor } from '../wallpaper/templates';

export function newTask(p: Partial<Task> & { title: string }): Task {
  const t = Date.now();
  return {
    id: uid('t_'),
    completed: false,
    priority: 'medium',
    tags: [],
    repeat: { type: 'none' },
    subtasks: [],
    hideFromWallpaper: false,
    sensitive: false,
    inbox: false,
    order: t,
    archived: false,
    createdAt: t,
    updatedAt: t,
    ...p,
  };
}

export function newNote(p: Partial<Note> = {}): Note {
  const t = Date.now();
  return {
    id: uid('n_'),
    kind: 'text',
    title: '',
    content: '',
    items: [],
    tags: [],
    pinned: false,
    favorite: false,
    hideFromWallpaper: false,
    sensitive: false,
    showOnScreen: false,
    archived: false,
    createdAt: t,
    updatedAt: t,
    ...p,
  };
}

export function newHabit(p: Partial<Habit> & { title: string }): Habit {
  const t = Date.now();
  return {
    id: uid('h_'),
    icon: 'repeat',
    repeatDays: [],
    completedDates: [],
    order: t,
    hideFromWallpaper: false,
    archived: false,
    createdAt: t,
    updatedAt: t,
    ...p,
  };
}

export function newSchedule(p: Partial<ScheduleItem> & { title: string; startTime: string; date: DateStr }): ScheduleItem {
  const t = Date.now();
  return { id: uid('s_'), hideFromWallpaper: false, createdAt: t, updatedAt: t, ...p };
}

export function newCountdown(p: Partial<Countdown> & { title: string; targetDate: DateStr }): Countdown {
  const t = Date.now();
  return { id: uid('c_'), hideFromWallpaper: false, createdAt: t, updatedAt: t, ...p };
}

export function newScreen(name: string, date: DateStr, templateId: TemplateId = 'minimal', order = Date.now()): ScreenDoc {
  const tpl = getTemplate(templateId);
  const t = Date.now();
  return {
    id: uid('sc_'),
    name,
    date,
    templateId,
    headline: '',
    goals: [],
    memo: '',
    sections: sectionsFor(tpl.sections),
    background: { ...DEFAULT_BACKGROUND, ...tpl.background },
    fontSettings: { ...DEFAULT_FONT, ...tpl.font },
    mode: 'lock',
    focusMode: false,
    showProgress: true,
    progressStyle: 'fraction',
    showDate: true,
    overflow: 'all',
    timeOfDay: 'off',
    contentOpacity: 1,
    safeTop: 0.26,
    miniCards: [],
    onlyOwnTasks: false,
    favorite: false,
    order,
    createdAt: t,
    updatedAt: t,
  };
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '大学', icon: 'graduation', order: 0 },
  { name: '勉強', icon: 'book', order: 1 },
  { name: '仕事', icon: 'briefcase', order: 2 },
  { name: 'プライベート', icon: 'heart', order: 3 },
  { name: '買い物', icon: 'bag', order: 4 },
  { name: '制作', icon: 'laptop', order: 5 },
  { name: '健康', icon: 'dumbbell', order: 6 },
];

/** 初回だけのサンプルScreen (§98) */
export function seedData(today: DateStr) {
  const screen = newScreen('Today', today, 'minimal', 0);
  screen.headline = 'One thing at a time.';
  screen.memo = 'Bring headphones';
  screen.sections = sectionsFor(['goal', 'priority', 'tasks', 'schedule', 'habits', 'memo']);
  const base = Date.now();
  const tasks = [
    newTask({ title: 'Finish assignment', priority: 'high', dueDate: today, order: base }),
    newTask({ title: 'Study English', priority: 'high', dueDate: today, order: base + 1 }),
  ];
  const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid('cat_') }));
  return { screen, tasks, categories };
}
