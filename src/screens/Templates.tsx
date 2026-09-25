import { useMemo } from 'react';
import { Layers, Palette, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { cx } from '../lib/id';
import { Icon } from '../lib/icons';
import { Button, IconButton, SectionTitle } from '../components/ui';
import { ScaledCanvas } from '../wallpaper/ScaledCanvas';
import { useDeviceRatio, useWallpaperInput } from '../wallpaper/hooks';
import { TEMPLATES, applyTemplate } from '../wallpaper/templates';
import type { TemplateId } from '../types';

export default function Templates() {
  const screen = useData((s) => s.activeScreen());
  const applyTemplateToScreen = useData((s) => s.applyTemplateToScreen);
  const userTemplates = useData((s) => s.userTemplates);
  const applyUserTemplate = useData((s) => s.applyUserTemplate);
  const deleteUserTemplate = useData((s) => s.deleteUserTemplate);
  const openSheet = useUI((s) => s.openSheet);
  const ratio = useDeviceRatio();
  const input = useWallpaperInput(screen);

  return (
    <div className="mx-auto max-w-[520px] px-4">
      <header className="flex items-center gap-1 pt-2">
        <h1 className="flex-1 px-1 text-[22px] font-semibold tracking-[-0.02em]">デザイン</h1>
        <IconButton label="Screen一覧" onClick={() => openSheet({ type: 'screens' })}>
          <Layers size={20} strokeWidth={1.8} />
        </IconButton>
      </header>

      <div className="mb-5 mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" block onClick={() => openSheet({ type: 'design' })}>
          <Palette size={16} aria-hidden />
          背景・文字
        </Button>
        <Button variant="secondary" block onClick={() => openSheet({ type: 'sections' })}>
          <SlidersHorizontal size={16} aria-hidden />
          セクション
        </Button>
      </div>

      <SectionTitle>テンプレート</SectionTitle>
      <ul className="mb-6 grid grid-cols-3 gap-2.5">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <TemplateCard
              id={t.id}
              name={t.name}
              active={screen.templateId === t.id}
              ratio={ratio}
              onSelect={() => applyTemplateToScreen(screen.id, t.id)}
            />
          </li>
        ))}
      </ul>

      <SectionTitle
        right={
          <button
            type="button"
            onClick={() => openSheet({ type: 'saveTemplate' })}
            className="press inline-flex items-center gap-1 px-1 text-[12.5px] text-subtle"
          >
            <Plus size={14} aria-hidden />
            現在の見た目を保存
          </button>
        }
      >
        My Template
      </SectionTitle>

      {userTemplates.length === 0 ? (
        <p className="mb-6 rounded-[18px] bg-surface px-4 py-5 text-center text-[13px] leading-relaxed text-subtle">
          気に入った配色やレイアウトを保存すると、
          <br />
          他のScreenにもすぐ適用できます。
        </p>
      ) : (
        <ul className="mb-6 overflow-hidden rounded-[18px] bg-surface">
          {userTemplates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-b hairline px-4 py-3 last:border-b-0">
              <Icon name={t.icon} size={17} className="shrink-0 text-subtle" />
              <button
                type="button"
                onClick={() => applyUserTemplate(t.id, screen.id)}
                className="min-w-0 flex-1 truncate text-left text-[15px]"
              >
                {t.name}
              </button>
              <IconButton label={`${t.name} を削除`} size="sm" onClick={() => deleteUserTemplate(t.id)}>
                <Trash2 size={16} className="text-danger" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>現在のScreen</SectionTitle>
      <div className="mb-8 overflow-hidden rounded-[20px] bg-surface p-3">
        <div className="mx-auto w-[58%]">
          {input && <ScaledCanvas input={input} ratio={ratio} chrome="lock" radius={18} />}
        </div>
        <p className="mt-3 text-center text-[13px] text-subtle">{screen.name}</p>
      </div>
    </div>
  );
}

function TemplateCard({
  id,
  name,
  active,
  ratio,
  onSelect,
}: {
  id: TemplateId;
  name: string;
  active: boolean;
  ratio: number;
  onSelect: () => void;
}) {
  const screen = useData((s) => s.activeScreen());
  // テンプレートを当てた「見え方」だけを試算して描く
  const preview = useMemo(() => applyTemplate(screen, id), [screen, id]);
  const input = useWallpaperInput(preview);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="press block w-full text-left"
    >
      <div
        className={cx(
          'overflow-hidden rounded-[12px] shadow-hair transition-shadow',
          active ? 'ring-2 ring-accent' : 'ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
        )}
      >
        {input && <ScaledCanvas input={input} ratio={ratio} radius={12} />}
      </div>
      <div className={cx('mt-1.5 truncate px-0.5 text-[11.5px]', active ? 'font-semibold text-ink' : 'text-subtle')}>
        {name}
      </div>
    </button>
  );
}
