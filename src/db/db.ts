import Dexie, { type Table } from 'dexie';
import type {
  Asset,
  Category,
  Countdown,
  Habit,
  Note,
  ScheduleItem,
  ScreenDoc,
  ScreenSnapshot,
  Task,
  UserTemplate,
} from '../types';

/**
 * IndexedDB スキーマ (Dexie)
 *  - 主キーはすべてクライアント生成の文字列ID
 *  - 論理削除 (deletedAt) はゴミ箱。30日経過で起動時に物理削除
 *  - 設定は軽量なので localStorage (store/settings.ts)
 */
export class ScreenMemoDB extends Dexie {
  screens!: Table<ScreenDoc, string>;
  tasks!: Table<Task, string>;
  notes!: Table<Note, string>;
  habits!: Table<Habit, string>;
  schedule!: Table<ScheduleItem, string>;
  countdowns!: Table<Countdown, string>;
  categories!: Table<Category, string>;
  userTemplates!: Table<UserTemplate, string>;
  snapshots!: Table<ScreenSnapshot, string>;
  assets!: Table<Asset, string>;

  constructor() {
    super('screen-memo');
    this.version(1).stores({
      screens: 'id, order, date',
      tasks: 'id, dueDate, completed, screenId, order, deletedAt, updatedAt',
      notes: 'id, pinned, favorite, deletedAt, updatedAt',
      habits: 'id, order',
      schedule: 'id, date, startTime',
      countdowns: 'id, targetDate',
      categories: 'id, order',
      userTemplates: 'id, createdAt',
      snapshots: 'id, screenId, date, createdAt',
      assets: 'id',
    });
  }
}

export const db = new ScreenMemoDB();

export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
