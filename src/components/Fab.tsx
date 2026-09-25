import { Plus } from 'lucide-react';
import { useUI } from '../store/ui';
import { tapHaptic } from '../lib/haptics';

/** ナビの上に浮かぶ追加ボタン。長押しで 1 行クイック追加。 */
export function Fab() {
  const openSheet = useUI((s) => s.openSheet);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto flex max-w-[520px] justify-end px-4"
      style={{ bottom: 'calc(var(--nav-h) + var(--sab) + 14px)' }}
    >
      <button
        type="button"
        aria-label="追加"
        onClick={() => {
          tapHaptic('light');
          openSheet({ type: 'add' });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          openSheet({ type: 'quick', target: 'task' });
        }}
        className="press pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lift"
      >
        <Plus size={26} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
