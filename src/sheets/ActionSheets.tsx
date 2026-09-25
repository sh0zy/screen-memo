import {
  Archive,
  ArrowUpRight,
  CalendarPlus,
  CheckSquare,
  Copy,
  Clock,
  EyeOff,
  FileText,
  Flag,
  Inbox,
  ListPlus,
  Lock,
  Pencil,
  Pin,
  Repeat,
  Star,
  Target,
  Trash2,
} from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { addDays } from '../lib/date';
import { cx } from '../lib/id';
import { Sheet } from '../components/ui';
import { QuickAddInput } from '../components/QuickAddInput';
import type { ID } from '../types';
import type { SheetProps } from './types';

/* ================= 何を追加する? ================= */

export function AddSheet({ depth, onClose }: SheetProps) {
  const openSheet = useUI((s) => s.openSheet);
  const replaceSheet = useUI((s) => s.replaceSheet);
  const today = useData((s) => s.today);

  const go = (fn: () => void) => () => fn();

  return (
    <Sheet depth={depth} onClose={onClose} title="追加">
      <ul className="grid grid-cols-2 gap-2 pb-3 pt-1">
        <Tile icon={<ListPlus size={20} />} label="タスク" onClick={go(() => replaceSheet({ type: 'task', defaults: { dueDate: today } }))} />
        <Tile icon={<FileText size={20} />} label="メモ" onClick={go(() => replaceSheet({ type: 'note', kind: 'text' }))} />
        <Tile icon={<CheckSquare size={20} />} label="チェックリスト" onClick={go(() => replaceSheet({ type: 'note', kind: 'checklist' }))} />
        <Tile icon={<CalendarPlus size={20} />} label="予定" onClick={go(() => replaceSheet({ type: 'schedule', date: today }))} />
        <Tile icon={<Repeat size={20} />} label="習慣" onClick={go(() => replaceSheet({ type: 'habit' }))} />
        <Tile icon={<Clock size={20} />} label="カウントダウン" onClick={go(() => replaceSheet({ type: 'countdown' }))} />
        <Tile icon={<Target size={20} />} label="今日の目標" onClick={go(() => replaceSheet({ type: 'goals' }))} />
        <Tile
          icon={<Inbox size={20} />}
          label="受信箱へメモ"
          onClick={() => {
            onClose();
            openSheet({ type: 'quick', target: 'inbox' });
          }}
        />
      </ul>
    </Sheet>
  );
}

function Tile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="press flex h-[88px] w-full flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-[13px] font-medium active:bg-line/50"
      >
        <span className="text-subtle">{icon}</span>
        {label}
      </button>
    </li>
  );
}

/* ================= すばやく1行追加 ================= */

export function QuickSheet({ target, depth, onClose }: SheetProps & { target: 'task' | 'inbox' }) {
  const today = useData((s) => s.today);
  return (
    <Sheet depth={depth} onClose={onClose} title={target === 'inbox' ? '受信箱へ' : 'タスクを追加'}>
      <div className="pb-2 pt-1">
        <QuickAddInput
          autoFocus
          inbox={target === 'inbox'}
          defaultDue={target === 'inbox' ? undefined : today}
          placeholder={target === 'inbox' ? '思いついたことを書く' : 'タスクを追加'}
        />
        <p className="mt-3 px-1 text-[12px] leading-relaxed text-faint">
          「明日 レポート提出 !」のように、日付・時刻・「!」（重要）・「#タグ」をまとめて書けます。
        </p>
      </div>
    </Sheet>
  );
}

/* ================= タスクの長押しメニュー ================= */

