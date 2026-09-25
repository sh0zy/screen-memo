import { create } from 'zustand';
import type { ID } from '../types';

export type Tab = 'today' | 'notes' | 'tasks' | 'templates' | 'settings';

export type Sheet =
  | { type: 'add' }
  | { type: 'task'; id?: ID; defaults?: { dueDate?: string; priority?: 'high' | 'medium' | 'low'; screenId?: ID } }
  | { type: 'note'; id?: ID; kind?: 'text' | 'checklist' }
  | { type: 'schedule'; id?: ID; date?: string }
  | { type: 'habit'; id?: ID }
  | { type: 'countdown'; id?: ID }
  | { type: 'goals' }
  | { type: 'design' }
  | { type: 'sections' }
  | { type: 'cards'; id?: ID }
  | { type: 'screens' }
  | { type: 'history' }
  | { type: 'quick'; target: 'task' | 'inbox' }
  | { type: 'taskActions'; id: ID }
  | { type: 'noteActions'; id: ID }
  | { type: 'search' }
  | { type: 'trash' }
  | { type: 'archive' }
  | { type: 'inbox' }
  | { type: 'categories' }
  | { type: 'saveTemplate' };

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface UIState {
  tab: Tab;
  sheets: Sheet[];
  preview: null | { screenId: ID; tomorrow?: boolean };
  toast: Toast | null;
  setTab: (t: Tab) => void;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
  replaceSheet: (s: Sheet) => void;
  closeAllSheets: () => void;
  openPreview: (screenId: ID, tomorrow?: boolean) => void;
  closePreview: () => void;
  showToast: (message: string, undo?: () => void) => void;
  hideToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * 戻るジェスチャー対応:
 * シート / プレビューを開くたびに history.pushState し、popstate で閉じる。
 */
let suppressPop = 0;
function pushHistory() {
  try {
    history.pushState({ sm: true }, '');
  } catch {
    /* noop */
  }
}
function popHistory() {
  suppressPop++;
  history.back();
}

export const useUI = create<UIState>((set, get) => ({
  tab: 'today',
  sheets: [],
  preview: null,
  toast: null,
  setTab: (tab) => {
    set({ tab });
    window.scrollTo({ top: 0 });
  },
  openSheet: (s) => {
    pushHistory();
    set({ sheets: [...get().sheets, s] });
  },
  closeSheet: () => {
    if (get().sheets.length === 0) return;
    set({ sheets: get().sheets.slice(0, -1) });
    popHistory();
  },
  replaceSheet: (s) => {
    const sheets = get().sheets;
    if (sheets.length === 0) {
      pushHistory();
      set({ sheets: [s] });
    } else set({ sheets: [...sheets.slice(0, -1), s] });
  },
  closeAllSheets: () => {
    const n = get().sheets.length;
    if (n === 0) return;
    set({ sheets: [] });
    suppressPop++;
    history.go(-n);
  },
  openPreview: (screenId, tomorrow) => {
    pushHistory();
    set({ preview: { screenId, tomorrow } });
  },
  closePreview: () => {
    if (!get().preview) return;
    set({ preview: null });
    popHistory();
  },
  showToast: (message, undo) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), message, undo } });
    toastTimer = setTimeout(() => set({ toast: null }), undo ? 5000 : 2400);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (suppressPop > 0) {
      suppressPop--;
      return;
    }
    const s = useUI.getState();
    if (s.preview) useUI.setState({ preview: null });
    else if (s.sheets.length > 0) useUI.setState({ sheets: s.sheets.slice(0, -1) });
  });
}
