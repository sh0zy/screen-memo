/* =========================================================
 * Screen Memo — domain types
 * 日付は常にローカル日付の 'YYYY-MM-DD' 文字列、時刻は 'HH:mm'。
 * タイムスタンプ (createdAt など) は epoch ms。
 * ======================================================= */

export type ID = string;
export type DateStr = string; // YYYY-MM-DD
export type TimeStr = string; // HH:mm

/* ---------- Task ---------- */

export type Priority = 'high' | 'medium' | 'low';

export type RepeatType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'days' | 'monthly';

export interface RepeatRule {
  type: RepeatType;
  /** weekly / days: 0=Sun … 6=Sat */
  days?: number[];
  /** monthly: 1-31 */
  monthDay?: number;
}

export interface Subtask {
  id: ID;
  title: string;
  completed: boolean;
}

export interface Task {
  id: ID;
  title: string;
  note?: string;
  completed: boolean;
  completedAt?: number;
  priority: Priority;
  dueDate?: DateStr;
  categoryId?: ID;
  tags: string[];
  /** 特定Screen専用のタスク。未指定なら全Screen共通 */
  screenId?: ID;
  repeat: RepeatRule;
  /** 繰り返しタスク完了時に生成した次回分のID (完了を戻したら削除) */
  nextId?: ID;
  subtasks: Subtask[];
  /** 壁紙に表示しない (Privacy Mode) */
  hideFromWallpaper: boolean;
  /** Preview時だけ •••••• で隠す */
  sensitive: boolean;
  /** Inbox に入っている (日付なし・未整理) */
  inbox: boolean;
  order: number;
  archived: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type TaskBucket = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'someday' | 'completed';

/* ---------- Note ---------- */

export type NoteKind = 'text' | 'checklist';

export interface ChecklistItem {
  id: ID;
  text: string;
  checked: boolean;
}

export interface Note {
  id: ID;
  kind: NoteKind;
  title: string;
  content: string;
  items: ChecklistItem[];
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  hideFromWallpaper: boolean;
  sensitive: boolean;
  /** Today Screen の Memo セクションに載せる */
  showOnScreen: boolean;
  archived: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Habit ---------- */

export interface Habit {
  id: ID;
  title: string;
  icon: IconName;
  /** 0=Sun … 6=Sat。空配列 = 毎日 */
  repeatDays: number[];
  completedDates: DateStr[];
  order: number;
  hideFromWallpaper: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Schedule ---------- */

export interface ScheduleItem {
  id: ID;
  title: string;
  startTime: TimeStr;
  endTime?: TimeStr;
  date: DateStr;
  hideFromWallpaper: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Countdown ---------- */

export interface Countdown {
  id: ID;
  title: string;
  targetDate: DateStr;
  hideFromWallpaper: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Category ---------- */

export interface Category {
  id: ID;
  name: string;
  icon: IconName;
  order: number;
}

/* ---------- Screen / Wallpaper ---------- */

export type SectionKind =
  | 'goal'
  | 'priority'
  | 'tasks'
  | 'schedule'
  | 'habits'
  | 'memo'
  | 'countdown'
  | 'cards';

export interface SectionConfig {
  kind: SectionKind;
  visible: boolean;
  /** 表示ラベル。空なら既定ラベル */
  title?: string;
  icon?: IconName;
  /** 自由レイアウト (§72) のゾーン */
  zone?: 'top' | 'middle' | 'bottom';
}

export interface GoalItem {
  id: ID;
  text: string;
  done: boolean;
}

export type MiniCardKind = 'number' | 'progress' | 'text';

export interface MiniCard {
  id: ID;
  kind: MiniCardKind;
  title: string;
  /** number: '65kg' / progress: '3' / text: 'イヤホン' */
  value: string;
  /** progress: 分母 '4' / number: 補足 '785 → 800' */
  sub?: string;
  icon?: IconName;
}

export type BackgroundType = 'solid' | 'gradient' | 'photo';

export interface BackgroundConfig {
  type: BackgroundType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  /** assets テーブルのID */
  photoId?: ID;
  blur: number; // px 0-30
  brightness: number; // 0.3 - 1.3
  overlay: number; // 0 - 0.8 (黒)
  textShadow: boolean;
}

export type FontFamily = 'sans' | 'serif' | 'rounded' | 'mono';
export type FontSizePreset = 'S' | 'M' | 'L' | 'XL';

export interface FontSettings {
  family: FontFamily;
  size: FontSizePreset;
  /** スライダー微調整 0.85 - 1.2 */
  scale: number;
  textColor: string;
  accentColor: string;
}

export type WallpaperMode = 'lock' | 'home';
export type OverflowPolicy = 'all' | 'important';
export type TimeOfDayMode = 'off' | 'auto';

export interface ScreenDoc {
  id: ID;
  name: string;
  /** Today系Screenの日付 (履歴・Daily Reset用) */
  date: DateStr;
  templateId: TemplateId | string;
  headline: string;
  goals: GoalItem[];
  memo: string;
  sections: SectionConfig[];
  background: BackgroundConfig;
  fontSettings: FontSettings;
  mode: WallpaperMode;
  focusMode: boolean;
  showProgress: boolean;
  progressStyle: 'fraction' | 'percent' | 'bar';
  showDate: boolean;
  overflow: OverflowPolicy;
  timeOfDay: TimeOfDayMode;
  /** Home Screen Mode の内容の不透明度 */
  contentOpacity: number;
  /** ロック画面上部の空白割合 0.15-0.4 */
  safeTop: number;
  miniCards: MiniCard[];
  /** このScreen専用タスクのみ表示 */
  onlyOwnTasks: boolean;
  favorite: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/* ---------- Template ---------- */

export type TemplateId =
  | 'minimal'
  | 'dark'
  | 'soft'
  | 'glass'
  | 'study'
  | 'work'
  | 'checklist'
  | 'calendar'
  | 'goal'
  | 'wallpaper';

export type CardStyle = 'none' | 'card' | 'glass' | 'outline';
export type LayoutStyle = 'stack' | 'center' | 'checklist' | 'hero' | 'agenda' | 'minimal';

export interface TemplateStyle {
  layout: LayoutStyle;
  cardStyle: CardStyle;
  labelCase: 'upper' | 'normal';
  align: 'left' | 'center';
  /** 見出し(TODAY)のサイズ倍率 */
  heroScale: number;
  divider: boolean;
}

export interface WallpaperTemplate {
  id: TemplateId;
  name: string;
  description: string;
  style: TemplateStyle;
  background: Partial<BackgroundConfig>;
  font: Partial<FontSettings>;
  sections: SectionKind[];
}

/** ユーザー保存テンプレート (My Template) */
export interface UserTemplate {
  id: ID;
  name: string;
  icon: IconName;
  /** Screen の見た目・構成スナップショット */
  layout: Pick<
    ScreenDoc,
    | 'templateId'
    | 'sections'
    | 'background'
    | 'fontSettings'
    | 'mode'
    | 'focusMode'
    | 'showProgress'
    | 'progressStyle'
    | 'showDate'
    | 'headline'
    | 'miniCards'
    | 'safeTop'
    | 'contentOpacity'
  >;
  createdAt: number;
}

/* ---------- History ---------- */

export interface ScreenSnapshot {
  id: ID;
  screenId: ID;
  date: DateStr;
  name: string;
  screen: ScreenDoc;
  /** 当日のタスクの見た目スナップショット */
  tasks: Pick<Task, 'id' | 'title' | 'priority' | 'completed' | 'dueDate'>[];
  createdAt: number;
}

export interface Asset {
  id: ID;
  blob: Blob;
  createdAt: number;
}

/* ---------- Settings ---------- */

export type ThemePref = 'light' | 'dark' | 'system';
export type AppThemeName =
  | 'pure'
  | 'warm'
  | 'graphite'
  | 'midnight'
  | 'paper'
  | 'sage'
  | 'sky'
  | 'lavender';
export type CompletedDisplay = 'dim' | 'strike' | 'hide';
export type ResetPolicy = 'carry' | 'inbox' | 'keep';
export type DeviceRatio = 'auto' | '9:16' | '9:19.5' | '9:20';

export interface AppSettings {
  theme: ThemePref;
  appTheme: AppThemeName;
  accent: string;
  completedDisplay: CompletedDisplay;
  resetHour: number; // 0-23
  resetPolicy: ResetPolicy;
  lastResetDate?: DateStr;
  deviceRatio: DeviceRatio;
  onboarded: boolean;
  screenshotGuideSeen: boolean;
  activeScreenId?: ID;
  haptics: boolean;
  morningReminder?: TimeStr;
  nightReminder?: TimeStr;
}

/* ---------- Icons ---------- */

export type IconName =
  | 'sun'
  | 'target'
  | 'flag'
  | 'list'
  | 'calendar'
  | 'repeat'
  | 'sticky'
  | 'hourglass'
  | 'grid'
  | 'book'
  | 'briefcase'
  | 'dumbbell'
  | 'bag'
  | 'laptop'
  | 'graduation'
  | 'heart'
  | 'home'
  | 'palette'
  | 'coffee'
  | 'plane'
  | 'music'
  | 'pen'
  | 'star'
  | 'droplet'
  | 'moon'
  | 'leaf'
  | 'wallet'
  | 'bell';
