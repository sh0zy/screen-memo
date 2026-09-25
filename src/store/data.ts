import { create } from 'zustand';
import { db, TRASH_TTL_MS } from '../db/db';
import { newCountdown, newHabit, newNote, newSchedule, newScreen, newTask, seedData } from '../db/factory';
import { addDays, logicalToday, toDateStr } from '../lib/date';
import { setHapticsEnabled, tapHaptic } from '../lib/haptics';
import { uid } from '../lib/id';
import { byOrder, isLive, nextOccurrence } from '../lib/logic';
import type {
  AppSettings,
  Category,
  Countdown,
  DateStr,
  Habit,
  ID,
  Note,
  ScheduleItem,
  ScreenDoc,
  ScreenSnapshot,
  Task,
  TemplateId,
  UserTemplate,
} from '../types';
import { applyTemplate } from '../wallpaper/templates';
import { useUI } from './ui';

/* ---------------- Settings (localStorage) ---------------- */

const SETTINGS_KEY = 'screen-memo:settings:v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  appTheme: 'pure',
  accent: '#111113',
  completedDisplay: 'strike',
  resetHour: 4,
  resetPolicy: 'carry',
  deviceRatio: 'auto',
  onboarded: false,
  screenshotGuideSeen: false,
  haptics: true,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    /* noop */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

/* ---------------- Persistence helper ---------------- */

function persist(p: Promise<unknown>) {
  p.catch(() => useUI.getState().showToast('保存に失敗しました。ストレージの空き容量を確認してください'));
}

const toast = (m: string, undo?: () => void) => useUI.getState().showToast(m, undo);

/* ---------------- State ---------------- */

export interface BackupFile {
  app: 'screen-memo';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  screens: ScreenDoc[];
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
  schedule: ScheduleItem[];
  countdowns: Countdown[];
  categories: Category[];
  userTemplates: UserTemplate[];
  snapshots: ScreenSnapshot[];
  assets: { id: ID; dataUrl: string }[];
}

interface DataState {
  ready: boolean;
  today: DateStr;
  settings: AppSettings;
  screens: ScreenDoc[];
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
  schedule: ScheduleItem[];
  countdowns: Countdown[];
  categories: Category[];
  userTemplates: UserTemplate[];
  snapshots: ScreenSnapshot[];

  init: () => Promise<void>;
  refreshDay: () => void;

  /* settings */
  updateSettings: (p: Partial<AppSettings>) => void;

  /* tasks */
  addTask: (p: Partial<Task> & { title: string }) => Task;
  updateTask: (id: ID, p: Partial<Task>) => void;
  toggleTask: (id: ID) => void;
  deleteTask: (id: ID) => void;
  restoreTask: (id: ID) => void;
  purgeTask: (id: ID) => void;
  archiveTask: (id: ID, archived?: boolean) => void;
  duplicateTask: (id: ID) => void;
  reorderTasks: (orderedIds: ID[]) => void;
  taskToNote: (id: ID) => void;

  /* notes */
  addNote: (p?: Partial<Note>) => Note;
  updateNote: (id: ID, p: Partial<Note>) => void;
  deleteNote: (id: ID) => void;
  restoreNote: (id: ID) => void;
  purgeNote: (id: ID) => void;
  archiveNote: (id: ID, archived?: boolean) => void;
  duplicateNote: (id: ID) => void;
  noteToTask: (id: ID) => void;

  /* habits */
  addHabit: (p: Partial<Habit> & { title: string }) => void;
  updateHabit: (id: ID, p: Partial<Habit>) => void;
  toggleHabit: (id: ID, day?: DateStr) => void;
  deleteHabit: (id: ID) => void;
  reorderHabits: (ids: ID[]) => void;

  /* schedule */
  addSchedule: (p: Partial<ScheduleItem> & { title: string; startTime: string; date: DateStr }) => void;
  updateSchedule: (id: ID, p: Partial<ScheduleItem>) => void;
  deleteSchedule: (id: ID) => void;

