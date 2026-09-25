import { memo, useState, type CSSProperties } from 'react';
import { ChevronDown, EyeOff, GripVertical, Lock, Pencil, Repeat, Trash2 } from 'lucide-react';
import type { Task } from '../types';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { relativeLabel } from '../lib/date';
import { cx } from '../lib/id';
import { Icon } from '../lib/icons';
import { Checkbox } from './Checkbox';
import { useRowGestures } from './useGestures';

export interface DragHandleProps {
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  showDue = true,
  handle,
  dragging,
}: {
  task: Task;
  showDue?: boolean;
  handle?: DragHandleProps;
  dragging?: boolean;
}) {
  const toggleTask = useData((s) => s.toggleTask);
  const deleteTask = useData((s) => s.deleteTask);
  const updateTask = useData((s) => s.updateTask);
  const today = useData((s) => s.today);
  const completedDisplay = useData((s) => s.settings.completedDisplay);
  const category = useData((s) => (task.categoryId ? s.categories.find((c) => c.id === task.categoryId) : undefined));
  const openSheet = useUI((s) => s.openSheet);
  const [expanded, setExpanded] = useState(false);

  const g = useRowGestures({
    onSwipeRight: () => toggleTask(task.id),
    onLongPress: () => openSheet({ type: 'taskActions', id: task.id }),
    onTap: () => openSheet({ type: 'task', id: task.id }),
  });

  const overdue = !task.completed && task.dueDate && task.dueDate < today;
  const doneSubs = task.subtasks.filter((s) => s.completed).length;
  const meta: React.ReactNode[] = [];
  if (showDue && task.dueDate && task.dueDate !== today)
    meta.push(
      <span key="due" className={cx(overdue && 'text-danger')}>
        {overdue ? '期限切れ · ' : ''}
        {relativeLabel(task.dueDate, today)}
      </span>,
    );
  if (category)
    meta.push(
      <span key="cat" className="inline-flex items-center gap-1">
        <Icon name={category.icon} size={12} />
        {category.name}
      </span>,
    );
  if (task.repeat.type !== 'none') meta.push(<Repeat key="rep" size={12} aria-label="繰り返し" />);
  task.tags.forEach((t) => meta.push(<span key={'tag' + t}>#{t}</span>));
  if (task.hideFromWallpaper) meta.push(<EyeOff key="hide" size={12} aria-label="壁紙に表示しない" />);
  if (task.sensitive) meta.push(<Lock key="sens" size={12} aria-label="Previewで伏せ字" />);

  const doneStyle =
    task.completed && completedDisplay !== 'hide'
      ? cx('text-ink/40', completedDisplay === 'strike' && 'line-through decoration-ink/30')
      : '';

  const rowStyle: CSSProperties = {
    transform: `translateX(${g.dx}px)`,
    transition: g.dragging ? 'none' : 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
    ...g.bind.style,
  };

  return (
    <div className={cx('relative overflow-hidden rounded-[16px]', dragging && 'z-10 shadow-lift')}>
      {/* swipe backgrounds */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between" aria-hidden>
        <div
          className="flex h-full items-center bg-accent pl-5 text-on-accent"
          style={{ width: Math.max(0, g.dx) + 16, opacity: g.dx > 0 ? 1 : 0 }}
        >
          <span className="text-[13px] font-medium">{task.completed ? '戻す' : '完了'}</span>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: 136, opacity: g.dx < 0 ? 1 : 0 }}>
        <button
          type="button"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-surface text-[11px] text-ink/80"
          onClick={() => {
            g.close();
            openSheet({ type: 'task', id: task.id });
          }}
          tabIndex={g.open ? 0 : -1}
        >
          <Pencil size={17} />
          編集
        </button>
        <button
          type="button"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-danger text-[11px] text-white"
          onClick={() => {
            g.close();
            deleteTask(task.id);
          }}
          tabIndex={g.open ? 0 : -1}
        >
          <Trash2 size={17} />
          削除
        </button>
      </div>

      <div
        className="relative flex select-none items-start gap-3 bg-canvas py-3 pl-4 pr-2 [-webkit-touch-callout:none]"
        {...g.bind}
        style={rowStyle}
      >
        <div className="pt-[1px]">
          <Checkbox checked={task.completed} onChange={() => toggleTask(task.id)} label={`${task.title} を${task.completed ? '未完了に戻す' : '完了にする'}`} />
        </div>
        <div className="min-w-0 flex-1 cursor-pointer">
          <div className="flex items-start gap-2">
            <button
              type="button"
              className={cx('min-w-0 text-left text-[15.5px] leading-[1.4] tracking-[-0.005em]', doneStyle)}
              onClick={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openSheet({ type: 'task', id: task.id });
                }
              }}
              aria-label={`${task.title} を編集`}
            >
              <span className="break-words">{task.title}</span>
              {task.priority === 'high' && !task.completed && (
                <span aria-label="優先度 High" className="ml-2 inline-block h-[6px] w-[6px] -translate-y-[2px] rounded-full bg-danger align-middle" />
              )}
            </button>
          </div>
          {(meta.length > 0 || task.subtasks.length > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-subtle">
              {task.subtasks.length > 0 && (
                <button
                  type="button"
                  className="-my-2 inline-flex items-center gap-0.5 py-2 tabular"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
                  aria-expanded={expanded}
                  aria-label="サブタスクを表示"
                >
                  {doneSubs}/{task.subtasks.length}
                  <ChevronDown size={13} className={cx('transition-transform', expanded && 'rotate-180')} />
                </button>
              )}
              {meta}
            </div>
          )}
          {expanded && task.subtasks.length > 0 && (
            <div className="mt-2 space-y-0.5" onPointerDown={(e) => e.stopPropagation()}>
              {task.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2.5 py-1">
                  <Checkbox
                    size={17}
                    checked={st.completed}
                    label={st.title}
                    onChange={() =>
                      updateTask(task.id, {
                        subtasks: task.subtasks.map((x) => (x.id === st.id ? { ...x, completed: !x.completed } : x)),
                      })
                    }
                  />
                  <span className={cx('text-[14px]', st.completed && 'text-ink/40 line-through')}>{st.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {handle && (
          <button
            type="button"
            ref={handle.setActivatorNodeRef as never}
            {...(handle.attributes as object)}
            {...(handle.listeners as object)}
            data-no-gesture
            className="-my-1 flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-faint active:cursor-grabbing"
            aria-label={`${task.title} を並び替え`}
          >
            <GripVertical size={16} />
          </button>
        )}
      </div>
    </div>
  );
});
