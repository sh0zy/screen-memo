import { useState } from 'react';
import { Check, Copy, GripVertical, Plus, Star, Trash2 } from 'lucide-react';
import { useData } from '../store/data';
import { cx } from '../lib/id';
import { Button, IconButton, Sheet, TextInput } from '../components/ui';
import { SortableList } from '../components/SortableList';
import { ScaledCanvas } from '../wallpaper/ScaledCanvas';
import { useDeviceRatio, useWallpaperInput } from '../wallpaper/hooks';
import type { ScreenDoc } from '../types';
import type { SheetProps } from './types';

export function ScreensSheet({ depth, onClose }: SheetProps) {
  const screens = useData((s) => s.screens);
  const activeId = useData((s) => s.settings.activeScreenId);
  const addScreen = useData((s) => s.addScreen);
  const reorderScreens = useData((s) => s.reorderScreens);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const create = () => {
    const n = name.trim();
    if (!n) return;
    addScreen(n);
    setName('');
    setAdding(false);
    onClose();
  };

  return (
    <Sheet
      depth={depth}
      onClose={onClose}
      tall
      title="Screen"
      footer={
        adding ? (
          <div className="flex gap-2">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
              placeholder="例: 勉強、仕事、旅行"
              autoFocus
            />
            <Button variant="primary" onClick={create} disabled={!name.trim()}>
              <Check size={18} aria-hidden />
            </Button>
          </div>
        ) : (
          <Button variant="secondary" block size="lg" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden />
            Screen を追加
          </Button>
        )
      }
    >
      <p className="mb-3 px-1 text-[13px] leading-relaxed text-subtle">
        目的ごとに見た目と内容を分けられます。タップで切り替え。
      </p>

      <SortableList
        items={screens}
        onReorder={reorderScreens}
        className="flex flex-col gap-2 pb-2"
        render={(sc, handle, dragging) => (
          <ScreenRow screen={sc} active={sc.id === activeId} handle={handle} dragging={dragging} onPicked={onClose} />
        )}
      />
    </Sheet>
  );
}

function ScreenRow({
  screen,
  active,
  handle,
  dragging,
  onPicked,
}: {
  screen: ScreenDoc;
  active: boolean;
  handle: { attributes?: Record<string, unknown>; listeners?: Record<string, unknown>; setActivatorNodeRef?: (el: HTMLElement | null) => void };
  dragging: boolean;
  onPicked: () => void;
}) {
  const setActiveScreen = useData((s) => s.setActiveScreen);
  const updateScreen = useData((s) => s.updateScreen);
  const duplicateScreen = useData((s) => s.duplicateScreen);
  const deleteScreen = useData((s) => s.deleteScreen);
  const ratio = useDeviceRatio();
  const input = useWallpaperInput(screen);

  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-[18px] bg-surface p-2.5',
        active && 'ring-2 ring-accent',
        dragging && 'shadow-lift',
      )}
    >
      <button
        type="button"
        ref={handle.setActivatorNodeRef as never}
        {...(handle.attributes as object)}
        {...(handle.listeners as object)}
        aria-label={`${screen.name} を並べ替え`}
        className="inline-flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-faint active:cursor-grabbing"
      >
        <GripVertical size={17} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveScreen(screen.id);
          onPicked();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="w-[44px] shrink-0 overflow-hidden rounded-[9px] ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
          {input && <ScaledCanvas input={input} ratio={ratio} radius={9} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{screen.name}</span>
          <span className="mt-0.5 block text-[11.5px] text-faint">
            {screen.sections.filter((s) => s.visible).length} セクション
            {active && ' · 表示中'}
          </span>
        </span>
      </button>

      <IconButton
        label={screen.favorite ? 'お気に入りを外す' : 'お気に入り'}
        size="sm"
        onClick={() => updateScreen(screen.id, { favorite: !screen.favorite })}
      >
        <Star size={16} className={cx(screen.favorite && 'fill-current text-accent')} />
      </IconButton>
      <IconButton label={`${screen.name} を複製`} size="sm" onClick={() => duplicateScreen(screen.id)}>
        <Copy size={16} />
      </IconButton>
      <IconButton label={`${screen.name} を削除`} size="sm" onClick={() => deleteScreen(screen.id)}>
        <Trash2 size={16} className="text-danger" />
      </IconButton>
    </div>
  );
}
