import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { isValidTime, normalizeTime, WEEKDAY_JA } from '../lib/date';
import { cx, uid } from '../lib/id';
import { Icon, ICON_NAMES } from '../lib/icons';
import { Button, Field, IconButton, Segmented, Sheet, TextInput } from '../components/ui';
import { Checkbox } from '../components/Checkbox';
import type { DateStr, GoalItem, IconName, ID, MiniCard, MiniCardKind } from '../types';
import type { SheetProps } from './types';

/* ================= 予定 ================= */

export function ScheduleSheet({ id, date, depth, onClose }: SheetProps & { id?: ID; date?: DateStr }) {
  const today = useData((s) => s.today);
  const existing = useData((s) => (id ? s.schedule.find((x) => x.id === id) : undefined));
  const addSchedule = useData((s) => s.addSchedule);
  const updateSchedule = useData((s) => s.updateSchedule);
  const deleteSchedule = useData((s) => s.deleteSchedule);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [startTime, setStartTime] = useState(existing?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(existing?.endTime ?? '');
  const [day, setDay] = useState<DateStr>(existing?.date ?? date ?? today);

  const save = () => {
    const t = title.trim();
    if (!t || !isValidTime(startTime)) {
      onClose();
      return;
    }
    const payload = {
      title: t,
      startTime: normalizeTime(startTime),
      endTime: isValidTime(endTime) ? normalizeTime(endTime) : undefined,
      date: day,
    };
    if (existing) updateSchedule(existing.id, payload);
    else addSchedule(payload);
    onClose();
  };

  return (
    <Sheet
      depth={depth}
      onClose={save}
      title={existing ? '予定' : '新しい予定'}
      headerRight={
        existing && (
          <IconButton
            label="削除"
            onClick={() => {
              deleteSchedule(existing.id);
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
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="予定の名前" autoFocus={!existing} />
        <div className="flex gap-3">
          <Field label="開始">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-12 w-full rounded-[14px] bg-surface px-4 text-[16px] tabular outline-none ring-accent/30 focus:ring-2"
            />
          </Field>
          <Field label="終了" hint="任意">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-12 w-full rounded-[14px] bg-surface px-4 text-[16px] tabular outline-none ring-accent/30 focus:ring-2"
            />
          </Field>
        </div>
        <Field label="日付">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value || today)}
            className="h-12 w-full rounded-[14px] bg-surface px-4 text-[16px] outline-none ring-accent/30 focus:ring-2"
          />
        </Field>
      </div>
    </Sheet>
  );
}

/* ================= 習慣 ================= */

export function HabitSheet({ id, depth, onClose }: SheetProps & { id?: ID }) {
  const existing = useData((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
  const addHabit = useData((s) => s.addHabit);
  const updateHabit = useData((s) => s.updateHabit);
  const deleteHabit = useData((s) => s.deleteHabit);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState<IconName>(existing?.icon ?? 'repeat');
  const [days, setDays] = useState<number[]>(existing?.repeatDays ?? []);

  const save = () => {
    const t = title.trim();
    if (!t) {
      onClose();
      return;
    }
    if (existing) updateHabit(existing.id, { title: t, icon, repeatDays: days });
    else addHabit({ title: t, icon, repeatDays: days });
    onClose();
  };

  return (
    <Sheet
      depth={depth}
      onClose={save}
      title={existing ? '習慣' : '新しい習慣'}
      headerRight={
        existing && (
          <IconButton
            label="削除"
            onClick={() => {
              deleteHabit(existing.id);
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
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="習慣の名前" autoFocus={!existing} />

        <Field label="曜日" hint={days.length === 0 ? '毎日' : undefined}>
          <div className="flex gap-1.5">
            {WEEKDAY_JA.map((w, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays(on ? days.filter((d) => d !== i) : [...days, i])}
                  className={cx(
                    'press h-11 flex-1 rounded-[12px] text-[13.5px] font-medium',
                    on ? 'bg-accent text-on-accent' : 'bg-surface text-subtle',
                  )}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="アイコン">
          <IconPicker value={icon} onChange={(v) => v && setIcon(v)} />
        </Field>
      </div>
    </Sheet>
  );
}

/* ================= カウントダウン ================= */

export function CountdownSheet({ id, depth, onClose }: SheetProps & { id?: ID }) {
  const today = useData((s) => s.today);
  const existing = useData((s) => (id ? s.countdowns.find((c) => c.id === id) : undefined));
  const addCountdown = useData((s) => s.addCountdown);
  const updateCountdown = useData((s) => s.updateCountdown);
  const deleteCountdown = useData((s) => s.deleteCountdown);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [target, setTarget] = useState<DateStr>(existing?.targetDate ?? today);

  const save = () => {
    const t = title.trim();
    if (!t) {
      onClose();
      return;
    }
    if (existing) updateCountdown(existing.id, { title: t, targetDate: target });
    else addCountdown({ title: t, targetDate: target });
    onClose();
  };

  return (
    <Sheet
      depth={depth}
      onClose={save}
      title={existing ? 'カウントダウン' : '新しいカウントダウン'}
      headerRight={
        existing && (
          <IconButton
            label="削除"
            onClick={() => {
              deleteCountdown(existing.id);
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
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="試験・締切など" autoFocus={!existing} />
        <Field label="目標日">
          <input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value || today)}
            className="h-12 w-full rounded-[14px] bg-surface px-4 text-[16px] outline-none ring-accent/30 focus:ring-2"
          />
        </Field>
      </div>
    </Sheet>
  );
}

/* ================= 今日の目標 ================= */

export function GoalsSheet({ depth, onClose }: SheetProps) {
  const screen = useData((s) => s.activeScreen());
  const updateScreen = useData((s) => s.updateScreen);
  const [goals, setGoals] = useState<GoalItem[]>(() => screen.goals.map((g) => ({ ...g })));
  const [headline, setHeadline] = useState(screen.headline);

  const save = () => {
    updateScreen(screen.id, { goals: goals.filter((g) => g.text.trim()), headline: headline.trim() });
    onClose();
  };

  const patch = (id: string, p: Partial<GoalItem>) => setGoals((g) => g.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <Sheet
      depth={depth}
      onClose={save}
      title="今日の目標"
      footer={
        <Button variant="primary" block size="lg" onClick={save}>
          <Check size={18} aria-hidden />
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <Field label="ひとこと" hint="壁紙の上部に出ます">
          <TextInput value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="One thing at a time." />
        </Field>

        <Field label="目標">
          <ul className="flex flex-col gap-1.5">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded-[13px] bg-surface pl-3 pr-1">
                <Checkbox checked={g.done} onChange={() => patch(g.id, { done: !g.done })} label={g.text || '目標'} size={19} />
                <input
                  value={g.text}
                  onChange={(e) => patch(g.id, { text: e.target.value })}
                  placeholder="今日の目標"
                  className={cx(
                    'h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint',
                    g.done && 'text-ink/40 line-through',
                  )}
                />
                <IconButton label="目標を削除" size="sm" onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}>
                  <X size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1.5"
            onClick={() => setGoals([...goals, { id: uid('g_'), text: '', done: false }])}
          >
            <Plus size={15} aria-hidden />
            目標を追加
          </Button>
        </Field>
      </div>
    </Sheet>
  );
}

/* ================= ミニカード ================= */

export function CardSheet({ id, depth, onClose }: SheetProps & { id?: ID }) {
  const screen = useData((s) => s.activeScreen());
  const updateScreen = useData((s) => s.updateScreen);
  const existing = screen.miniCards.find((c) => c.id === id);

  const [card, setCard] = useState<MiniCard>(
    () => existing ?? { id: uid('mc_'), kind: 'number', title: '', value: '', sub: '', icon: undefined },
  );

  const save = () => {
    if (!card.title.trim() && !card.value.trim()) {
      onClose();
      return;
    }
    const next = existing
      ? screen.miniCards.map((c) => (c.id === card.id ? card : c))
      : [...screen.miniCards, card];
    updateScreen(screen.id, { miniCards: next });
    onClose();
  };

  const remove = () => {
    updateScreen(screen.id, { miniCards: screen.miniCards.filter((c) => c.id !== card.id) });
    onClose();
  };

  return (
    <Sheet
      depth={depth}
      onClose={save}
      title={existing ? 'ミニカード' : '新しいミニカード'}
      headerRight={
        existing && (
          <IconButton label="削除" onClick={remove}>
            <Trash2 size={19} className="text-danger" />
          </IconButton>
        )
      }
      footer={
        <Button variant="primary" block size="lg" onClick={save}>
          <Check size={18} aria-hidden />
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <Field label="種類">
          <Segmented<MiniCardKind>
            label="種類"
            value={card.kind}
            onChange={(v) => setCard({ ...card, kind: v })}
            options={[
              { value: 'number', label: '数値' },
              { value: 'progress', label: '進捗' },
              { value: 'text', label: 'テキスト' },
            ]}
          />
        </Field>
        <Field label="タイトル">
          <TextInput
            value={card.title}
            onChange={(e) => setCard({ ...card, title: e.target.value })}
            placeholder={card.kind === 'progress' ? '課題' : '体重'}
            autoFocus={!existing}
          />
        </Field>
        <div className="flex gap-3">
          <Field label={card.kind === 'progress' ? '完了' : '値'}>
            <TextInput
              value={card.value}
              onChange={(e) => setCard({ ...card, value: e.target.value })}
              placeholder={card.kind === 'progress' ? '3' : '65kg'}
            />
          </Field>
          <Field label={card.kind === 'progress' ? '全体' : '補足'} hint="任意">
            <TextInput
              value={card.sub ?? ''}
              onChange={(e) => setCard({ ...card, sub: e.target.value })}
              placeholder={card.kind === 'progress' ? '4' : '785 → 800'}
            />
          </Field>
        </div>
        <Field label="アイコン" hint="任意">
          <IconPicker value={card.icon} onChange={(v) => setCard({ ...card, icon: v })} allowNone />
        </Field>
      </div>
    </Sheet>
  );
}

/* ================= My Template 保存 ================= */

export function SaveTemplateSheet({ depth, onClose }: SheetProps) {
  const screen = useData((s) => s.activeScreen());
  const saveUserTemplate = useData((s) => s.saveUserTemplate);
  const [name, setName] = useState(`${screen.name} の見た目`);

  const save = () => {
    const n = name.trim();
    if (n) saveUserTemplate(screen.id, n);
    onClose();
  };

  return (
    <Sheet
      depth={depth}
      onClose={onClose}
      title="My Template として保存"
      footer={
        <Button variant="primary" block size="lg" onClick={save} disabled={!name.trim()}>
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-3 pt-1 pb-2">
        <p className="px-1 text-[13px] leading-relaxed text-subtle">
          背景・文字・セクション構成を保存します。タスクやメモの中身は含まれません。
        </p>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="テンプレート名" autoFocus />
      </div>
    </Sheet>
  );
}

/* ================= カテゴリ ================= */

export function CategoriesSheet({ depth, onClose }: SheetProps) {
  const categories = useData((s) => s.categories);
  const addCategory = useData((s) => s.addCategory);
  const updateCategory = useData((s) => s.updateCategory);
  const deleteCategory = useData((s) => s.deleteCategory);
  const showToast = useUI((s) => s.showToast);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('list');

  const add = () => {
    const n = name.trim();
    if (!n) return;
    addCategory({ name: n, icon });
    setName('');
  };

  return (
    <Sheet
      depth={depth}
      onClose={onClose}
      tall
      title="カテゴリ"
      footer={
        <div className="flex gap-2">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            placeholder="新しいカテゴリ"
          />
          <Button variant="primary" onClick={add} disabled={!name.trim()}>
            <Plus size={17} aria-hidden />
          </Button>
        </div>
      }
    >
      <div className="pt-1">
        <div className="mb-4">
          <IconPicker value={icon} onChange={(v) => v && setIcon(v)} />
        </div>
        <ul className="overflow-hidden rounded-[18px] bg-surface">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-b hairline px-3.5 py-2 last:border-b-0">
              <Icon name={c.icon} size={17} className="shrink-0 text-subtle" />
              <input
                value={c.name}
                onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                aria-label={`${c.name} の名前`}
              />
              <IconButton
                label={`${c.name} を削除`}
                size="sm"
                onClick={() => {
                  deleteCategory(c.id);
                  showToast(`「${c.name}」を削除しました`);
                }}
              >
                <Trash2 size={16} className="text-danger" />
              </IconButton>
            </li>
          ))}
        </ul>
        {categories.length === 0 && (
          <p className="px-1 py-6 text-center text-[13px] text-subtle">カテゴリはまだありません</p>
        )}
      </div>
    </Sheet>
  );
}

/* ================= 共通: アイコン選択 ================= */

export function IconPicker({
  value,
  onChange,
  allowNone,
}: {
  value?: IconName;
  onChange: (v: IconName | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <ul className="grid grid-cols-7 gap-1.5">
      {allowNone && (
        <li>
          <button
            type="button"
            aria-label="アイコンなし"
            aria-pressed={!value}
            onClick={() => onChange(undefined)}
            className={cx(
              'press flex aspect-square w-full items-center justify-center rounded-[12px] text-[11px]',
              !value ? 'bg-accent text-on-accent' : 'bg-surface text-subtle',
            )}
          >
            なし
          </button>
        </li>
      )}
      {ICON_NAMES.map((n) => (
        <li key={n}>
          <button
            type="button"
            aria-label={n}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cx(
              'press flex aspect-square w-full items-center justify-center rounded-[12px]',
              value === n ? 'bg-accent text-on-accent' : 'bg-surface text-subtle',
            )}
          >
            <Icon name={n} size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}
