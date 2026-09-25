import { useMemo, useState } from 'react';
import { Archive, CheckSquare, FileText, Pin, Search, Star, StickyNote, Trash2 } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { useRowGestures } from '../components/useGestures';
import { cx } from '../lib/id';
import { isLive } from '../lib/logic';
import { Chip, Empty, IconButton } from '../components/ui';
import type { Note } from '../types';

type Filter = 'all' | 'favorite' | 'checklist';

export default function Notes() {
  const notes = useData((s) => s.notes);
  const openSheet = useUI((s) => s.openSheet);
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const live = notes.filter(isLive).filter((n) => {
      if (filter === 'favorite') return n.favorite;
      if (filter === 'checklist') return n.kind === 'checklist';
      return true;
    });
    return live.sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
    );
  }, [notes, filter]);

  return (
    <div className="mx-auto max-w-[520px] px-4">
      <header className="flex items-center gap-1 pt-2">
        <h1 className="flex-1 px-1 text-[22px] font-semibold tracking-[-0.02em]">メモ</h1>
        <IconButton label="検索" onClick={() => openSheet({ type: 'search' })}>
          <Search size={20} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="アーカイブ" onClick={() => openSheet({ type: 'archive' })}>
          <Archive size={20} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="ゴミ箱" onClick={() => openSheet({ type: 'trash' })}>
          <Trash2 size={20} strokeWidth={1.8} />
        </IconButton>
      </header>

      <div className="mb-3 mt-2 flex gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          すべて
        </Chip>
        <Chip active={filter === 'favorite'} onClick={() => setFilter('favorite')}>
          <Star size={13} />
          お気に入り
        </Chip>
        <Chip active={filter === 'checklist'} onClick={() => setFilter('checklist')}>
          <CheckSquare size={13} />
          チェックリスト
        </Chip>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openSheet({ type: 'note', kind: 'text' })}
          className="press flex items-center justify-center gap-2 rounded-[16px] bg-surface py-3.5 text-[14px] font-medium active:bg-line/50"
        >
          <FileText size={16} aria-hidden />
          テキスト
        </button>
        <button
          type="button"
          onClick={() => openSheet({ type: 'note', kind: 'checklist' })}
          className="press flex items-center justify-center gap-2 rounded-[16px] bg-surface py-3.5 text-[14px] font-medium active:bg-line/50"
        >
          <CheckSquare size={16} aria-hidden />
          チェックリスト
        </button>
      </div>

      {list.length === 0 ? (
        <Empty
          icon={<StickyNote size={22} aria-hidden />}
          title="メモはありません"
          body="上のボタンから新しいメモを作成できます。"
        />
      ) : (
        <ul className="flex flex-col gap-2 pb-6">
          {list.map((n) => (
            <li key={n.id}>
              <NoteCard note={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const openSheet = useUI((s) => s.openSheet);
  const updateNote = useData((s) => s.updateNote);
  const archiveNote = useData((s) => s.archiveNote);
  const deleteNote = useData((s) => s.deleteNote);

  const { bind, dx, dragging, close } = useRowGestures({
    onTap: () => openSheet({ type: 'note', id: note.id }),
    onLongPress: () => openSheet({ type: 'noteActions', id: note.id }),
    onSwipeRight: () => updateNote(note.id, { pinned: !note.pinned }),
  });

  const done = note.items.filter((i) => i.checked).length;
  const preview =
    note.kind === 'checklist'
      ? note.items.slice(0, 4).map((i) => `${i.checked ? '✓' : '·'} ${i.text}`).join('\n')
      : note.content;

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-surface">
      <div className="absolute inset-y-0 right-0 flex" aria-hidden={dx === 0}>
        <button
          type="button"
          data-no-gesture
          onClick={() => {
            close();
            archiveNote(note.id);
          }}
          className="flex w-[68px] flex-col items-center justify-center gap-1 bg-line/70 text-[11px] text-subtle"
        >
          <Archive size={17} aria-hidden />
          アーカイブ
        </button>
        <button
          type="button"
          data-no-gesture
          onClick={() => {
            close();
            deleteNote(note.id);
          }}
          className="flex w-[68px] flex-col items-center justify-center gap-1 bg-danger/10 text-[11px] text-danger"
        >
          <Trash2 size={17} aria-hidden />
          削除
        </button>
      </div>

      <article
        {...bind}
        style={{
          ...bind.style,
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
        className="relative cursor-pointer bg-surface px-4 py-3.5 text-left active:bg-line/40"
      >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {note.title && (
            <h2 className="mb-0.5 truncate text-[15px] font-semibold tracking-[-0.01em]">{note.title}</h2>
          )}
          {preview.trim() ? (
            <p className={cx('whitespace-pre-line text-[13.5px] leading-snug text-subtle', 'line-clamp-4')}>
              {preview}
            </p>
          ) : (
            <p className="text-[13.5px] text-faint">空のメモ</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 text-faint">
          {note.pinned && <Pin size={14} aria-label="ピン留め" />}
          {note.favorite && <Star size={14} aria-label="お気に入り" />}
        </div>
      </div>

      {(note.kind === 'checklist' || note.tags.length > 0 || note.showOnScreen) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-faint">
          {note.kind === 'checklist' && note.items.length > 0 && (
            <span className="tabular">
              {done}/{note.items.length}
            </span>
          )}
          {note.showOnScreen && <span>Todayに表示</span>}
          {note.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}
      </article>
    </div>
  );
}
