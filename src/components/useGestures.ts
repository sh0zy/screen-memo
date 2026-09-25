import { useRef, useState } from 'react';
import { tapHaptic } from '../lib/haptics';

/**
 * スワイプ (§53) と 長押し (§54) を1つのポインタ処理で扱う。
 *  - 右スワイプ: しきい値を超えて離すと onSwipeRight
 *  - 左スワイプ: アクションを開いた状態でスナップ
 *  - 長押し 480ms: onLongPress (動いたらキャンセル)
 * 誤操作防止: 横移動が縦移動より明確に大きい時だけスワイプ扱い。
 */
export function useRowGestures({
  onSwipeRight,
  onLongPress,
  onTap,
  actionsWidth = 136,
  swipeThreshold = 88,
}: {
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onTap?: () => void;
  actionsWidth?: number;
  swipeThreshold?: number;
}) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const st = useRef<{
    x: number;
    y: number;
    base: number;
    mode: 'undecided' | 'swipe' | 'scroll';
    timer?: ReturnType<typeof setTimeout>;
    longFired: boolean;
    passed: boolean;
    id: number;
  } | null>(null);

  const clearTimer = () => {
    if (st.current?.timer) clearTimeout(st.current.timer);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest?.('[data-no-gesture]')) return;
    st.current = {
      x: e.clientX,
      y: e.clientY,
      base: open ? -actionsWidth : 0,
      mode: 'undecided',
      longFired: false,
      passed: false,
      id: e.pointerId,
    };
    if (onLongPress) {
      st.current.timer = setTimeout(() => {
        if (st.current && st.current.mode === 'undecided') {
          st.current.longFired = true;
          tapHaptic('medium');
          onLongPress();
        }
      }, 480);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (s.mode === 'undecided') {
      if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.4) {
        s.mode = 'swipe';
        clearTimer();
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.abs(my) > 8 || Math.abs(mx) > 8) {
        s.mode = 'scroll';
        clearTimer();
      }
    }
    if (s.mode === 'swipe') {
      let next = s.base + mx;
      if (!onSwipeRight) next = Math.min(0, next);
      next = Math.max(-actionsWidth - 40, Math.min(140, next));
      if (!s.passed && next > swipeThreshold) {
        s.passed = true;
        tapHaptic('light');
      } else if (s.passed && next < swipeThreshold) s.passed = false;
      setDx(next);
    }
  };

  const onPointerUp = () => {
    const s = st.current;
    clearTimer();
    st.current = null;
    setDragging(false);
    if (!s) return;
    if (s.mode === 'swipe') {
      const cur = dx;
      if (cur > swipeThreshold && onSwipeRight) {
        setDx(0);
        setOpen(false);
        onSwipeRight();
      } else if (cur < -actionsWidth / 2) {
        setDx(-actionsWidth);
        setOpen(true);
      } else {
        setDx(0);
        setOpen(false);
      }
      return;
    }
    if (s.mode === 'undecided' && !s.longFired) {
      if (open) {
        setDx(0);
        setOpen(false);
      } else onTap?.();
    }
  };

  const close = () => {
    setDx(0);
    setOpen(false);
  };

  return {
    dx,
    open,
    dragging,
    close,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onContextMenu: (e: React.MouseEvent) => {
        // デスクトップの右クリック = 長押し
        if (onLongPress) {
          e.preventDefault();
          clearTimer();
          st.current = null;
          onLongPress();
        }
      },
      style: { touchAction: 'pan-y' as const },
    },
  };
}