  /* countdowns */
  addCountdown: (p: Partial<Countdown> & { title: string; targetDate: DateStr }) => void;
  updateCountdown: (id: ID, p: Partial<Countdown>) => void;
  deleteCountdown: (id: ID) => void;

  /* categories */
  addCategory: (c: Omit<Category, 'id' | 'order'>) => void;
  updateCategory: (id: ID, p: Partial<Category>) => void;
  deleteCategory: (id: ID) => void;

  /* screens */
  activeScreen: () => ScreenDoc;
  addScreen: (name: string, templateId?: TemplateId) => ScreenDoc;
  updateScreen: (id: ID, p: Partial<ScreenDoc>) => void;
  deleteScreen: (id: ID) => void;
  duplicateScreen: (id: ID) => void;
  setActiveScreen: (id: ID) => void;
  applyTemplateToScreen: (id: ID, templateId: TemplateId) => void;
  reorderScreens: (ids: ID[]) => void;

  /* templates */
  saveUserTemplate: (screenId: ID, name: string) => void;
  applyUserTemplate: (tplId: ID, screenId: ID) => void;
  deleteUserTemplate: (id: ID) => void;

  /* history */
  snapshotScreen: (screenId: ID, date?: DateStr) => void;
  restoreSnapshotToToday: (snapshotId: ID) => void;
  duplicateYesterday: (screenId: ID) => boolean;
  deleteSnapshot: (id: ID) => void;

  /* tidy */
  quickTidy: () => void;

  /* backup */
  exportBackup: () => Promise<BackupFile>;
  importBackup: (b: BackupFile) => Promise<void>;
  wipeAll: () => Promise<void>;
}

const mapPatch = <T extends { id: ID }>(arr: T[], id: ID, p: Partial<T>) =>
  arr.map((x) => (x.id === id ? { ...x, ...p } : x));

