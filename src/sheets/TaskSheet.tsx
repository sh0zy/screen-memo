import { useState } from 'react';
import { Check, EyeOff, GripVertical, Lock, Plus, Repeat, Trash2, X } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { addDays, relativeLabel, WEEKDAY_JA } from '../lib/date';
import { cx, uid } from '../lib/id';
import { Icon } from '../lib/icons';
import { repeatLabel } from '../lib/logic';
import { Button, Chip, Field, IconButton, Segmented, Sheet, TextArea, TextInput, Toggle } from '../components/ui';
import { Checkbox } from '../components/Checkbox';
import type { ID, Priority, RepeatType, Subtask, Task } from '../types';
import type { SheetProps } from './types';

type Defaults = { dueDate?: string; priority?: Priority; screenId?: ID };

export function TaskSheet({
  id,
  defaults,
  depth,
  onClose,
}: SheetProps & { id?: ID; defaults?: Defaults }) {
  const today = useData((s) => s.today);
  const existing = useData((s) => (id ? s.tasks.find((t) => t.id === id) : undefined));
  const addTask = useData((s) => s.addTask);
  const updateTask = useData((s) => s.updateTask);
  const deleteTask = useData((s) => s.deleteTask);
  const categories = useData((s) => s.categories);
  const screens = useData((s) => s.screens);
  const openSheet = useUI((s) => s.openSheet);

  const [draft, setDraft] = useState<Partial<Task>>(() =>
    existing
      ? { ...existing }
      : {
          title: '',
          note: '',
          priority: defaults?.priority ?? 'medium',
          dueDate: defaults?.dueDate ?? today,
          screenId: defaults?.screenId,
          tags: [],
          subtasks: [],
          repeat: { type: 'none' },
          hideFromWallpaper: false,
          sensitive: false,
        },
  );
  const [tagText, setTagText] = useState('');

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const title = (draft.title ?? '').trim();
    if (!title) {
      onClose();
      return;
    }
    if (existing) updateTask(existing.id, { ...draft, title, inbox: false });
    else addTask({ ...draft, title } as Partial<Task> & { title: string });
    onClose();
  };

  const repeat = draft.repeat ?? { type: 'none' as RepeatType };
  const subtasks = draft.subtasks ?? [];
  const tags = draft.tags ?? [];

  const addSubtask = () => set('subtasks', [...subtasks, { id: uid('st_'), title: '', completed: false }]);
  const patchSubtask = (sid: string, p: Partial<Subtask>) =>
    set('subtasks', subtasks.map((s) => (s.id === sid ? { ...s, ...p } : s)));

  const addTag = () => {
    const t = tagText.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) set('tags', [...tags, t]);
    setTagText('');
  };

  return (
    <Sheet
      depth={depth}
      onClose={save}
      tall
      title={existing ? 'タスクを編集' : '新しいタスク'}
      headerRight={
        existing && (
          <IconButton
            label="削除"
            onClick={() => {
              deleteTask(existing.id);
              onClose();
            }}
          >
            <Trash2 size={19} className="text-danger" />
          </IconButton>
        )
      }
      footer={
        <Button variant="primary" block size="lg" onClick={save}>
          <Check size={18} aria-hidden />
          {existing ? '保存' : '追加'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <TextInput
          value={draft.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="やること"
          autoFocus={!existing}
          className="h-14 text-[17px] font-medium"
        />

        <Field label="重要度">
          <Segmented<Priority>
            label="重要度"
            value={draft.priority ?? 'medium'}
            onChange={(v) => set('priority', v)}
            options={[
              { value: 'high', label: '高' },
              { value: 'medium', label: '中' },
              { value: 'low', label: '低' },
            ]}
          />
        </Field>

        <Field label="期限" hint={draft.dueDate ? relativeLabel(draft.dueDate, today) : '設定なし'}>
          <div className="flex flex-wrap gap-2">
            <Chip active={draft.dueDate === today} onClick={() => set('dueDate', today)}>
              今日
            </Chip>
            <Chip active={draft.dueDate === addDays(today, 1)} onClick={() => set('dueDate', addDays(today, 1))}>
              明日
            </Chip>
            <Chip
              active={draft.dueDate === addDays(today, 7)}
              onClick={() => set('dueDate', addDays(today, 7))}
            >
              1週間後
            </Chip>
            <Chip active={!draft.dueDate} onClick={() => set('dueDate', undefined)}>
              いつか
            </Chip>
            <input
              type="date"
              value={draft.dueDate ?? ''}
              onChange={(e) => set('dueDate', e.target.value || undefined)}
              aria-label="期限の日付"
              className="h-9 rounded-full bg-surface px-3 text-[13px] outline-none ring-accent/30 focus:ring-2"
            />
          </div>
        </Field>

        <Field label="繰り返し" hint={repeat.type !== 'none' ? repeatLabel(repeat) : undefined}>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['none', 'なし'],
                ['daily', '毎日'],
                ['weekdays', '平日'],
                ['weekly', '毎週'],
                ['monthly', '毎月'],
              ] as [RepeatType, string][]
            ).map(([t, label]) => (
              <Chip
                key={t}
                active={repeat.type === t}
                onClick={() =>
                  set('repeat', {
                    type: t,
                    days: t === 'weekly' ? repeat.days ?? [] : undefined,
                    monthDay: t === 'monthly' ? repeat.monthDay ?? 1 : undefined,
                  })
                }
              >
                {t !== 'none' && <Repeat size={13} />}
                {label}
              </Chip>
            ))}
          </div>
          {repeat.type === 'weekly' && (
            <div className="mt-2 flex gap-1.5">
              {WEEKDAY_JA.map((w, i) => {
                const on = (repeat.days ?? []).includes(i);
                return (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set('repeat', {
                        ...repeat,
                        days: on ? (repeat.days ?? []).filter((d) => d !== i) : [...(repeat.days ?? []), i],
                      })
                    }
                    className={cx(
                      'press h-10 flex-1 rounded-[12px] text-[13px] font-medium',
                      on ? 'bg-accent text-on-accent' : 'bg-surface text-subtle',
                    )}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="カテゴリ">
          <div className="flex flex-wrap gap-2">
            <Chip active={!draft.categoryId} onClick={() => set('categoryId', undefined)}>
              なし
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={draft.categoryId === c.id} onClick={() => set('categoryId', c.id)}>
                <Icon name={c.icon} size={13} />
                {c.name}
              </Chip>
            ))}
            <Chip onClick={() => openSheet({ type: 'categories' })}>
              <Plus size={13} />
            </Chip>
          </div>
        </Field>

        <Field label="サブタスク" hint={subtasks.length > 0 ? `${subtasks.filter((s) => s.completed).length}/${subtasks.length}` : undefined}>
          <ul className="flex flex-col gap-1.5">
            {subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-[13px] bg-surface pl-3 pr-1">
                <GripVertical size={15} className="shrink-0 text-faint" aria-hidden />
                <Checkbox
                  checked={s.completed}
                  onChange={() => patchSubtask(s.id, { completed: !s.completed })}
                  label={s.title || 'サブタスク'}
                  size={19}
                />
                <input
                  value={s.title}
                  onChange={(e) => patchSubtask(s.id, { title: e.target.value })}
                  placeholder="サブタスク"
                  className={cx(
                    'h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint',
                    s.completed && 'text-ink/40 line-through',
                  )}
                />
                <IconButton
                  label="サブタスクを削除"
                  size="sm"
                  onClick={() => set('subtasks', subtasks.filter((x) => x.id !== s.id))}
                >
                  <X size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={addSubtask} className="mt-1.5">
            <Plus size={15} aria-hidden />
            サブタスクを追加
          </Button>
        </Field>

        <Field label="タグ">
          <div className="mb-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t} onClick={() => set('tags', tags.filter((x) => x !== t))}>
                #{t}
                <X size={13} />
              </Chip>
            ))}
          </div>
          <TextInput
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="タグを入力して Enter"
            className="h-11 text-[14px]"
          />
        </Field>

        <Field label="メモ">
          <TextArea
            value={draft.note ?? ''}
            onChange={(e) => set('note', e.target.value)}
            rows={3}
            placeholder="補足や手順など"
          />
        </Field>

        <div className="overflow-hidden rounded-[18px] bg-surface">
          <label className="flex min-h-[52px] items-center gap-3 border-b hairline px-4">
            <EyeOff size={17} className="shrink-0 text-subtle" aria-hidden />
            <span className="flex-1 text-[15px]">壁紙に表示しない</span>
            <Toggle
              checked={draft.hideFromWallpaper ?? false}
              onChange={(v) => set('hideFromWallpaper', v)}
              label="壁紙に表示しない"
            />
          </label>
          <label className="flex min-h-[52px] items-center gap-3 px-4">
            <Lock size={17} className="shrink-0 text-subtle" aria-hidden />
            <span className="flex-1 text-[15px]">
              プレビューで伏せ字
              <span className="mt-0.5 block text-[12px] text-subtle">人に見せるとき ●●●● になります</span>
            </span>
            <Toggle checked={draft.sensitive ?? false} onChange={(v) => set('sensitive', v)} label="プレビューで伏せ字" />
          </label>
        </div>

        {screens.length > 1 && (
          <Field label="表示するScreen">
            <div className="flex flex-wrap gap-2">
              <Chip active={!draft.screenId} onClick={() => set('screenId', undefined)}>
                すべて
              </Chip>
              {screens.map((s) => (
                <Chip key={s.id} active={draft.screenId === s.id} onClick={() => set('screenId', s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Sheet>
  );
}