export function TaskActionsSheet({ id, depth, onClose }: SheetProps & { id: ID }) {
  const task = useData((s) => s.tasks.find((t) => t.id === id));
  const today = useData((s) => s.today);
  const updateTask = useData((s) => s.updateTask);
  const duplicateTask = useData((s) => s.duplicateTask);
  const archiveTask = useData((s) => s.archiveTask);
  const deleteTask = useData((s) => s.deleteTask);
  const taskToNote = useData((s) => s.taskToNote);
  const replaceSheet = useUI((s) => s.replaceSheet);

  if (!task) return null;
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Sheet depth={depth} onClose={onClose} title={task.title} label="タスクの操作">
      <ul className="overflow-hidden rounded-[18px] bg-surface">
        <Action icon={<Pencil size={18} />} label="編集" onClick={() => replaceSheet({ type: 'task', id })} />
        <Action
          icon={<Flag size={18} />}
          label={task.priority === 'high' ? '重要をはずす' : '重要にする'}
          onClick={run(() => updateTask(id, { priority: task.priority === 'high' ? 'medium' : 'high' }))}
        />
        <Action
          icon={<CalendarPlus size={18} />}
          label="明日にする"
          onClick={run(() => updateTask(id, { dueDate: addDays(today, 1), inbox: false }))}
        />
        <Action
          icon={<Inbox size={18} />}
          label={task.inbox ? '受信箱から出す' : '受信箱へ入れる'}
          onClick={run(() => updateTask(id, { inbox: !task.inbox, dueDate: task.inbox ? today : undefined }))}
        />
        <Action
          icon={<EyeOff size={18} />}
          label={task.hideFromWallpaper ? '壁紙に表示する' : '壁紙に表示しない'}
          onClick={run(() => updateTask(id, { hideFromWallpaper: !task.hideFromWallpaper }))}
        />
        <Action
          icon={<Lock size={18} />}
          label={task.sensitive ? '伏せ字をやめる' : 'プレビューで伏せ字'}
          onClick={run(() => updateTask(id, { sensitive: !task.sensitive }))}
        />
        <Action icon={<Copy size={18} />} label="複製" onClick={run(() => duplicateTask(id))} />
        <Action icon={<ArrowUpRight size={18} />} label="メモに変換" onClick={run(() => taskToNote(id))} />
        <Action icon={<Archive size={18} />} label="アーカイブ" onClick={run(() => archiveTask(id))} />
        <Action icon={<Trash2 size={18} />} label="削除" danger onClick={run(() => deleteTask(id))} last />
      </ul>
    </Sheet>
  );
}

/* ================= メモの長押しメニュー ================= */

export function NoteActionsSheet({ id, depth, onClose }: SheetProps & { id: ID }) {
  const note = useData((s) => s.notes.find((n) => n.id === id));
  const updateNote = useData((s) => s.updateNote);
  const duplicateNote = useData((s) => s.duplicateNote);
  const archiveNote = useData((s) => s.archiveNote);
  const deleteNote = useData((s) => s.deleteNote);
  const noteToTask = useData((s) => s.noteToTask);
  const replaceSheet = useUI((s) => s.replaceSheet);

  if (!note) return null;
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Sheet depth={depth} onClose={onClose} title={note.title || '無題のメモ'} label="メモの操作">
      <ul className="overflow-hidden rounded-[18px] bg-surface">
        <Action icon={<Pencil size={18} />} label="編集" onClick={() => replaceSheet({ type: 'note', id })} />
        <Action
          icon={<Pin size={18} />}
          label={note.pinned ? 'ピン留めを外す' : 'ピン留め'}
          onClick={run(() => updateNote(id, { pinned: !note.pinned }))}
        />
        <Action
          icon={<Star size={18} />}
          label={note.favorite ? 'お気に入りを外す' : 'お気に入り'}
          onClick={run(() => updateNote(id, { favorite: !note.favorite }))}
        />
        <Action
          icon={<Target size={18} />}
          label={note.showOnScreen ? 'Today から外す' : 'Today に表示'}
          onClick={run(() => updateNote(id, { showOnScreen: !note.showOnScreen }))}
        />
        <Action icon={<Copy size={18} />} label="複製" onClick={run(() => duplicateNote(id))} />
        <Action icon={<ArrowUpRight size={18} />} label="タスクに変換" onClick={run(() => noteToTask(id))} />
        <Action icon={<Archive size={18} />} label="アーカイブ" onClick={run(() => archiveNote(id))} />
        <Action icon={<Trash2 size={18} />} label="削除" danger onClick={run(() => deleteNote(id))} last />
      </ul>
    </Sheet>
  );
}

function Action({
  icon,
  label,
  onClick,
  danger,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'press flex min-h-[52px] w-full items-center gap-3 px-4 text-left active:bg-line/50',
          !last && 'border-b hairline',
        )}
      >
        <span className={cx('shrink-0', danger ? 'text-danger' : 'text-subtle')}>{icon}</span>
        <span className={cx('flex-1 text-[15px]', danger && 'text-danger')}>{label}</span>
      </button>
    </li>
  );
}
