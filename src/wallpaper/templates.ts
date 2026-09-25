import type {
  AppThemeName,
  BackgroundConfig,
  FontSettings,
  ScreenDoc,
  SectionConfig,
  SectionKind,
  TemplateId,
  WallpaperTemplate,
} from '../types';

export const SECTION_LABEL: Record<SectionKind, string> = {
  goal: 'Goal',
  priority: 'Priority',
  tasks: 'Tasks',
  schedule: 'Schedule',
  habits: 'Habits',
  memo: 'Memo',
  countdown: 'Countdown',
  cards: 'Cards',
};

export const SECTION_LABEL_JA: Record<SectionKind, string> = {
  goal: '今日の目標',
  priority: '重要タスク',
  tasks: 'タスク',
  schedule: '予定',
  habits: '習慣',
  memo: 'メモ',
  countdown: 'カウントダウン',
  cards: 'ミニカード',
};

export const ALL_SECTIONS: SectionKind[] = [
  'goal',
  'priority',
  'tasks',
  'schedule',
  'habits',
  'memo',
  'countdown',
  'cards',
];

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'solid',
  color: '#FFFFFF',
  gradientFrom: '#F7F7F8',
  gradientTo: '#E9E9EC',
  gradientAngle: 180,
  blur: 0,
  brightness: 1,
  overlay: 0,
  textShadow: false,
};

export const DEFAULT_FONT: FontSettings = {
  family: 'sans',
  size: 'M',
  scale: 1,
  textColor: '#111113',
  accentColor: '#E5484D',
};

export const TEMPLATES: WallpaperTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: '白背景に黒文字。いちばん静かな一枚。',
    style: { layout: 'stack', cardStyle: 'none', labelCase: 'upper', align: 'left', heroScale: 1, divider: false },
    background: { type: 'solid', color: '#FFFFFF' },
    font: { textColor: '#111113', accentColor: '#E5484D', family: 'sans' },
    sections: ['goal', 'priority', 'tasks', 'schedule', 'memo'],
  },
  {
    id: 'dark',
    name: 'Dark',
    description: '黒背景に白文字。有機ELで美しく。',
    style: { layout: 'stack', cardStyle: 'none', labelCase: 'upper', align: 'left', heroScale: 1, divider: false },
    background: { type: 'solid', color: '#0A0A0B' },
    font: { textColor: '#F4F4F5', accentColor: '#FF6369', family: 'sans' },
    sections: ['goal', 'priority', 'tasks', 'schedule', 'memo'],
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'アイボリーとベージュのやわらかい紙。',
    style: { layout: 'stack', cardStyle: 'card', labelCase: 'upper', align: 'left', heroScale: 1, divider: false },
    background: { type: 'gradient', gradientFrom: '#FAF7F1', gradientTo: '#EEE8DE', gradientAngle: 170 },
    font: { textColor: '#3B342C', accentColor: '#C0553F', family: 'serif' },
    sections: ['goal', 'priority', 'tasks', 'memo'],
  },
  {
    id: 'glass',
    name: 'Glass',
    description: '半透明カードとぼかし。写真背景と好相性。',
    style: { layout: 'stack', cardStyle: 'glass', labelCase: 'upper', align: 'left', heroScale: 1, divider: false },
    background: { type: 'gradient', gradientFrom: '#C8D3E6', gradientTo: '#E8DDEB', gradientAngle: 160 },
    font: { textColor: '#15161A', accentColor: '#E5484D', family: 'sans' },
    sections: ['goal', 'priority', 'tasks', 'schedule', 'memo'],
  },
  {
    id: 'study',
    name: 'Study',
    description: 'Today / Tasks / Goal / Study。学生向け。',
    style: { layout: 'stack', cardStyle: 'outline', labelCase: 'upper', align: 'left', heroScale: 1, divider: false },
    background: { type: 'solid', color: '#F8F8F5' },
    font: { textColor: '#1C2420', accentColor: '#2F6B55', family: 'sans' },
    sections: ['countdown', 'goal', 'priority', 'tasks', 'habits', 'cards'],
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Priority / Meeting / Tasks / Memo。',
    style: { layout: 'stack', cardStyle: 'none', labelCase: 'upper', align: 'left', heroScale: 0.9, divider: true },
    background: { type: 'solid', color: '#F4F4F3' },
    font: { textColor: '#1A1A1C', accentColor: '#D9480F', family: 'sans' },
    sections: ['priority', 'schedule', 'tasks', 'memo'],
  },
  {
    id: 'checklist',
    name: 'Simple Checklist',
    description: 'チェックリストだけを大きく。',
    style: { layout: 'checklist', cardStyle: 'none', labelCase: 'upper', align: 'left', heroScale: 0.8, divider: false },
    background: { type: 'solid', color: '#FFFFFF' },
    font: { textColor: '#111113', accentColor: '#E5484D', family: 'sans' },
    sections: ['priority', 'tasks'],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: '今日の予定をタイムラインで。ToDoも一緒に。',
    style: { layout: 'agenda', cardStyle: 'none', labelCase: 'upper', align: 'left', heroScale: 1, divider: false },
    background: { type: 'solid', color: '#FBFBFC' },
    font: { textColor: '#16171B', accentColor: '#3E63DD', family: 'sans' },
    sections: ['schedule', 'priority', 'tasks'],
  },
  {
    id: 'goal',
    name: 'Goal',
    description: '今日の目標を中央に大きく。',
    style: { layout: 'hero', cardStyle: 'none', labelCase: 'upper', align: 'center', heroScale: 1, divider: false },
    background: { type: 'solid', color: '#FFFFFF' },
    font: { textColor: '#111113', accentColor: '#E5484D', family: 'serif' },
    sections: ['goal', 'priority', 'memo'],
  },
  {
    id: 'wallpaper',
    name: 'Wallpaper',
    description: '壁紙として違和感のない超ミニマル。',
    style: { layout: 'minimal', cardStyle: 'none', labelCase: 'normal', align: 'center', heroScale: 0.8, divider: false },
    background: { type: 'gradient', gradientFrom: '#EDEDEF', gradientTo: '#D9D9DE', gradientAngle: 180 },
    font: { textColor: '#1E1E22', accentColor: '#E5484D', family: 'sans' },
    sections: ['goal', 'priority', 'memo'],
  },
];

