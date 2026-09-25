import { useMemo, useState } from 'react';
import { Archive, Inbox, ListChecks, Search, Trash2 } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { cx } from '../lib/id';
import { Icon } from '../lib/icons';
import { bucketOf, byOrder, isLive } from '../lib/logic';
import { Chip, Empty, IconButton, SectionTitle } from '../components/ui';
import { QuickAddInput } from '../components/QuickAddInput';
import { TaskItem } from '../components/TaskItem';
import type { ID, Task, TaskBucket } from '../types';

const BUCKET_LABEL: Record<TaskBucket, string> = {
  overdue: '期限切れ',
  today: '今日',
  tomorrow: '明日',
  upcoming: 'これから',
  someday: 'いつか',
  completed: '完了',
};

const ORDER: TaskBucket[] = ['overdue', 'today', 'tomorrow', 'upcoming', 'someday', 'completed'];

export default function Tasks() {
  const tasks = useData((s) => s.tasks);
  const today = useData((s) => s.today);
  const categories = useData((s) => s.categories);
  const openSheet = useUI((s) => s.openSheet);
  const [category, setCategory] = useState<ID | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const inboxCount = tasks.filter((t) => isLive(t) && t.inbox && !t.completed).length;

  const groups = useMemo(() => {
    const live = tasks.filter(
      (t) => isLive(t) && !t.inbox && (category === 'all' || t.categoryId === category),
    );
    const map = new Map<TaskBucket, Task[]>();
    for (const t of live) {
      const b = bucketOf(t, today);
      if (b === 'completed' && !showCompleted) continue;
      const arr = map.get(b);
      if (arr) arr.push(t);
      else map.set(b, [t]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || byOrder(a, b));
    }
    return ORDER.filter((b) => map.has(b)).map((b) => [b, map.get(b)!] as const);
  }, [tasks, today, category, showCompleted]);

  const total = groups.reduce((n, [, arr]) => n + arr.length, 0);

  return (
    <div className="mx-auto max-w-[520px] px-4">
      <header className="flex items-center gap-1 pt-2">
        <h1 className="flex-1 px-1 text-[22px] font-semibold tracking-[-0.02em]">タスク</h1>
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

      <button
        type="button"
        onClick={() => openSheet({ type: 'inbox' })}
        className="press mb-3 mt-2 flex w-full items-center gap-3 rounded-[16px] bg-surface px-4 py-3 text-left active:bg-line/40"
      >
        <Inbox size={18} className="shrink-0 text-subtle" aria-hidden />
        <span className="flex-1 text-[15px]">受信箱</span>
        {inboxCount > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[12px] font-semibold tabular text-on-accent">
            {inboxCount}
          </span>
        )}
      </button>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          すべて
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
            <Icon name={c.icon} size={13} />
            {c.name}
          </Chip>
        ))}
        <Chip onClick={() => openSheet({ type: 'categories' })}>編集</Chip>
      </div>

      <div className="mb-4">
        <QuickAddInput defaultDue={today} compact />
      </div>

      {total === 0 ? (
        <Empty
          icon={<ListChecks size={22} aria-hidden />}
          title="タスクはありません"
          body="上の入力欄から追加できます。"
        />
      ) : (
        groups.map(([bucket, arr]) => (
          <section key={bucket} className="mb-5">
            <SectionTitle right={<span className="px-1 text-[12px] tabular text-faint">{arr.length}</span>}>
              {BUCKET_LABEL[bucket]}
            </SectionTitle>
            <ul className={cx('flex flex-col', bucket === 'overdue' && 'rounded-[18px] ring-1 ring-danger/20')}>
              {arr.map((t) => (
                <li key={t.id}>
                  <TaskItem task={t} showDue={bucket !== 'today'} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <button
        type="button"
        onClick={() => setShowCompleted((v) => !v)}
        className="press mb-6 w-full rounded-[14px] py-3 text-[13.5px] text-subtle active:bg-surface"
      >
        {showCompleted ? '完了したタスクを隠す' : '完了したタスクを表示'}
      </button>
    </div>
  );
}
