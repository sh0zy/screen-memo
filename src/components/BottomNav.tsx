import { LayoutTemplate, ListChecks, Settings, StickyNote, Sun } from 'lucide-react';
import type { Tab } from '../store/ui';
import { useUI } from '../store/ui';
import { cx } from '../lib/id';
import { tapHaptic } from '../lib/haptics';

const TABS: { id: Tab; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', Icon: Sun },
  { id: 'tasks', label: 'タスク', Icon: ListChecks },
  { id: 'notes', label: 'メモ', Icon: StickyNote },
  { id: 'templates', label: 'デザイン', Icon: LayoutTemplate },
  { id: 'settings', label: '設定', Icon: Settings },
];

export function BottomNav() {
  const tab = useUI((s) => s.tab);
  const setTab = useUI((s) => s.setTab);

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-30 border-t hairline bg-elevated/80 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <ul className="mx-auto flex h-[var(--nav-h)] max-w-[520px] items-stretch">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (!active) tapHaptic('light');
                  setTab(id);
                }}
                className={cx(
                  'press flex h-full w-full flex-col items-center justify-center gap-[3px]',
                  active ? 'text-accent' : 'text-faint',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.1 : 1.7} aria-hidden />
                <span className={cx('text-[10.5px] tracking-[0.01em]', active && 'font-semibold')}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
