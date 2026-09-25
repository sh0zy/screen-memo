import { GripVertical } from 'lucide-react';
import { useData } from '../store/data';
import { cx } from '../lib/id';
import { Sheet, Toggle } from '../components/ui';
import { SortableList } from '../components/SortableList';
import { ALL_SECTIONS, SECTION_LABEL, SECTION_LABEL_JA } from '../wallpaper/templates';
import type { SectionConfig, SectionKind } from '../types';
import type { SheetProps } from './types';

export function SectionsSheet({ depth, onClose }: SheetProps) {
  const screen = useData((s) => s.activeScreen());
  const updateScreen = useData((s) => s.updateScreen);

  // 未登録のセクションも一覧に出す (非表示状態で)
  const sections: SectionConfig[] = [
    ...screen.sections,
    ...ALL_SECTIONS.filter((k) => !screen.sections.some((s) => s.kind === k)).map((kind) => ({
      kind,
      visible: false,
    })),
  ];

  const commit = (next: SectionConfig[]) => updateScreen(screen.id, { sections: next });

  const toggle = (kind: SectionKind, visible: boolean) =>
    commit(sections.map((s) => (s.kind === kind ? { ...s, visible } : s)));

  const reorder = (ids: string[]) =>
    commit(ids.map((id) => sections.find((s) => s.kind === id)!).filter(Boolean));

  const items = sections.map((s) => ({ ...s, id: s.kind }));

  return (
    <Sheet depth={depth} onClose={onClose} tall title="セクション">
      <p className="mb-3 px-1 text-[13px] leading-relaxed text-subtle">
        壁紙に載せる項目と順番を決めます。ハンドルをドラッグで並べ替えできます。
      </p>

      <div className="overflow-hidden rounded-[18px] bg-surface">
        <SortableList
          items={items}
          onReorder={reorder}
          render={(item, handle, dragging) => (
            <div
              className={cx(
                'flex min-h-[56px] items-center gap-2 border-b hairline px-2 last:border-b-0',
                dragging && 'bg-elevated shadow-lift',
              )}
            >
              <button
                type="button"
                ref={handle.setActivatorNodeRef as never}
                {...(handle.attributes as object)}
                {...(handle.listeners as object)}
                aria-label={`${SECTION_LABEL_JA[item.kind]} を並べ替え`}
                className="inline-flex h-11 w-9 cursor-grab touch-none items-center justify-center text-faint active:cursor-grabbing"
              >
                <GripVertical size={17} aria-hidden />
              </button>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-[15px]', !item.visible && 'text-ink/45')}>
                  {SECTION_LABEL_JA[item.kind]}
                </span>
                <span className="mt-0.5 block text-[11.5px] uppercase tracking-[0.1em] text-faint">
                  {SECTION_LABEL[item.kind]}
                </span>
              </span>
              <span className="pr-1">
                <Toggle
                  checked={item.visible}
                  onChange={(v) => toggle(item.kind, v)}
                  label={`${SECTION_LABEL_JA[item.kind]} を表示`}
                />
              </span>
            </div>
          )}
        />
      </div>

      <p className="mt-3 px-1 pb-2 text-[12px] leading-relaxed text-faint">
        表示にしたセクションは Today タブにも編集欄として出てきます。
      </p>
    </Sheet>
  );
}