export const useData = create<DataState>((set, get) => ({
  ready: false,
  today: logicalToday(loadSettings().resetHour),
  settings: loadSettings(),
  screens: [],
  tasks: [],
  notes: [],
  habits: [],
  schedule: [],
  countdowns: [],
  categories: [],
  userTemplates: [],
  snapshots: [],

  /* ================= init ================= */
  init: async () => {
    const settings = get().settings;
    setHapticsEnabled(settings.haptics);
    const today = logicalToday(settings.resetHour);
    let [screens, tasks, notes, habits, schedule, countdowns, categories, userTemplates, snapshots] =
      await Promise.all([
        db.screens.toArray(),
        db.tasks.toArray(),
        db.notes.toArray(),
        db.habits.toArray(),
        db.schedule.toArray(),
        db.countdowns.toArray(),
        db.categories.toArray(),
        db.userTemplates.toArray(),
        db.snapshots.toArray(),
      ]);

    if (screens.length === 0) {
      const seed = seedData(today);
      screens = [seed.screen];
      tasks = [...tasks, ...seed.tasks];
      if (categories.length === 0) categories = seed.categories;
      await db.transaction('rw', db.screens, db.tasks, db.categories, async () => {
        await db.screens.put(seed.screen);
        await db.tasks.bulkPut(seed.tasks);
        await db.categories.bulkPut(categories);
      });
    }

    // ゴミ箱の自動削除 (30日)
    const cutoff = Date.now() - TRASH_TTL_MS;
    const expiredTasks = tasks.filter((t) => t.deletedAt && t.deletedAt < cutoff).map((t) => t.id);
    const expiredNotes = notes.filter((n) => n.deletedAt && n.deletedAt < cutoff).map((n) => n.id);
    if (expiredTasks.length) {
      tasks = tasks.filter((t) => !expiredTasks.includes(t.id));
      persist(db.tasks.bulkDelete(expiredTasks));
    }
    if (expiredNotes.length) {
      notes = notes.filter((n) => !expiredNotes.includes(n.id));
      persist(db.notes.bulkDelete(expiredNotes));
    }

    screens.sort((a, b) => a.order - b.order);
    categories.sort((a, b) => a.order - b.order);
    habits.sort((a, b) => a.order - b.order);
    snapshots.sort((a, b) => b.createdAt - a.createdAt);

    const activeScreenId =
      settings.activeScreenId && screens.some((s) => s.id === settings.activeScreenId)
        ? settings.activeScreenId
        : screens[0].id;

    set({
      ready: true,
      today,
      screens,
      tasks,
      notes,
      habits,
      schedule,
      countdowns,
      categories,
      userTemplates,
      snapshots,
      settings: { ...settings, activeScreenId },
    });
    get().refreshDay();
  },

  /* ================= Daily Reset (§34) ================= */
  refreshDay: () => {
    const { settings } = get();
    const today = logicalToday(settings.resetHour);
    if (today !== get().today) set({ today });
    if (settings.lastResetDate === today) return;

    const prev = settings.lastResetDate;
    // 前日の Screen を履歴に残す
    if (prev) {
      for (const sc of get().screens) get().snapshotScreen(sc.id, prev);
    }

    // 未完了タスクの扱い
    if (prev) {
      const changed: Task[] = [];
      const tasks = get().tasks.map((t) => {
        if (!isLive(t) || t.completed || !t.dueDate || t.dueDate >= today) return t;
        let next: Task = t;
        if (settings.resetPolicy === 'carry') next = { ...t, dueDate: today, updatedAt: Date.now() };
        else if (settings.resetPolicy === 'inbox')
          next = { ...t, dueDate: undefined, inbox: true, updatedAt: Date.now() };
        if (next !== t) changed.push(next);
        return next;
      });
      if (changed.length) {
        set({ tasks });
        persist(db.tasks.bulkPut(changed));
      }
    }

    // Screen の日付を更新し、目標の完了状態をリセット
    const screens = get().screens.map((s) => ({
      ...s,
      date: today,
      goals: s.date === today ? s.goals : s.goals.map((g) => ({ ...g, done: false })),
    }));
    set({ screens });
    persist(db.screens.bulkPut(screens));
    get().updateSettings({ lastResetDate: today });
  },

  /* ================= settings ================= */
  updateSettings: (p) => {
    const settings = { ...get().settings, ...p };
    if (p.haptics !== undefined) setHapticsEnabled(p.haptics);
    set({ settings });
    saveSettings(settings);
    if (p.resetHour !== undefined) set({ today: logicalToday(settings.resetHour) });
  },

  /* ================= tasks ================= */
  addTask: (p) => {
    const task = newTask({ order: Date.now(), ...p });
    set({ tasks: [...get().tasks, task] });
    persist(db.tasks.put(task));
    return task;
  },

  updateTask: (id, p) => {
    const tasks = mapPatch(get().tasks, id, { ...p, updatedAt: Date.now() });
    set({ tasks });
    const t = tasks.find((x) => x.id === id);
    if (t) persist(db.tasks.put(t));
  },

  toggleTask: (id) => {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    const completing = !t.completed;
    const patch: Partial<Task> = { completed: completing, completedAt: completing ? Date.now() : undefined };
    let spawned: Task | undefined;

    if (completing && t.repeat.type !== 'none') {
      const from = t.dueDate ?? get().today;
      const nextDate = nextOccurrence(t.repeat, from < get().today ? get().today : from);
      if (nextDate) {
        spawned = newTask({
          ...t,
          id: uid('t_'),
          completed: false,
          completedAt: undefined,
          nextId: undefined,
          dueDate: nextDate,
          subtasks: t.subtasks.map((s) => ({ ...s, completed: false })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        patch.nextId = spawned.id;
      }
    }
    if (!completing && t.nextId) {
      const nextId = t.nextId;
      set({ tasks: get().tasks.filter((x) => x.id !== nextId) });
      persist(db.tasks.delete(nextId));
      patch.nextId = undefined;
    }
    if (spawned) {
      set({ tasks: [...get().tasks, spawned] });
      persist(db.tasks.put(spawned));
    }
    get().updateTask(id, patch);
    if (completing) {
      tapHaptic('light');
      toast(`「${t.title}」を完了しました`, () => get().toggleTask(id));
    }
  },

  deleteTask: (id) => {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    get().updateTask(id, { deletedAt: Date.now() });
    toast('ゴミ箱に移動しました', () => get().restoreTask(id));
  },
  restoreTask: (id) => get().updateTask(id, { deletedAt: undefined, archived: false }),
  purgeTask: (id) => {
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
    persist(db.tasks.delete(id));
  },
  archiveTask: (id, archived = true) => {
    get().updateTask(id, { archived });
    if (archived) toast('アーカイブしました', () => get().archiveTask(id, false));
  },
  duplicateTask: (id) => {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    get().addTask({
      ...t,
      id: uid('t_'),
      title: t.title,
      completed: false,
      completedAt: undefined,
      nextId: undefined,
      order: t.order + 0.5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    toast('複製しました');
  },
  reorderTasks: (orderedIds) => {
    const current = get().tasks.filter((t) => orderedIds.includes(t.id));
    const slots = current.map((t) => t.order).sort((a, b) => a - b);
    const changed: Task[] = [];
    const orderMap = new Map<ID, number>();
    orderedIds.forEach((id, i) => orderMap.set(id, slots[i] ?? Date.now() + i));
    // 同じorder値が重複していた場合も安定させる
    const uniq = new Set(slots);
    if (uniq.size !== slots.length) orderedIds.forEach((id, i) => orderMap.set(id, (slots[0] ?? 0) + i));
    const tasks = get().tasks.map((t) => {
      const o = orderMap.get(t.id);
      if (o === undefined || o === t.order) return t;
      const n = { ...t, order: o };
      changed.push(n);
      return n;
    });
    set({ tasks });
    if (changed.length) persist(db.tasks.bulkPut(changed));
  },
  taskToNote: (id) => {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    const hasSubs = t.subtasks.length > 0;
    const note = get().addNote({
      kind: hasSubs ? 'checklist' : 'text',
      title: t.title,
      content: t.note ?? '',
      items: t.subtasks.map((s) => ({ id: uid('i_'), text: s.title, checked: s.completed })),
      tags: t.tags,
    });
    get().updateTask(id, { deletedAt: Date.now() });
    toast('メモに変換しました', () => {
      get().purgeNote(note.id);
      get().restoreTask(id);
    });
  },

  /* ================= notes ================= */
  addNote: (p = {}) => {
    const note = newNote(p);
    set({ notes: [note, ...get().notes] });
    persist(db.notes.put(note));
    return note;
  },
  updateNote: (id, p) => {
    const notes = mapPatch(get().notes, id, { ...p, updatedAt: Date.now() });
    set({ notes });
    const n = notes.find((x) => x.id === id);
    if (n) persist(db.notes.put(n));
  },
  deleteNote: (id) => {
    get().updateNote(id, { deletedAt: Date.now() });
    toast('ゴミ箱に移動しました', () => get().restoreNote(id));
  },
  restoreNote: (id) => get().updateNote(id, { deletedAt: undefined, archived: false }),
  purgeNote: (id) => {
    set({ notes: get().notes.filter((n) => n.id !== id) });
    persist(db.notes.delete(id));
  },
  archiveNote: (id, archived = true) => {
    get().updateNote(id, { archived });
    if (archived) toast('アーカイブしました', () => get().archiveNote(id, false));
  },
  duplicateNote: (id) => {
    const n = get().notes.find((x) => x.id === id);
    if (!n) return;
    get().addNote({
      ...n,
      id: uid('n_'),
      title: n.title ? `${n.title} のコピー` : '',
      items: n.items.map((i) => ({ ...i, id: uid('i_') })),
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    toast('複製しました');
  },
  noteToTask: (id) => {
    const n = get().notes.find((x) => x.id === id);
    if (!n) return;
    const firstLine = n.content.split('\n').find((l) => l.trim()) ?? '';
    const title = n.title || firstLine.replace(/^[#*\-\s[\]]+/, '').slice(0, 80) || 'Untitled';
    const task = get().addTask({
      title,
      note: n.kind === 'text' ? n.content : undefined,
      tags: n.tags,
      dueDate: get().today,
      subtasks: n.items.map((i) => ({ id: uid('st_'), title: i.text, completed: i.checked })),
    });
    get().updateNote(id, { deletedAt: Date.now() });
    toast('今日のタスクに変換しました', () => {
      get().purgeTask(task.id);
      get().restoreNote(id);
    });
  },

  /* ================= habits ================= */
  addHabit: (p) => {
    const h = newHabit(p);
    set({ habits: [...get().habits, h] });
    persist(db.habits.put(h));
  },
  updateHabit: (id, p) => {
    const habits = mapPatch(get().habits, id, { ...p, updatedAt: Date.now() });
    set({ habits });
    const h = habits.find((x) => x.id === id);
    if (h) persist(db.habits.put(h));
  },
  toggleHabit: (id, day) => {
    const d = day ?? get().today;
    const h = get().habits.find((x) => x.id === id);
    if (!h) return;
    const has = h.completedDates.includes(d);
    get().updateHabit(id, {
      completedDates: has ? h.completedDates.filter((x) => x !== d) : [...h.completedDates, d].slice(-800),
    });
    if (!has) tapHaptic('light');
  },
  deleteHabit: (id) => {
    const h = get().habits.find((x) => x.id === id);
    if (!h) return;
    set({ habits: get().habits.filter((x) => x.id !== id) });
    persist(db.habits.delete(id));
    toast('習慣を削除しました', () => {
      set({ habits: [...get().habits, h].sort((a, b) => a.order - b.order) });
      persist(db.habits.put(h));
    });
  },
  reorderHabits: (ids) => {
    const habits = ids
      .map((id, i) => {
        const h = get().habits.find((x) => x.id === id);
        return h ? { ...h, order: i } : undefined;
      })
      .filter((h): h is Habit => !!h);
    set({ habits });
    persist(db.habits.bulkPut(habits));
  },

  /* ================= schedule ================= */
  addSchedule: (p) => {
    const s = newSchedule(p);
    set({ schedule: [...get().schedule, s] });
    persist(db.schedule.put(s));
  },
  updateSchedule: (id, p) => {
    const schedule = mapPatch(get().schedule, id, { ...p, updatedAt: Date.now() });
    set({ schedule });
    const s = schedule.find((x) => x.id === id);
    if (s) persist(db.schedule.put(s));
  },
  deleteSchedule: (id) => {
    const s = get().schedule.find((x) => x.id === id);
    if (!s) return;
    set({ schedule: get().schedule.filter((x) => x.id !== id) });
    persist(db.schedule.delete(id));
    toast('予定を削除しました', () => {
      set({ schedule: [...get().schedule, s] });
      persist(db.schedule.put(s));
    });
  },

  /* ================= countdowns ================= */
  addCountdown: (p) => {
    const c = newCountdown(p);
    set({ countdowns: [...get().countdowns, c] });
    persist(db.countdowns.put(c));
  },
  updateCountdown: (id, p) => {
    const countdowns = mapPatch(get().countdowns, id, { ...p, updatedAt: Date.now() });
    set({ countdowns });
    const c = countdowns.find((x) => x.id === id);
    if (c) persist(db.countdowns.put(c));
  },
  deleteCountdown: (id) => {
    const c = get().countdowns.find((x) => x.id === id);
    if (!c) return;
    set({ countdowns: get().countdowns.filter((x) => x.id !== id) });
    persist(db.countdowns.delete(id));
    toast('カウントダウンを削除しました', () => {
      set({ countdowns: [...get().countdowns, c] });
      persist(db.countdowns.put(c));
    });
  },

  /* ================= categories ================= */
  addCategory: (c) => {
    const cat: Category = { ...c, id: uid('cat_'), order: get().categories.length };
    set({ categories: [...get().categories, cat] });
    persist(db.categories.put(cat));
  },
  updateCategory: (id, p) => {
    const categories = mapPatch(get().categories, id, p);
    set({ categories });
    const c = categories.find((x) => x.id === id);
    if (c) persist(db.categories.put(c));
  },
  deleteCategory: (id) => {
    set({ categories: get().categories.filter((c) => c.id !== id) });
    persist(db.categories.delete(id));
    const affected = get().tasks.filter((t) => t.categoryId === id);
    affected.forEach((t) => get().updateTask(t.id, { categoryId: undefined }));
  },

  /* ================= screens ================= */
  activeScreen: () => {
    const { screens, settings } = get();
    return screens.find((s) => s.id === settings.activeScreenId) ?? screens[0];
  },
  addScreen: (name, templateId = 'minimal') => {
    const sc = newScreen(name, get().today, templateId, (get().screens.at(-1)?.order ?? 0) + 1);
    set({ screens: [...get().screens, sc] });
    persist(db.screens.put(sc));
    get().setActiveScreen(sc.id);
    return sc;
  },
  updateScreen: (id, p) => {
    const screens = mapPatch(get().screens, id, { ...p, updatedAt: Date.now() });
    set({ screens });
    const s = screens.find((x) => x.id === id);
    if (s) persist(db.screens.put(s));
  },
  deleteScreen: (id) => {
    if (get().screens.length <= 1) {
      toast('最後のScreenは削除できません');
      return;
    }
    const sc = get().screens.find((s) => s.id === id);
    if (!sc) return;
    const screens = get().screens.filter((s) => s.id !== id);
    set({ screens });
    persist(db.screens.delete(id));
    if (get().settings.activeScreenId === id) get().setActiveScreen(screens[0].id);
    toast(`「${sc.name}」を削除しました`, () => {
      set({ screens: [...get().screens, sc].sort((a, b) => a.order - b.order) });
      persist(db.screens.put(sc));
    });
  },
  duplicateScreen: (id) => {
    const sc = get().screens.find((s) => s.id === id);
    if (!sc) return;
    const copy: ScreenDoc = {
      ...structuredClone(sc),
      id: uid('sc_'),
      name: `${sc.name} 2`,
      favorite: false,
      order: (get().screens.at(-1)?.order ?? 0) + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set({ screens: [...get().screens, copy] });
    persist(db.screens.put(copy));
    get().setActiveScreen(copy.id);
    toast('Screenを複製しました');
  },
  setActiveScreen: (id) => get().updateSettings({ activeScreenId: id }),
  applyTemplateToScreen: (id, templateId) => {
    const sc = get().screens.find((s) => s.id === id);
    if (!sc) return;
    const before = sc;
    const next = applyTemplate(sc, templateId);
    get().updateScreen(id, next);
    toast('テンプレートを適用しました', () => get().updateScreen(id, before));
  },
  reorderScreens: (ids) => {
    const screens = ids
      .map((id, i) => {
        const s = get().screens.find((x) => x.id === id);
        return s ? { ...s, order: i } : undefined;
      })
      .filter((s): s is ScreenDoc => !!s);
    set({ screens });
    persist(db.screens.bulkPut(screens));
  },

  /* ================= user templates (§43, 44) ================= */
  saveUserTemplate: (screenId, name) => {
    const sc = get().screens.find((s) => s.id === screenId);
    if (!sc) return;
    const tpl: UserTemplate = {
      id: uid('ut_'),
      name,
      icon: 'star',
      layout: structuredClone({
        templateId: sc.templateId,
        sections: sc.sections,
        background: sc.background,
        fontSettings: sc.fontSettings,
        mode: sc.mode,
        focusMode: sc.focusMode,
        showProgress: sc.showProgress,
        progressStyle: sc.progressStyle,
        showDate: sc.showDate,
        headline: sc.headline,
        miniCards: sc.miniCards,
        safeTop: sc.safeTop,
        contentOpacity: sc.contentOpacity,
      }),
      createdAt: Date.now(),
    };
    set({ userTemplates: [...get().userTemplates, tpl] });
    persist(db.userTemplates.put(tpl));
    toast(`My Template「${name}」を保存しました`);
  },
  applyUserTemplate: (tplId, screenId) => {
    const tpl = get().userTemplates.find((t) => t.id === tplId);
    const sc = get().screens.find((s) => s.id === screenId);
    if (!tpl || !sc) return;
    const before = sc;
    get().updateScreen(screenId, structuredClone(tpl.layout));
    toast(`「${tpl.name}」を適用しました`, () => get().updateScreen(screenId, before));
  },
  deleteUserTemplate: (id) => {
    set({ userTemplates: get().userTemplates.filter((t) => t.id !== id) });
    persist(db.userTemplates.delete(id));
  },

  /* ================= history (§75, 76) ================= */
  snapshotScreen: (screenId, date) => {
    const sc = get().screens.find((s) => s.id === screenId);
    if (!sc) return;
    const day = date ?? get().today;
    const dayTasks = get()
      .tasks.filter(
        (t) =>
          isLive(t) &&
          (sc.onlyOwnTasks ? t.screenId === sc.id : !t.screenId || t.screenId === sc.id) &&
          (t.dueDate === day || (t.completedAt !== undefined && toDateStr(new Date(t.completedAt)) === day)),
      )
      .sort(byOrder)
      .map((t) => ({ id: t.id, title: t.title, priority: t.priority, completed: t.completed, dueDate: t.dueDate }));
    const existing = get().snapshots.find((s) => s.screenId === screenId && s.date === day);
    const snap: ScreenSnapshot = {
      id: existing?.id ?? uid('snap_'),
      screenId,
      date: day,
      name: sc.name,
      screen: structuredClone({ ...sc, date: day }),
      tasks: dayTasks,
      createdAt: Date.now(),
    };
    const snapshots = [snap, ...get().snapshots.filter((s) => s.id !== snap.id)].slice(0, 120);
    set({ snapshots });
    persist(db.snapshots.put(snap));
  },
  restoreSnapshotToToday: (snapshotId) => {
    const snap = get().snapshots.find((s) => s.id === snapshotId);
    if (!snap) return;
    const today = get().today;
    const target = get().screens.find((s) => s.id === snap.screenId) ?? get().activeScreen();
    const before = target;
    get().updateScreen(target.id, {
      ...structuredClone(snap.screen),
      id: target.id,
      name: target.name,
      order: target.order,
      date: today,
      goals: snap.screen.goals.map((g) => ({ ...g, id: uid('g_'), done: false })),
    });
    // 未完了だったタスクで今日にないものをコピー
    const existingTitles = new Set(
      get()
        .tasks.filter((t) => isLive(t) && t.dueDate === today)
        .map((t) => t.title),
    );
    const created: ID[] = [];
    snap.tasks
      .filter((t) => !existingTitles.has(t.title))
      .forEach((t, i) => {
        const nt = get().addTask({
          title: t.title,
          priority: t.priority,
          dueDate: today,
          screenId: target.onlyOwnTasks ? target.id : undefined,
          order: Date.now() + i,
        });
        created.push(nt.id);
      });
    get().setActiveScreen(target.id);
    toast(`${snap.date} のScreenを今日にコピーしました`, () => {
      get().updateScreen(target.id, before);
      created.forEach((id) => get().purgeTask(id));
    });
  },
  duplicateYesterday: (screenId) => {
    const yesterday = addDays(get().today, -1);
    const snap = get().snapshots.find((s) => s.screenId === screenId && s.date === yesterday);
    if (!snap) return false;
    get().restoreSnapshotToToday(snap.id);
    return true;
  },
  deleteSnapshot: (id) => {
    set({ snapshots: get().snapshots.filter((s) => s.id !== id) });
    persist(db.snapshots.delete(id));
  },

  /* ================= Quick Reset (§78) ================= */
  quickTidy: () => {
    const today = get().today;
    const before = get().tasks;
    const live = before.filter((t) => isLive(t) && !t.completed && t.dueDate && t.dueDate <= today);
    // 期限切れ → 上、Priority → 上 の順に order を振り直す
    const rank = (t: Task) => (t.dueDate! < today ? 0 : 10) + (t.priority === 'high' ? 0 : t.priority === 'medium' ? 1 : 2);
    const sorted = live.slice().sort((a, b) => rank(a) - rank(b) || byOrder(a, b));
    get().reorderTasks(sorted.map((t) => t.id));
    // 完了タスクは Today 表示から隠す
    get().updateSettings({ completedDisplay: 'hide' });
    toast('今日用に整理しました', () => {
      set({ tasks: before });
      persist(db.tasks.bulkPut(before));
    });
  },

  /* ================= backup (§51) ================= */
  exportBackup: async () => {
    const assets = await db.assets.toArray();
    const encoded = await Promise.all(
      assets.map(
        (a) =>
          new Promise<{ id: ID; dataUrl: string }>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve({ id: a.id, dataUrl: String(r.result) });
            r.onerror = () => resolve({ id: a.id, dataUrl: '' });
            r.readAsDataURL(a.blob);
          }),
      ),
    );
    const s = get();
    return {
      app: 'screen-memo',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: s.settings,
      screens: s.screens,
      tasks: s.tasks,
      notes: s.notes,
      habits: s.habits,
      schedule: s.schedule,
      countdowns: s.countdowns,
      categories: s.categories,
      userTemplates: s.userTemplates,
      snapshots: s.snapshots,
      assets: encoded.filter((a) => a.dataUrl),
    };
  },
  importBackup: async (b) => {
    if (b.app !== 'screen-memo' || !Array.isArray(b.screens)) throw new Error('invalid');
    const assets = await Promise.all(
      (b.assets ?? []).map(async (a) => ({ id: a.id, blob: await (await fetch(a.dataUrl)).blob(), createdAt: Date.now() })),
    );
    await db.transaction(
      'rw',
      [db.screens, db.tasks, db.notes, db.habits, db.schedule, db.countdowns, db.categories, db.userTemplates, db.snapshots, db.assets],
      async () => {
        await Promise.all([
          db.screens.clear(), db.tasks.clear(), db.notes.clear(), db.habits.clear(), db.schedule.clear(),
          db.countdowns.clear(), db.categories.clear(), db.userTemplates.clear(), db.snapshots.clear(), db.assets.clear(),
        ]);
        await Promise.all([
          db.screens.bulkPut(b.screens),
          db.tasks.bulkPut(b.tasks ?? []),
          db.notes.bulkPut(b.notes ?? []),
          db.habits.bulkPut(b.habits ?? []),
          db.schedule.bulkPut(b.schedule ?? []),
          db.countdowns.bulkPut(b.countdowns ?? []),
          db.categories.bulkPut(b.categories ?? []),
          db.userTemplates.bulkPut(b.userTemplates ?? []),
          db.snapshots.bulkPut(b.snapshots ?? []),
          db.assets.bulkPut(assets),
        ]);
      },
    );
    const settings = { ...DEFAULT_SETTINGS, ...b.settings, onboarded: true };
    saveSettings(settings);
    set({ settings, ready: false });
    await get().init();
  },
  wipeAll: async () => {
    await db.delete();
    localStorage.removeItem(SETTINGS_KEY);
    location.reload();
  },
}));

/** Screen が表示するタスクか */
export function taskBelongsToScreen(t: Task, sc: ScreenDoc) {
  return sc.onlyOwnTasks ? t.screenId === sc.id : !t.screenId || t.screenId === sc.id;
}
