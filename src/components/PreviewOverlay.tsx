import { useCallback, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Eye, EyeOff, X } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { cx } from '../lib/id';
import { formatShort } from '../lib/date';
import { WallpaperCanvas } from '../wallpaper/WallpaperCanvas';
import { isPhoneViewport, useDeviceRatio, useViewport, useWallpaperInput } from '../wallpaper/hooks';

/**
 * ロック画面プレビュー (§70)。実寸で描画し、
 * スクリーンショット or 画像保存で壁紙にできる状態にする。
 */
export function PreviewOverlay() {
  const preview = useUI((s) => s.preview);
  const closePreview = useUI((s) => s.closePreview);
  const showToast = useUI((s) => s.showToast);
  const screen = useData((s) => s.screens.find((x) => x.id === preview?.screenId));
  const seenGuide = useData((s) => s.settings.screenshotGuideSeen);
  const updateSettings = useData((s) => s.updateSettings);

  const [mask, setMask] = useState(true);
  const [chrome, setChrome] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const vp = useViewport();
  const ratio = useDeviceRatio();
  const input = useWallpaperInput(screen, { mask, tomorrow: preview?.tomorrow });

  const phone = isPhoneViewport(vp.w);
  const height = phone ? vp.h : Math.min(vp.h - 140, 760);
  const width = phone ? vp.w : Math.round(height / ratio);

  const save = useCallback(async () => {
    const node = nodeRef.current;
    if (!node || !screen) return;
    setCapturing(true);
    try {
      const url = await toPng(node, {
        width,
        height,
        pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
        cacheBust: true,
        skipFonts: false,
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screen.name}-${formatShort(screen.date).replace(' ', '')}.png`;
      a.click();
      showToast('画像を保存しました');
      if (!seenGuide) updateSettings({ screenshotGuideSeen: true });
    } catch {
      showToast('画像を作成できませんでした。スクリーンショットをお使いください');
    } finally {
      setCapturing(false);
    }
  }, [width, height, screen, showToast, seenGuide, updateSettings]);

  if (!preview || !screen || !input) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black" role="dialog" aria-modal="true" aria-label="ロック画面プレビュー">
      <div
        className={cx('relative overflow-hidden', !phone && 'rounded-[38px] shadow-lift ring-1 ring-white/10')}
        style={{ width, height }}
      >
        <WallpaperCanvas
          input={input}
          width={width}
          height={height}
          chrome={chrome ? screen.mode : false}
          canvasRef={nodeRef}
        />
      </div>

      {!capturing && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-5"
          style={{ paddingBottom: 'calc(20px + var(--sab))' }}
        >
          {!seenGuide && (
            <p className="pointer-events-none rounded-full bg-white/10 px-3.5 py-1.5 text-[11.5px] text-white/80 backdrop-blur-md">
              電源ボタン + 音量↑ でスクリーンショット
            </p>
          )}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/10 p-1.5 backdrop-blur-xl">
            <PillButton label="閉じる" onClick={closePreview}>
              <X size={19} />
            </PillButton>
            <PillButton
              label={mask ? '伏せ字を解除' : '伏せ字にする'}
              active={mask}
              onClick={() => setMask((v) => !v)}
            >
              {mask ? <EyeOff size={18} /> : <Eye size={18} />}
            </PillButton>
            <PillButton label={chrome ? '時計を隠す' : '時計を表示'} active={chrome} onClick={() => setChrome((v) => !v)}>
              <span className="text-[12px] font-semibold tabular">12:00</span>
            </PillButton>
            <button
              type="button"
              onClick={() => void save()}
              className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-black"
            >
              <Download size={17} aria-hidden />
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PillButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'press inline-flex h-11 min-w-[44px] items-center justify-center rounded-full px-3',
        active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}
