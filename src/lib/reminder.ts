import { useEffect } from 'react';
import { useData } from '../store/data';
import { isValidTime } from './date';

const FIRED_KEY = 'screen-memo:reminder-fired:v1';

type Slot = 'morning' | 'night';

const MESSAGE: Record<Slot, { title: string; body: string }> = {
  morning: { title: '今日の画面をつくる', body: '今日やることを書いて、壁紙を更新しましょう。' },
  night: { title: '明日の準備', body: '明日やることを先に書いておくと、朝がラクになります。' },
};

/** 同じ日に同じ枠を二重に鳴らさないための記録 */
function alreadyFired(slot: Slot, day: string): boolean {
  try {
    return localStorage.getItem(FIRED_KEY) === `${day}:${slot}`;
  } catch {
    return false;
  }
}
function markFired(slot: Slot, day: string) {
  try {
    localStorage.setItem(FIRED_KEY, `${day}:${slot}`);
  } catch {
    /* noop */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notificationsAvailable() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * アプリが開かれている間だけのローカル通知 (§85)。
 * バックグラウンド配信はしないので、設定画面でもその旨を伝える。
 */
export function useReminders() {
  const morning = useData((s) => s.settings.morningReminder);
  const night = useData((s) => s.settings.nightReminder);
  const today = useData((s) => s.today);

  useEffect(() => {
    if (!notificationsAvailable()) return;
    if (!morning && !night) return;

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

      for (const [slot, at] of [
        ['morning', morning],
        ['night', night],
      ] as [Slot, string | undefined][]) {
        if (!at || !isValidTime(at)) continue;
        // 起動していなかった時間帯を取りこぼさないよう、過ぎていれば当日中に1度だけ出す
        if (hm >= at && !alreadyFired(slot, day)) {
          markFired(slot, day);
          try {
            new Notification(MESSAGE[slot].title, { body: MESSAGE[slot].body, tag: `screen-memo-${slot}` });
          } catch {
            /* 通知が使えない環境では黙って無視 */
          }
        }
      }
    };

    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [morning, night, today]);
}
