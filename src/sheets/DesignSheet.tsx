import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { cx } from '../lib/id';
import { Button, Field, Segmented, Sheet, Slider, Toggle } from '../components/ui';
import { ScaledCanvas } from '../wallpaper/ScaledCanvas';
import { useDeviceRatio, useWallpaperInput } from '../wallpaper/hooks';
import { saveImageAsset } from '../wallpaper/assets';
import { GRADIENTS, WALLPAPER_COLORS } from '../wallpaper/templates';
import type { BackgroundType, FontFamily, FontSizePreset, OverflowPolicy, WallpaperMode } from '../types';
import type { SheetProps } from './types';

const TEXT_COLORS = ['#111113', '#3A3A40', '#6E6E76', '#FFFFFF', '#F2F2F5', '#C9CCD3'];
const ACCENT_COLORS = ['#E5484D', '#D9480F', '#B8860B', '#2F6B55', '#0D9488', '#3E63DD', '#8E4EC6', '#111113', '#FFFFFF'];

export function DesignSheet({ depth, onClose }: SheetProps) {
  const screen = useData((s) => s.activeScreen());
  const updateScreen = useData((s) => s.updateScreen);
  const showToast = useUI((s) => s.showToast);
  const ratio = useDeviceRatio();
  const input = useWallpaperInput(screen);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'bg' | 'text' | 'layout'>('bg');

  const bg = screen.background;
  const font = screen.fontSettings;
  const patchBg = (p: Partial<typeof bg>) => updateScreen(screen.id, { background: { ...bg, ...p } });
  const patchFont = (p: Partial<typeof font>) => updateScreen(screen.id, { fontSettings: { ...font, ...p } });

  const pickPhoto = async (file: File) => {
    try {
      const photoId = await saveImageAsset(file);
      patchBg({ type: 'photo', photoId });
    } catch {
      showToast('画像を読み込めませんでした');
    }
  };

  return (
    <Sheet depth={depth} onClose={onClose} tall title="デザイン">
      <div className="sticky top-0 z-10 -mx-5 mb-4 bg-elevated px-5 pb-3 pt-1">
        <div className="mb-3 flex justify-center">
          <div className="w-[104px] overflow-hidden rounded-[14px] shadow-soft ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
            {input && <ScaledCanvas input={input} ratio={ratio} chrome="lock" radius={14} />}
          </div>
        </div>
        <Segmented<'bg' | 'text' | 'layout'>
          label="デザインの項目"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'bg', label: '背景' },
            { value: 'text', label: '文字' },
            { value: 'layout', label: 'レイアウト' },
          ]}
        />
      </div>

      {tab === 'bg' && (
        <div className="flex flex-col gap-5 pb-4">
          <Segmented<BackgroundType>
            label="背景の種類"
            value={bg.type}
            onChange={(v) => patchBg({ type: v })}
            size="sm"
            options={[
              { value: 'solid', label: '単色' },
              { value: 'gradient', label: 'グラデ' },
              { value: 'photo', label: '写真' },
            ]}
          />

          {bg.type === 'solid' && (
            <Field label="色">
              <ul className="grid grid-cols-8 gap-2">
                {WALLPAPER_COLORS.map((c) => (
                  <li key={c}>
                    <Swatch color={c} active={bg.color === c} onClick={() => patchBg({ color: c })} />
                  </li>
                ))}
              </ul>
              <ColorInput value={bg.color} onChange={(v) => patchBg({ color: v })} label="自由な色" />
            </Field>
          )}

          {bg.type === 'gradient' && (
            <>
              <Field label="組み合わせ">
                <ul className="grid grid-cols-5 gap-2">
                  {GRADIENTS.map(([from, to]) => (
                    <li key={from + to}>
                      <button
                        type="button"
                        aria-label={`${from} から ${to}`}
                        onClick={() => patchBg({ gradientFrom: from, gradientTo: to })}
                        className={cx(
                          'press aspect-square w-full rounded-[12px] ring-1 ring-black/[0.08] dark:ring-white/[0.12]',
                          bg.gradientFrom === from && bg.gradientTo === to && 'ring-2 ring-accent',
                        )}
                        style={{ background: `linear-gradient(${bg.gradientAngle}deg, ${from}, ${to})` }}
                      />
                    </li>
                  ))}
                </ul>
              </Field>
              <Slider
                label="角度"
                value={bg.gradientAngle}
                min={0}
                max={360}
                step={15}
                onChange={(v) => patchBg({ gradientAngle: v })}
                format={(v) => `${v}°`}
              />
            </>
          )}

          {bg.type === 'photo' && (
            <div className="flex flex-col gap-3">
              <Button variant="secondary" block onClick={() => fileRef.current?.click()}>
                <ImagePlus size={17} aria-hidden />
                {bg.photoId ? '写真を変更' : '写真を選ぶ'}
              </Button>
              {bg.photoId && (
                <Button variant="ghost" block onClick={() => patchBg({ photoId: undefined, type: 'solid' })}>
                  <Trash2 size={16} aria-hidden />
                  写真をはずす
                </Button>
              )}
              <Slider label="ぼかし" value={bg.blur} min={0} max={30} step={1} onChange={(v) => patchBg({ blur: v })} format={(v) => `${v}px`} />
              <Slider
                label="明るさ"
                value={bg.brightness}
                min={0.3}
                max={1.3}
                step={0.05}
                onChange={(v) => patchBg({ brightness: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                label="暗くする"
                value={bg.overlay}
                min={0}
                max={0.8}
                step={0.05}
                onChange={(v) => patchBg({ overlay: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <p className="px-1 text-[12px] leading-relaxed text-faint">
                写真は端末内だけに保存されます。長辺1800pxに圧縮されます。
              </p>
            </div>
          )}

          <label className="flex min-h-[52px] items-center gap-3 rounded-[18px] bg-surface px-4">
            <span className="flex-1 text-[15px]">
              文字に影をつける
              <span className="mt-0.5 block text-[12px] text-subtle">写真の上で読みやすくなります</span>
            </span>
            <Toggle checked={bg.textShadow} onChange={(v) => patchBg({ textShadow: v })} label="文字に影をつける" />
          </label>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickPhoto(f);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {tab === 'text' && (
        <div className="flex flex-col gap-5 pb-4">
          <Field label="書体">
            <Segmented<FontFamily>
              label="書体"
              value={font.family}
              onChange={(v) => patchFont({ family: v })}
              size="sm"
              options={[
                { value: 'sans', label: 'ゴシック' },
                { value: 'serif', label: '明朝' },
                { value: 'rounded', label: '丸ゴシ' },
                { value: 'mono', label: '等幅' },
              ]}
            />
          </Field>

          <Field label="大きさ">
            <Segmented<FontSizePreset>
              label="文字の大きさ"
              value={font.size}
              onChange={(v) => patchFont({ size: v })}
              options={[
                { value: 'S', label: 'S' },
                { value: 'M', label: 'M' },
                { value: 'L', label: 'L' },
                { value: 'XL', label: 'XL' },
              ]}
            />
          </Field>

          <Slider
            label="微調整"
            value={font.scale}
            min={0.85}
            max={1.2}
            step={0.01}
            onChange={(v) => patchFont({ scale: v })}
            format={(v) => `${Math.round(v * 100)}%`}
          />

          <Field label="文字色">
            <ul className="grid grid-cols-6 gap-2">
              {TEXT_COLORS.map((c) => (
                <li key={c}>
                  <Swatch color={c} active={font.textColor === c} onClick={() => patchFont({ textColor: c })} />
                </li>
              ))}
            </ul>
            <ColorInput value={font.textColor} onChange={(v) => patchFont({ textColor: v })} label="自由な文字色" />
          </Field>

          <Field label="アクセント" hint="チェックや強調に使われます">
            <ul className="grid grid-cols-6 gap-2">
              {ACCENT_COLORS.map((c) => (
                <li key={c}>
                  <Swatch color={c} active={font.accentColor === c} onClick={() => patchFont({ accentColor: c })} />
                </li>
              ))}
            </ul>
            <ColorInput value={font.accentColor} onChange={(v) => patchFont({ accentColor: v })} label="自由なアクセント色" />
          </Field>
        </div>
      )}

      {tab === 'layout' && (
        <div className="flex flex-col gap-5 pb-4">
          <Field label="使う場所">
            <Segmented<WallpaperMode>
              label="使う場所"
              value={screen.mode}
              onChange={(v) => updateScreen(screen.id, { mode: v })}
              options={[
                { value: 'lock', label: 'ロック画面' },
                { value: 'home', label: 'ホーム画面' },
              ]}
            />
          </Field>

          <Slider
            label="上の余白"
            value={screen.safeTop}
            min={0.15}
            max={0.4}
            step={0.01}
            onChange={(v) => updateScreen(screen.id, { safeTop: v })}
            format={(v) => `${Math.round(v * 100)}%`}
          />

          {screen.mode === 'home' && (
            <Slider
              label="文字の濃さ"
              value={screen.contentOpacity}
              min={0.2}
              max={1}
              step={0.05}
              onChange={(v) => updateScreen(screen.id, { contentOpacity: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          )}

          <Field label="入りきらないとき">
            <Segmented<OverflowPolicy>
              label="入りきらないとき"
              value={screen.overflow}
              onChange={(v) => updateScreen(screen.id, { overflow: v })}
              options={[
                { value: 'all', label: 'すべて縮めて表示' },
                { value: 'important', label: '重要なものだけ' },
              ]}
            />
          </Field>

          <div className="overflow-hidden rounded-[18px] bg-surface">
            <ToggleRow
              label="日付を表示"
              checked={screen.showDate}
              onChange={(v) => updateScreen(screen.id, { showDate: v })}
            />
            <ToggleRow
              label="進捗を表示"
              checked={screen.showProgress}
              onChange={(v) => updateScreen(screen.id, { showProgress: v })}
            />
            <ToggleRow
              label="集中モード"
              description="重要なタスクだけを大きく見せます"
              checked={screen.focusMode}
              onChange={(v) => updateScreen(screen.id, { focusMode: v })}
            />
            <ToggleRow
              label="時間帯で切り替え"
              description="朝・昼・夜であいさつが変わります"
              checked={screen.timeOfDay === 'auto'}
              onChange={(v) => updateScreen(screen.id, { timeOfDay: v ? 'auto' : 'off' })}
            />
            <ToggleRow
              label="このScreen専用のタスクだけ"
              checked={screen.onlyOwnTasks}
              onChange={(v) => updateScreen(screen.id, { onlyOwnTasks: v })}
              last
            />
          </div>

          {screen.showProgress && (
            <Field label="進捗の見せ方">
              <Segmented<'fraction' | 'percent' | 'bar'>
                label="進捗の見せ方"
                value={screen.progressStyle}
                onChange={(v) => updateScreen(screen.id, { progressStyle: v })}
                options={[
                  { value: 'fraction', label: '3/5' },
                  { value: 'percent', label: '60%' },
                  { value: 'bar', label: 'バー' },
                ]}
              />
            </Field>
          )}
        </div>
      )}
    </Sheet>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  last,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <label className={cx('flex min-h-[52px] items-center gap-3 px-4', !last && 'border-b hairline')}>
      <span className="flex-1 py-2 text-[15px]">
        {label}
        {description && <span className="mt-0.5 block text-[12px] leading-snug text-subtle">{description}</span>}
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={color}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'press aspect-square w-full rounded-[12px] ring-1 ring-black/[0.08] dark:ring-white/[0.12]',
        active && 'ring-2 ring-accent',
      )}
      style={{ background: color }}
    />
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="color"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-12 cursor-pointer rounded-[10px] border-0 bg-transparent p-0"
      />
      <span className="text-[12.5px] tabular text-subtle">{value.toUpperCase()}</span>
    </div>
  );
}
