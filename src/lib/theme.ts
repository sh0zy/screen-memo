import { useEffect } from 'react';
import { useData } from '../store/data';
import { APP_THEMES, DARK_BASE } from '../wallpaper/templates';
import type { AppTheme } from '../wallpaper/templates';

/** '#RRGGBB' → '17 17 19' (CSS var 用) */
export function hexToTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function hexLuminance(hex: string): number {
  const [r, g, b] = hexToTriplet(hex).split(' ').map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** 背景色の上で読めるテキスト色 */
export function readableOn(hex: string): string {
  return hexLuminance(hex) > 0.6 ? '#111113' : '#FFFFFF';
}

function paletteOf(theme: AppTheme | undefined, systemDark: boolean) {
  if (theme?.dark) return { palette: theme.light, dark: true };
  if (systemDark) return { palette: DARK_BASE, dark: true };
  return { palette: theme?.light ?? APP_THEMES[0].light, dark: false };
}

/**
 * appTheme / theme / accent を :root の CSS 変数へ反映する (§82)。
 * 変数名は index.css の --c-* に対応。
 */
export function useAppTheme() {
  const pref = useData((s) => s.settings.theme);
  const appTheme = useData((s) => s.settings.appTheme);
  const accent = useData((s) => s.settings.accent);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const systemDark = pref === 'dark' || (pref === 'system' && mq.matches);
      const theme = APP_THEMES.find((t) => t.id === appTheme);
      const { palette, dark } = paletteOf(theme, systemDark);
      const root = document.documentElement;

      root.style.setProperty('--c-canvas', palette.canvas);
      root.style.setProperty('--c-surface', palette.surface);
      root.style.setProperty('--c-elevated', palette.elevated);
      root.style.setProperty('--c-ink', palette.ink);
      root.style.setProperty('--c-subtle', palette.subtle);
      root.style.setProperty('--c-faint', palette.faint);
      root.style.setProperty('--c-line', palette.line);

      // ダーク面の上では黒アクセントが沈むので ink に寄せる
      const effAccent = dark && hexLuminance(accent) < 0.25 ? `rgb(${palette.ink})` : accent;
      root.style.setProperty('--c-accent', effAccent.startsWith('#') ? hexToTriplet(effAccent) : palette.ink);
      root.style.setProperty(
        '--c-on-accent',
        hexToTriplet(effAccent.startsWith('#') ? readableOn(effAccent) : dark ? '#111113' : '#FFFFFF'),
      );

      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);

      // index.html の media 付き theme-color も含めて実際の背景色に揃える
      const canvas = `rgb(${palette.canvas})`;
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metas.length === 0) {
        const m = document.createElement('meta');
        m.name = 'theme-color';
        m.content = canvas;
        document.head.appendChild(m);
      } else metas.forEach((m) => m.setAttribute('content', canvas));
    };

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref, appTheme, accent]);
}
