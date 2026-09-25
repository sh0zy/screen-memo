import { useLayoutEffect, useRef, useState } from 'react';
import type { ModelInput } from './model';
import { WallpaperCanvas, type FitResult } from './WallpaperCanvas';

const LOGICAL_W = 390;

/**
 * 論理サイズ 390 × (390*ratio) で描画し、親の幅に合わせて縮小表示。
 * サムネイル・モックアップ・テンプレートカードで利用。
 */
export function ScaledCanvas({
  input,
  ratio,
  chrome,
  onFit,
  radius = 0,
  className,
}: {
  input: Omit<ModelInput, 'budget'>;
  ratio: number;
  chrome?: 'lock' | 'home' | false;
  onFit?: (r: FitResult) => void;
  radius?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const logicalH = LOGICAL_W * ratio;
  const scale = w / LOGICAL_W;
  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', width: '100%', aspectRatio: `1 / ${ratio}`, overflow: 'hidden', borderRadius: radius, isolation: 'isolate' }}
    >
      {w > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <WallpaperCanvas input={input} width={LOGICAL_W} height={logicalH} chrome={chrome} onFit={onFit} />
        </div>
      )}
    </div>
  );
}
