import { useEffect, useMemo, useState } from 'react';
import { useData } from '../store/data';
import type { DeviceRatio, ScreenDoc } from '../types';
import type { ModelInput } from './model';

export function useWallpaperInput(
  screen: ScreenDoc | undefined,
  opts: { mask?: boolean; tomorrow?: boolean } = {},
): Omit<ModelInput, 'budget'> | null {
  const tasks = useData((s) => s.tasks);
  const notes = useData((s) => s.notes);
  const habits = useData((s) => s.habits);
  const schedule = useData((s) => s.schedule);
  const countdowns = useData((s) => s.countdowns);
  const today = useData((s) => s.today);
  const completedDisplay = useData((s) => s.settings.completedDisplay);
  const { mask, tomorrow } = opts;
  return useMemo(
    () =>
      screen
        ? { screen, tasks, notes, habits, schedule, countdowns, today, completedDisplay, mask, tomorrow }
        : null,
    [screen, tasks, notes, habits, schedule, countdowns, today, completedDisplay, mask, tomorrow],
  );
}

export function useViewport() {
  const read = () => ({
    w: window.innerWidth,
    h: window.visualViewport?.height ? Math.max(window.innerHeight, window.visualViewport.height) : window.innerHeight,
  });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return vp;
}

export const RATIO_VALUE: Record<Exclude<DeviceRatio, 'auto'>, number> = {
  '9:16': 16 / 9,
  '9:19.5': 19.5 / 9,
  '9:20': 20 / 9,
};

export function isPhoneViewport(w: number) {
  return w < 600;
}

/** 縦/横 の比率。auto ならスマホ実寸、PCでは 9:19.5 */
export function useDeviceRatio(): number {
  const pref = useData((s) => s.settings.deviceRatio);
  const vp = useViewport();
  if (pref !== 'auto') return RATIO_VALUE[pref];
  if (isPhoneViewport(vp.w) && vp.h > vp.w) return vp.h / vp.w;
  return 19.5 / 9;
}
