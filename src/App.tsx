import { useEffect } from 'react';
import { useData } from './store/data';
import { useUI } from './store/ui';
import { useAppTheme } from './lib/theme';
import { useReminders } from './lib/reminder';
import { BottomNav } from './components/BottomNav';
import { Fab } from './components/Fab';
import { Onboarding } from './components/Onboarding';
import { ToastHost } from './components/ToastHost';
import { SheetHost } from './sheets';
import { PreviewOverlay } from './components/PreviewOverlay';
import Today from './screens/Today';
import Tasks from './screens/Tasks';
import Notes from './screens/Notes';
import Templates from './screens/Templates';
import SettingsScreen from './screens/Settings';

export default function App() {
  const ready = useData((s) => s.ready);
  const init = useData((s) => s.init);
  const refreshDay = useData((s) => s.refreshDay);
  const onboarded = useData((s) => s.settings.onboarded);
  const tab = useUI((s) => s.tab);

  useAppTheme();
  useReminders();

  useEffect(() => {
    void init();
  }, [init]);

  /* 日付またぎ (§34): 復帰時と 1 分ごとに論理日を確認 */
  useEffect(() => {
    if (!ready) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshDay();
    };
    const timer = setInterval(refreshDay, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ready, refreshDay]);

  if (!ready) return <Splash />;

  return (
    <>
      <main
        className="pt-safe"
        style={{ paddingBottom: 'calc(var(--nav-h) + var(--sab) + 12px)' }}
      >
        {tab === 'today' && <Today />}
        {tab === 'tasks' && <Tasks />}
        {tab === 'notes' && <Notes />}
        {tab === 'templates' && <Templates />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      {(tab === 'today' || tab === 'tasks' || tab === 'notes') && <Fab />}
      <BottomNav />
      <ToastHost />
      <SheetHost />
      <PreviewOverlay />
      {!onboarded && <Onboarding />}
    </>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="読み込み中">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink/50" />
    </div>
  );
}