export function getTemplate(id: string): WallpaperTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** テンプレートの sections を先頭に、それ以外を非表示で後ろに並べる */
export function sectionsFor(kinds: SectionKind[]): SectionConfig[] {
  const visible = kinds.map((k) => ({ kind: k, visible: true }));
  const hidden = ALL_SECTIONS.filter((k) => !kinds.includes(k)).map((k) => ({ kind: k, visible: false }));
  return [...visible, ...hidden];
}

/** テンプレートを Screen に適用 (内容は保持、見た目と構成だけ変える) */
export function applyTemplate(screen: ScreenDoc, id: TemplateId): ScreenDoc {
  const t = getTemplate(id);
  const keepPhoto = screen.background.type === 'photo' && id === 'glass';
  return {
    ...screen,
    templateId: id,
    background: keepPhoto
      ? screen.background
      : { ...DEFAULT_BACKGROUND, ...t.background, photoId: screen.background.photoId },
    fontSettings: {
      ...screen.fontSettings,
      ...t.font,
    },
    sections: sectionsFor(t.sections),
    updatedAt: Date.now(),
  };
}

/* ---------- アプリUIテーマ (§82) ---------- */

export interface AppTheme {
  id: AppThemeName;
  name: string;
  /** RGB triplets for CSS vars */
  light: { canvas: string; surface: string; elevated: string; ink: string; subtle: string; faint: string; line: string };
  dark?: boolean;
  swatch: string;
  /** 壁紙に適用するときの色 */
  wallpaper: { bg: string; fg: string };
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'pure', name: 'Pure White', swatch: '#FFFFFF',
    light: { canvas: '255 255 255', surface: '247 247 248', elevated: '255 255 255', ink: '17 17 19', subtle: '110 110 118', faint: '168 168 176', line: '234 234 238' },
    wallpaper: { bg: '#FFFFFF', fg: '#111113' },
  },
  {
    id: 'warm', name: 'Warm White', swatch: '#FBF9F5',
    light: { canvas: '251 249 245', surface: '244 241 235', elevated: '255 254 251', ink: '30 27 23', subtle: '115 108 98', faint: '170 162 150', line: '232 227 218' },
    wallpaper: { bg: '#FBF9F5', fg: '#1E1B17' },
  },
  {
    id: 'graphite', name: 'Graphite', swatch: '#2A2B2F', dark: true,
    light: { canvas: '28 29 32', surface: '37 38 42', elevated: '44 45 50', ink: '236 236 240', subtle: '160 160 170', faint: '110 110 120', line: '52 53 58' },
    wallpaper: { bg: '#232428', fg: '#ECECF0' },
  },
  {
    id: 'midnight', name: 'Midnight', swatch: '#0B0D14', dark: true,
    light: { canvas: '10 11 16', surface: '19 21 29', elevated: '25 27 37', ink: '234 236 244', subtle: '150 154 170', faint: '98 102 118', line: '36 39 51' },
    wallpaper: { bg: '#0B0D14', fg: '#EAECF4' },
  },
  {
    id: 'paper', name: 'Paper', swatch: '#F4F1EA',
    light: { canvas: '244 241 234', surface: '236 232 223', elevated: '250 248 243', ink: '40 36 30', subtle: '118 110 98', faint: '168 160 146', line: '224 218 206' },
    wallpaper: { bg: '#F4F1EA', fg: '#28241E' },
  },
  {
    id: 'sage', name: 'Sage', swatch: '#F2F5F1',
    light: { canvas: '244 247 243', surface: '236 241 235', elevated: '251 252 250', ink: '26 34 29', subtle: '104 116 108', faint: '158 170 161', line: '222 230 222' },
    wallpaper: { bg: '#EFF3EE', fg: '#1A221D' },
  },
  {
    id: 'sky', name: 'Sky', swatch: '#F1F5FA',
    light: { canvas: '244 247 251', surface: '236 241 248', elevated: '251 252 254', ink: '22 28 38', subtle: '102 112 128', faint: '156 166 182', line: '222 229 239' },
    wallpaper: { bg: '#EEF3F9', fg: '#161C26' },
  },
  {
    id: 'lavender', name: 'Lavender', swatch: '#F5F3FA',
    light: { canvas: '247 245 251', surface: '240 237 247', elevated: '252 251 254', ink: '30 26 40', subtle: '112 106 128', faint: '164 158 180', line: '229 225 239' },
    wallpaper: { bg: '#F3F1F9', fg: '#1E1A28' },
  },
];

/** システムのダーク時に使うベース */
export const DARK_BASE = APP_THEMES.find((t) => t.id === 'midnight')!.light;

export const ACCENTS = ['#111113', '#E5484D', '#D9480F', '#2F6B55', '#3E63DD', '#8E4EC6', '#0D9488', '#B8860B'];

export const WALLPAPER_COLORS = [
  '#FFFFFF', '#F7F7F8', '#FBF9F5', '#F4F1EA', '#EFF3EE', '#EEF3F9', '#F3F1F9', '#FCEFEF',
  '#E9E9EC', '#C9CCD3', '#6E6E76', '#2A2B2F', '#16171B', '#0A0A0B', '#0B0D14', '#1C2A24',
];

export const GRADIENTS: [string, string][] = [
  ['#F7F7F8', '#E4E4E8'],
  ['#FAF7F1', '#EEE8DE'],
  ['#C8D3E6', '#E8DDEB'],
  ['#E6ECE4', '#F6F3EA'],
  ['#E7EEF7', '#F7F2EC'],
  ['#FBE9E4', '#EDE7F4'],
  ['#1B1C22', '#3A3B44'],
  ['#0B0D14', '#23283A'],
  ['#14231D', '#2E4A3E'],
];
