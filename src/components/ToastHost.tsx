import { useUI } from '../store/ui';

/** 画面下部 (ナビの上) に 1 件だけ出るトースト。Undo 付きなら 5 秒表示。 */
export function ToastHost() {
  const toast = useUI((s) => s.toast);
  const hideToast = useUI((s) => s.hideToast);
  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: 'calc(var(--nav-h) + var(--sab) + 12px)' }}
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.id}
        className="pointer-events-auto flex max-w-[420px] items-center gap-3 rounded-[16px] bg-ink px-4 py-3 shadow-lift animate-pop-in"
      >
        <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-canvas">{toast.message}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={() => {
              toast.undo?.();
              hideToast();
            }}
            className="press shrink-0 text-[13.5px] font-semibold text-canvas underline underline-offset-2"
          >
            取り消す
          </button>
        )}
      </div>
    </div>
  );
}
