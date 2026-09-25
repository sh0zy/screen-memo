import { useMemo, useState } from 'react';
import { ArchiveRestore, CalendarClock, Inbox, RotateCcw, Search, Trash2, Undo2 } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { formatShort } from '../lib/date';
import { cx } from '../lib/id';
import { Button, Chip, Empty, IconButton, Sheet, TextInput } from '../components/ui';
import { QuickAddInput } from '../components/QuickAddInput';
import { TaskItem } from '../components/TaskItem';
import { ScaledCanvas } from '../wallpaper/ScaledCanvas';
import { useDeviceRatio } from '../wallpaper/hooks';
import { isLive } from '../lib/logic';
import type { SheetProps } from './types';

/* ================= 受信箱 ================= */

export function InboxSheet({ depth, onClose }: SheetProps) {
  const tasks = useData((s) => s.tasks);
  const today = useData((s) => s.today);
  const updateTask = useData((s) => s.updateTask);
  const list = tasks.filter((t) => isLive(t) && t.inbox && !t.completed);

  return (
    <Sheet
      depth={depth}
      onClose={onClose}
      tall
      title="受信箱"
      footer={<QuickAddInput inbox placeholder="思いついたことをメモ" compact />}
    >
      <p className="mb-3 px-1 text-[13px] leading-relaxed text-subtle">
        日付を決めずに書き留めた項目です。右スワイプで今日のタスクにできます。
      </p>
      {list.length === 0 ? (
        <Empty icon={<Inbox size={22} aria-hidden />} title="受信箱は空です" body="思いついたことを下から追加できます。" />
      ) : (
        <ul className="flex flex-col pb-2">
          {list.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <TaskItem task={t} showDue={false} />
              </span>
              <IconButton
                label={`${t.title} を今日にする`}
                size="sm"
                onClick={() => updateTask(t.id, { inbox: false, dueDate: today })}
              >
                <CalendarClock size={17} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ================= ゴミ箱 ================= */

export function TrashSheet({ depth, onClose }: SheetProps) {
  const tasks = useData((s) => s.tasks);
  const notes = useData((s) => s.notes);
  const restoreTask = useData((s) => s.restoreTask);
  const purgeTask = useData((s) => s.purgeTask);
  const restoreNote = useData((s) => s.restoreNote);
  const purgeNote = useData((s) => s.purgeNote);

  const items = useMemo(() => {
    const t = tasks.filter((x) => x.deletedAt).map((x) => ({ kind: 'task' as const, id: x.id, title: x.title, at: x.deletedAt! }));
    const n = notes
      .filter((x) => x.deletedAt)
      .map((x) => ({ kind: 'note' as const, id: x.id, title: x.title || x.content.slice(0, 40) || '空のメモ', at: x.deletedAt! }));
    return [...t, ...n].sort((a, b) => b.at - a.at);
  }, [tasks, notes]);

  const purgeAll = () => {
    if (!confirm('ゴミ箱を空にします。元に戻せません。')) return;
    items.forEach((i) => (i.kind === 'task' ? purgeTask(i.id) : purgeNote(i.id)));
  };

  return (
    <Sheet
      depth={depth}
      onClose={onClose}
      tall
      title="ゴミ箱"
      footer={
        items.length > 0 && (
          <Button variant="danger" block onClick={purgeAll}>
            <Trash2 size={17} aria-hidden />
            ゴミ箱を空にする
          </Button>
        )
      }
    >
      <p className="mb-3 px-1 text-[13px] text-subtle">30日を過ぎたものは自動で削除されます。</p>
      {items.length === 0 ? (
        <Empty icon={<Trash2 size={22} aria-hidden />} title="ゴミ箱は空です" />
      ) : (
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {items.map((i) => (
            <li key={i.kind + i.id} className="flex items-center gap-2 border-b hairline px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{i.title}</span>
                <span className="mt-0.5 block text-[11.5px] text-faint">
                  {i.kind === 'task' ? 'タスク' : 'メモ'} · {formatShort(new Date(i.at).toISOString().slice(0, 10))}
                </span>
              </span>
              <IconButton
                label={`${i.title} を元に戻す`}
                size="sm"
                onClick={() => (i.kind === 'task' ? restoreTask(i.id) : restoreNote(i.id))}
              >
                <Undo2 size={16} />
              </IconButton>
              <IconButton
                label={`${i.title} を完全に削除`}
                size="sm"
                onClick={() => (i.kind === 'task' ? purgeTask(i.id) : purgeNote(i.id))}
              >
                <Trash2 size={16} className="text-danger" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ================= アーカイブ ================= */

export function ArchiveSheet({ depth, onClose }: SheetProps) {
  const tasks = useData((s) => s.tasks);
  const notes = useData((s) => s.notes);
  const archiveTask = useData((s) => s.archiveTask);
  const archiveNote = useData((s) => s.archiveNote);

  const items = useMemo(() => {
    const t = tasks.filter((x) => x.archived && !x.deletedAt).map((x) => ({ kind: 'task' as const, id: x.id, title: x.title, at: x.updatedAt }));
    const n = notes
      .filter((x) => x.archived && !x.deletedAt)
      .map((x) => ({ kind: 'note' as const, id: x.id, title: x.title || x.content.slice(0, 40) || '空のメモ', at: x.updatedAt }));
    return [...t, ...n].sort((a, b) => b.at - a.at);
  }, [tasks, notes]);

  return (
    <Sheet depth={depth} onClose={onClose} tall title="アーカイブ">
      {items.length === 0 ? (
        <Empty icon={<ArchiveRestore size={22} aria-hidden />} title="アーカイブはありません" body="完了したものを残しておきたいときに使います。" />
      ) : (
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {items.map((i) => (
            <li key={i.kind + i.id} className="flex items-center gap-2 border-b hairline px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 truncate text-[15px]">{i.title}</span>
              <IconButton
                label={`${i.title} を戻す`}
                size="sm"
                onClick={() => (i.kind === 'task' ? archiveTask(i.id, false) : archiveNote(i.id, false))}
              >
                <Undo2 size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ================= 検索 ================= */

export function SearchSheet({ depth, onClose }: SheetProps) {
  const tasks = useData((s) => s.tasks);
  const notes = useData((s) => s.notes);
  const openSheet = useUI((s) => s.openSheet);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | 'task' | 'note'>('all');

  const query = q.trim().toLowerCase();
  const hitTasks = useMemo(
    () =>
      query && scope !== 'note'
        ? tasks
            .filter(isLive)
            .filter(
              (t) =>
                t.title.toLowerCase().includes(query) ||
                (t.note ?? '').toLowerCase().includes(query) ||
                t.tags.some((tag) => tag.toLowerCase().includes(query)),
            )
            .slice(0, 50)
        : [],
    [tasks, query, scope],
  );
  const hitNotes = useMemo(
    () =>
      query && scope !== 'task'
        ? notes
            .filter(isLive)
            .filter(
              (n) =>
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query) ||
                n.items.some((i) => i.text.toLowerCase().includes(query)) ||
                n.tags.some((tag) => tag.toLowerCase().includes(query)),
            )
            .slice(0, 50)
        : [],
    [notes, query, scope],
  );

  const empty = query && hitTasks.length === 0 && hitNotes.length === 0;

  return (
    <Sheet depth={depth} onClose={onClose} tall title="検索">
      <div className="sticky top-0 z-10 -mx-5 bg-elevated px-5 pb-3">
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="タスク・メモを検索"
          autoFocus
          type="search"
        />
        <div className="mt-2 flex gap-2">
          <Chip active={scope === 'all'} onClick={() => setScope('all')}>
            すべて
          </Chip>
          <Chip active={scope === 'task'} onClick={() => setScope('task')}>
            タスク
          </Chip>
          <Chip active={scope === 'note'} onClick={() => setScope('note')}>
            メモ
          </Chip>
        </div>
      </div>

      {!query && <Empty icon={<Search size={22} aria-hidden />} title="キーワードを入力" body="タイトル・本文・タグから探します。" />}
      {empty && <Empty icon={<Search size={22} aria-hidden />} title="見つかりませんでした" body={`「${q}」に一致する項目はありません。`} />}

      {hitTasks.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-1 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">タスク</h3>
          <ul className="flex flex-col">
            {hitTasks.map((t) => (
              <li key={t.id}>
                <TaskItem task={t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {hitNotes.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-1 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">メモ</h3>
          <ul className="overflow-hidden rounded-[18px] bg-surface">
            {hitNotes.map((n) => (
              <li key={n.id} className="border-b hairline last:border-b-0">
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'note', id: n.id })}
                  className="press w-full px-4 py-3 text-left active:bg-line/40"
                >
                  <span className="block truncate text-[15px] font-medium">{n.title || '無題のメモ'}</span>
                  <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-subtle">
                    {n.kind === 'checklist' ? n.items.map((i) => i.text).join(' · ') : n.content}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}

/* ================= 履歴 ================= */

export function HistorySheet({ depth, onClose }: SheetProps) {
  const snapshots = useData((s) => s.snapshots);
  const restore = useData((s) => s.restoreSnapshotToToday);
  const deleteSnapshot = useData((s) => s.deleteSnapshot);
  const ratio = useDeviceRatio();
  const tasks = useData((s) => s.tasks);
  const notes = useData((s) => s.notes);
  const habits = useData((s) => s.habits);
  const schedule = useData((s) => s.schedule);
  const countdowns = useData((s) => s.countdowns);
  const completedDisplay = useData((s) => s.settings.completedDisplay);

  return (
    <Sheet depth={depth} onClose={onClose} tall title="履歴">
      <p className="mb-3 px-1 text-[13px] leading-relaxed text-subtle">
        過去のScreenを振り返ったり、今日にコピーできます。
      </p>

      {snapshots.length === 0 ? (
        <Empty icon={<RotateCcw size={22} aria-hidden />} title="履歴はまだありません" body="日付が変わると自動で保存されます。" />
      ) : (
        <ul className="grid grid-cols-3 gap-3 pb-2">
          {snapshots.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  restore(s.id);
                  onClose();
                }}
                className="press block w-full text-left"
              >
                <span className="block overflow-hidden rounded-[12px] ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
                  <ScaledCanvas
                    input={{
                      screen: s.screen,
                      tasks,
                      notes,
                      habits,
                      schedule,
                      countdowns,
                      today: s.date,
                      completedDisplay,
                    }}
                    ratio={ratio}
                    radius={12}
                  />
                </span>
                <span className="mt-1.5 block truncate px-0.5 text-[11.5px] text-subtle">{formatShort(s.date)}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteSnapshot(s.id)}
                className={cx('press mt-0.5 w-full px-0.5 text-left text-[11px] text-faint')}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
