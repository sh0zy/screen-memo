/**
 * Haptic Feedback。
 * Capacitor 化した際は window.Capacitor.Plugins.Haptics が存在するのでそれを使う。
 * Web では navigator.vibrate (Android Chrome) にフォールバック、無ければ何もしない。
 */
type CapHaptics = { impact?: (o: { style: string }) => Promise<void> };

let enabled = true;
export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

export function tapHaptic(kind: 'light' | 'medium' = 'light') {
  if (!enabled) return;
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: CapHaptics } } }).Capacitor;
    const h = cap?.Plugins?.Haptics;
    if (h?.impact) {
      void h.impact({ style: kind === 'light' ? 'LIGHT' : 'MEDIUM' });
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(kind === 'light' ? 8 : 16);
    }
  } catch {
    /* noop */
  }
}
