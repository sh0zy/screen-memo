import { useMemo, useState } from 'react';
import { Camera, ImageDown, ListChecks } from 'lucide-react';
import { useData } from '../store/data';
import { cx } from '../lib/id';
import { Button } from './ui';
import { ScaledCanvas } from '../wallpaper/ScaledCanvas';
import { useDeviceRatio, useWallpaperInput } from '../wallpaper/hooks';
import { TEMPLATES, applyTemplate } from '../wallpaper/templates';
import type { TemplateId } from '../types';

const STEPS = [
  {
    icon: ListChecks,
    title: '今日やることを、1画面に',
    body: 'タスク・予定・目標をまとめて書くと、そのまま壁紙の形になります。',
  },
  {
    icon: Camera,
    title: 'プレビューをスクリーンショット',
    body: 'できあがった画面を撮って、端末の壁紙に設定するだけ。ロックを解除しなくても今日の予定が見えます。',
  },
  {
    icon: ImageDown,
    title: 'データは端末の中だけ',
    body: 'アカウント登録もアップロードもありません。バックアップは設定から書き出せます。',
  },
] as const;

export function Onboarding() {
  const updateSettings = useData((s) => s.updateSettings);
  const screen = useData((s) => s.activeScreen());
  const applyTemplateToScreen = useData((s) => s.applyTemplateToScreen);
  const [step, setStep] = useState(0);
  const ratio = useDeviceRatio();
  const input = useWallpaperInput(screen);

  const finish = () => updateSettings({ onboarded: true });
  const last = step === STEPS.length;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-canvas pt-safe">
      <div className="flex justify-end px-4 pt-2">
        <button type="button" onClick={finish} className="press rounded-full px-3 py-2 text-[13.5px] text-subtle">
          スキップ
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center px-7 text-center">
        {last ? (
          <>
            <h2 className="mb-1.5 text-[22px] font-semibold tracking-[-0.02em]">好きな見た目を選ぶ</h2>
            <p className="mb-6 text-[14px] leading-relaxed text-subtle">あとから設定でいつでも変えられます。</p>
            <ul className="grid w-full grid-cols-3 gap-2.5">
              {TEMPLATES.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <TemplatePick
                    id={t.id}
                    name={t.name}
                    ratio={ratio}
                    active={screen.templateId === t.id}
                    onPick={() => applyTemplateToScreen(screen.id, t.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="mb-8 w-[124px] overflow-hidden rounded-[18px] shadow-lift ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
              {input && <ScaledCanvas input={input} ratio={ratio} chrome="lock" radius={18} />}
            </div>
            <Step index={step} />
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-[420px] px-7" style={{ paddingBottom: 'calc(24px + var(--sab))' }}>
        <div className="mb-4 flex justify-center gap-1.5">
          {[...STEPS, null].map((_, i) => (
            <span
              key={i}
              className={cx('h-[6px] rounded-full transition-all duration-200', i === step ? 'w-5 bg-accent' : 'w-[6px] bg-line')}
            />
          ))}
        </div>
        <Button variant="primary" block size="lg" onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'はじめる' : '次へ'}
        </Button>
      </div>
    </div>
  );
}

function Step({ index }: { index: number }) {
  const { icon: Icon, title, body } = STEPS[index];
  return (
    <>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-surface text-subtle">
        <Icon size={24} strokeWidth={1.7} aria-hidden />
      </div>
      <h2 className="mb-2 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{title}</h2>
      <p className="text-[14.5px] leading-relaxed text-subtle">{body}</p>
    </>
  );
}

function TemplatePick({
  id,
  name,
  ratio,
  active,
  onPick,
}: {
  id: TemplateId;
  name: string;
  ratio: number;
  active: boolean;
  onPick: () => void;
}) {
  const screen = useData((s) => s.activeScreen());
  const preview = useMemo(() => applyTemplate(screen, id), [screen, id]);
  const input = useWallpaperInput(preview);

  return (
    <button type="button" onClick={onPick} aria-pressed={active} className="press block w-full">
      <span
        className={cx(
          'block overflow-hidden rounded-[12px]',
          active ? 'ring-2 ring-accent' : 'ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
        )}
      >
        {input && <ScaledCanvas input={input} ratio={ratio} radius={12} />}
      </span>
      <span className={cx('mt-1.5 block truncate text-[11.5px]', active ? 'font-semibold text-ink' : 'text-subtle')}>
        {name}
      </span>
    </button>
  );
}
