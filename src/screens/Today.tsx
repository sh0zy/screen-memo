import { useMemo } from 'react';
import {
  ChevronDown,
  Clock,
  CopyPlus,
  Flame,
  History,
  Plus,
  Search,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { addDays, formatLong, diffDays } from '../lib/date';
import { cx } from '../lib/id';
import { Icon } from '../lib/icons';
import { habitDueOn, habitStreak, isTodayTask, sortByImportance, byOrder } from '../lib/logic';
import { Button, Empty, IconButton, SectionTitle } from '../components/ui';
import { Checkbox } from '../components/Checkbox';
import { QuickAddInput } from '../components/QuickAddInput';
import { SortableList } from '../components/SortableList';
import { TaskItem } from '../components/TaskItem';
import { useAutosave } from '../components/useAutosave';
import { ScaledCanvas } from '../wallpaper/ScaledCanvas';
import { useDeviceRatio, useWallpaperInput } from '../wallpaper/hooks';
import { SECTION_LABEL_JA } from '../wallpaper/templates';
import type { SectionKind } from '../types';

export default function Today() {
  const screen = useData((s) => s.activeScreen());
  const today = useData((s) => s.today);
  const openSheet = useUI((s) => s.openSheet);

  const f = formatLong(today);
  const visible = screen.sections.filter((s) => s.visible);

  return (
    <div className="mx-auto max-w-[520px] px-4">
      <header className="flex items-center gap-1 pt-2">
        <button
          type="button"
          onClick={() => openSheet({ type: 'screens' })}
          className="press -ml-1 flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 active:bg-surface"
        >
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{screen.name}</span>
          <ChevronDown size={16} className="shrink-0 text-faint" aria-hidden />
        </button>
        <div className="flex-1" />
        <IconButton label="検索" onClick={() => openSheet({ type: 'search' })}>
          <Search size={20} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="履歴" onClick={() => openSheet({ type: 'history' })}>
          <History size={20} strokeWidth={1.8} />
        </IconButton>
      </header>

      <div className="mb-4 mt-1 px-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em]">
          {f.monthNum}月{f.day}日
          <span className="ml-2 text-[17px] font-medium text-subtle">{f.weekdayJa}曜日</span>
        </h1>
        {screen.headline && <p className="mt-1 text-[14px] leading-snug text-subtle">{screen.headline}</p>}
      </div>

      <PreviewCard />

      <div className="pb-2">
        {visible.length === 0 ? (
          <Empty
            icon={<Sparkles size={22} aria-hidden />}
            title="表示するセクションがありません"
            body="タスクや目標など、壁紙に載せたい項目を選んでください。"
            action={
              <Button variant="secondary" onClick={() => openSheet({ type: 'sections' })}>
                セクションを選ぶ
              </Button>
            }
          />
        ) : (
          visible.map((sc) => <SectionBlock key={sc.kind} kind={sc.kind} title={sc.title} />)
        )}
      </div>

      <button
        type="button"
        onClick={() => openSheet({ type: 'sections' })}
        className="press mb-2 flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed hairline py-3.5 text-[13.5px] text-subtle active:bg-surface"
      >
        <Plus size={16} aria-hidden />
        セクションを追加・並べ替え
      </button>

      <p className="pb-4 text-center text-[11.5px] leading-relaxed text-faint">
        プレビューをスクリーンショットして、
        <br />
        壁紙に設定してください
      </p>
    </div>
  );
}

/* ---------------- プレビューカード ---------------- */

function PreviewCard() {
  const screen = useData((s) => s.activeScreen());
  const openPreview = useUI((s) => s.openPreview);
  const ratio = useDeviceRatio();
  const input = useWallpaperInput(screen);

  const tasks = useData((s) => s.tasks);
  const today = useData((s) => s.today);
  const done = tasks.filter((t) => isTodayTask(t, today) && t.completed).length;
  const total = tasks.filter((t) => isTodayTask(t, today)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mb-6 flex items-stretch gap-4 rounded-[20px] bg-surface p-3">
      <button
        type="button"
        onClick={() => openPreview(screen.id)}
        aria-label="ロック画面プレビューを開く"
        className="press w-[92px] shrink-0 overflow-hidden rounded-[14px] shadow-soft ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
      >
        {input && <ScaledCanvas input={input} ratio={ratio} chrome="lock" radius={14} />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 py-1">
        <div>
          <div className="text-[13px] font-semibold tracking-[-0.01em]">今日の進捗</div>
          <div className="mt-0.5 text-[12.5px] text-subtle tabular">
            {total === 0 ? 'タスクはまだありません' : `${done} / ${total} 完了 · ${pct}%`}
          </div>
        </div>
        <div className="h-[5px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => openPreview(screen.id)}>
            <Smartphone size={15} aria-hidden />
            プレビュー
          </Button>
          <Button size="sm" variant="outline" onClick={() => openPreview(screen.id, true)}>
            明日の分
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- セクション ---------------- */

function SectionBlock({ kind, title }: { kind: SectionKind; title?: string }) {
  const label = title || SECTION_LABEL_JA[kind];
  switch (kind) {
    case 'goal':
      return <GoalSection label={label} />;
    case 'priority':
      return <PrioritySection label={label} />;
    case 'tasks':
      return <TaskSection label={label} />;
    case 'schedule':
      return <ScheduleSection label={label} />;
    case 'habits':
      return <HabitSection label={label} />;
    case 'memo':
      return <MemoSection label={label} />;
    case 'countdown':
      return <CountdownSection label={label} />;
    case 'cards':
      return <CardsSection label={label} />;
  }
}

function GoalSection({ label }: { label: string }) {
  const screen = useData((s) => s.activeScreen());
  const updateScreen = useData((s) => s.updateScreen);
  const openSheet = useUI((s) => s.openSheet);

  const toggle = (id: string) =>
    updateScreen(screen.id, {
      goals: screen.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
    });

  return (
    <section className="mb-6">
      <SectionTitle
        right={
          <button type="button" onClick={() => openSheet({ type: 'goals' })} className="press px-1 text-[12.5px] text-subtle">
            編集
          </button>
        }
      >
        {label}
      </SectionTitle>
      {screen.goals.length === 0 ? (
        <AddStub label="今日の目標を書く" onClick={() => openSheet({ type: 'goals' })} />
      ) : (
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {screen.goals.map((g) => (
            <li key={g.id} className="flex items-center gap-3 border-b hairline px-3.5 py-2.5 last:border-b-0">
              <Checkbox checked={g.done} onChange={() => toggle(g.id)} label={g.text} />
              <span className={cx('min-w-0 flex-1 text-[15px] leading-snug', g.done && 'text-ink/40 line-through')}>
                {g.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PrioritySection({ label }: { label: string }) {
  const tasks = useData((s) => s.tasks);
  const today = useData((s) => s.today);
  const openSheet = useUI((s) => s.openSheet);

  const top = useMemo(
    () => sortByImportance(tasks.filter((t) => isTodayTask(t, today) && !t.completed && t.priority === 'high'), today).slice(0, 3),
    [tasks, today],
  );

  return (
    <section className="mb-6">
      <SectionTitle>{label}</SectionTitle>
      {top.length === 0 ? (
        <AddStub
          label="重要なタスクを決める"
          onClick={() => openSheet({ type: 'task', defaults: { dueDate: today, priority: 'high' } })}
        />
      ) : (
        <ul className="flex flex-col">
          {top.map((t) => (
            <li key={t.id}>
              <TaskItem task={t} showDue={false} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskSection({ label }: { label: string }) {
  const tasks = useData((s) => s.tasks);
  const today = useData((s) => s.today);
  const completedDisplay = useData((s) => s.settings.completedDisplay);
  const reorderTasks = useData((s) => s.reorderTasks);
  const screen = useData((s) => s.activeScreen());
  const duplicateYesterday = useData((s) => s.duplicateYesterday);
  const hasYesterday = useData((s) =>
    s.snapshots.some((x) => x.screenId === s.activeScreen().id && x.date === addDays(s.today, -1)),
  );
  const showToast = useUI((s) => s.showToast);

  const list = useMemo(() => {
    const all = tasks.filter((t) => isTodayTask(t, today)).sort(byOrder);
    return completedDisplay === 'hide' ? all.filter((t) => !t.completed) : all;
  }, [tasks, today, completedDisplay]);

  const doneCount = list.filter((t) => t.completed).length;

  return (
    <section className="mb-6">
      <SectionTitle right={list.length > 0 && <span className="px-1 text-[12px] tabular text-faint">{doneCount}/{list.length}</span>}>
        {label}
      </SectionTitle>

      {list.length === 0 ? (
        <Empty
          icon={<Sparkles size={22} aria-hidden />}
          title="今日のタスクはまだありません"
          body="下の入力欄から追加できます。「明日」「!」「#タグ」も使えます。"
          action={
            hasYesterday && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (!duplicateYesterday(screen.id)) showToast('昨日の記録が見つかりませんでした');
                }}
              >
                <CopyPlus size={16} aria-hidden />
                昨日の内容をコピー
              </Button>
            )
          }
        />
      ) : (
        <SortableList
          items={list}
          onReorder={reorderTasks}
          render={(task, handle, dragging) => (
            <TaskItem task={task} handle={handle} dragging={dragging} showDue={false} />
          )}
        />
      )}

      <div className="mt-2">
        <QuickAddInput defaultDue={today} screenId={screen.onlyOwnTasks ? screen.id : undefined} compact />
      </div>
    </section>
  );
}

function ScheduleSection({ label }: { label: string }) {
  const schedule = useData((s) => s.schedule);
  const today = useData((s) => s.today);
  const openSheet = useUI((s) => s.openSheet);

  const list = useMemo(
    () => schedule.filter((s) => s.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedule, today],
  );

  return (
    <section className="mb-6">
      <SectionTitle
        right={
          <IconButton label="予定を追加" size="sm" onClick={() => openSheet({ type: 'schedule', date: today })}>
            <Plus size={17} />
          </IconButton>
        }
      >
        {label}
      </SectionTitle>
      {list.length === 0 ? (
        <AddStub label="予定を追加" onClick={() => openSheet({ type: 'schedule', date: today })} />
      ) : (
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {list.map((s) => (
            <li key={s.id} className="border-b hairline last:border-b-0">
              <button
                type="button"
                onClick={() => openSheet({ type: 'schedule', id: s.id })}
                className="press flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
              >
                <span className="w-[42px] shrink-0 text-[14px] font-semibold tabular tracking-[-0.01em]">{s.startTime}</span>
                <span className="h-7 w-px shrink-0 bg-line" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{s.title}</span>
                {s.endTime && <span className="shrink-0 text-[12px] tabular text-faint">〜{s.endTime}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HabitSection({ label }: { label: string }) {
  const habits = useData((s) => s.habits);
  const today = useData((s) => s.today);
  const toggleHabit = useData((s) => s.toggleHabit);
  const openSheet = useUI((s) => s.openSheet);

  const list = habits.filter((h) => !h.archived && habitDueOn(h, today));

  return (
    <section className="mb-6">
      <SectionTitle
        right={
          <IconButton label="習慣を追加" size="sm" onClick={() => openSheet({ type: 'habit' })}>
            <Plus size={17} />
          </IconButton>
        }
      >
        {label}
      </SectionTitle>
      {list.length === 0 ? (
        <AddStub label="習慣を追加" onClick={() => openSheet({ type: 'habit' })} />
      ) : (
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {list.map((h) => {
            const done = h.completedDates.includes(today);
            const streak = habitStreak(h, today);
            return (
              <li key={h.id} className="flex items-center gap-3 border-b hairline px-3.5 py-2.5 last:border-b-0">
                <Checkbox checked={done} onChange={() => toggleHabit(h.id)} label={h.title} />
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'habit', id: h.id })}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Icon name={h.icon} size={15} className="shrink-0 text-subtle" />
                  <span className={cx('min-w-0 flex-1 truncate text-[15px]', done && 'text-ink/40')}>{h.title}</span>
                  {streak > 1 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] tabular text-subtle">
                      <Flame size={13} aria-hidden />
                      {streak}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MemoSection({ label }: { label: string }) {
  const screen = useData((s) => s.activeScreen());
  const updateScreen = useData((s) => s.updateScreen);
  const notes = useData((s) => s.notes);
  const openSheet = useUI((s) => s.openSheet);

  const memo = useAutosave(screen.memo, (v) => updateScreen(screen.id, { memo: v }));
  const pinned = notes.filter((n) => n.showOnScreen && !n.archived && !n.deletedAt);

  return (
    <section className="mb-6">
      <SectionTitle>{label}</SectionTitle>
      <textarea
        value={memo.value}
        onChange={(e) => memo.onChange(e.target.value)}
        onBlur={memo.flush}
        rows={2}
        placeholder="ひとことメモ"
        className="w-full rounded-[18px] bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none ring-accent/30 placeholder:text-faint focus:ring-2"
      />
      {pinned.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {pinned.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openSheet({ type: 'note', id: n.id })}
                className="press w-full rounded-[16px] bg-surface px-4 py-3 text-left active:bg-line/40"
              >
                {n.title && <div className="mb-0.5 text-[14px] font-medium">{n.title}</div>}
                <div className="line-clamp-2 text-[13px] leading-snug text-subtle">
                  {n.kind === 'checklist' ? n.items.map((i) => i.text).join(' · ') : n.content}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CountdownSection({ label }: { label: string }) {
  const countdowns = useData((s) => s.countdowns);
  const today = useData((s) => s.today);
  const openSheet = useUI((s) => s.openSheet);

  const list = useMemo(
    () => countdowns.slice().sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
    [countdowns],
  );

  return (
    <section className="mb-6">
      <SectionTitle
        right={
          <IconButton label="カウントダウンを追加" size="sm" onClick={() => openSheet({ type: 'countdown' })}>
            <Plus size={17} />
          </IconButton>
        }
      >
        {label}
      </SectionTitle>
      {list.length === 0 ? (
        <AddStub label="カウントダウンを追加" onClick={() => openSheet({ type: 'countdown' })} />
      ) : (
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {list.map((c) => {
            const d = diffDays(today, c.targetDate);
            return (
              <li key={c.id} className="border-b hairline last:border-b-0">
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'countdown', id: c.id })}
                  className="press flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
                >
                  <Clock size={16} className="shrink-0 text-subtle" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{c.title}</span>
                  <span className="shrink-0 text-[14px] font-semibold tabular">
                    {d > 0 ? `あと${d}日` : d === 0 ? '今日' : `${-d}日前`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CardsSection({ label }: { label: string }) {
  const screen = useData((s) => s.activeScreen());
  const openSheet = useUI((s) => s.openSheet);

  return (
    <section className="mb-6">
      <SectionTitle
        right={
          <IconButton label="ミニカードを追加" size="sm" onClick={() => openSheet({ type: 'cards' })}>
            <Plus size={17} />
          </IconButton>
        }
      >
        {label}
      </SectionTitle>
      {screen.miniCards.length === 0 ? (
        <AddStub label="ミニカードを追加" onClick={() => openSheet({ type: 'cards' })} />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {screen.miniCards.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openSheet({ type: 'cards', id: c.id })}
                className="press flex h-full w-full flex-col gap-1 rounded-[16px] bg-surface px-3.5 py-3 text-left active:bg-line/40"
              >
                <span className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.1em] text-faint">
                  {c.icon && <Icon name={c.icon} size={12} />}
                  {c.title}
                </span>
                <span className="text-[19px] font-semibold tabular tracking-[-0.02em]">
                  {c.value}
                  {c.kind === 'progress' && c.sub && <span className="text-[13px] text-faint"> / {c.sub}</span>}
                </span>
                {c.kind !== 'progress' && c.sub && <span className="text-[11.5px] text-subtle">{c.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddStub({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex w-full items-center gap-2 rounded-[18px] bg-surface px-4 py-3.5 text-left text-[14px] text-subtle active:bg-line/40"
    >
      <Plus size={16} className="text-faint" aria-hidden />
      {label}
    </button>
  );
}
