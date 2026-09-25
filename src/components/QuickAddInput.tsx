import { forwardRef, useMemo, useState } from 'react';
import { ArrowUp, Plus } from 'lucide-react';
import type { DateStr, ID, Priority } from '../types';
import { useData } from '../store/data';
import { useUI } from '../store/ui';
import { parseQuickInput } from '../lib/quickParse';
import { weekday } from '../lib/date';
import { cx } from '../lib/id';

/**
 * スマート入力つきのタスク追加欄 (§13)。
 * Enter で追加し、フォーカスは保持 → 連続入力できる。
 */
export const QuickAddInput = forwardRef<
  HTMLInputElement,
  {
    placeholder?: string;
    defaultDue?: DateStr;
    defaultPriority?: Priority;
    screenId?: ID;
    inbox?: boolean;
    autoFocus?: boolean;
    compact?: boolean;
    onAdded?: () => void;
  }
>(function QuickAddInput(
  { placeholder = 'タスクを追加', defaultDue, defaultPriority, screenId, inbox, autoFocus, compact, onAdded },
  ref,
) {
  const [text, setText] = useState('');
  const today = useData((s) => s.today);
  const addTask = useData((s) => s.addTask);
  const addSchedule = useData((s) => s.addSchedule);
  const showToast = useUI((s) => s.showToast);
  const parsed = useMemo(() => (text.trim() ? parseQuickInput(text, today) : null), [text, today]);

  const submit = () => {
    if (!parsed || !parsed.title.trim()) return;
    const due = parsed.someday ? undefined : parsed.dueDate ?? defaultDue;
    if (parsed.time) {
      addSchedule({ title: parsed.title, startTime: parsed.time, date: due ?? today });
      showToast(`予定「${parsed.time} ${parsed.title}」を追加しました`);
    } else {
      addTask({
        title: parsed.title,
        dueDate: due,
        priority: parsed.priority ?? defaultPriority ?? 'medium',
        tags: parsed.tags,
        screenId,
        inbox: !!inbox && !due,
        repeat:
          parsed.repeat === 'daily'
            ? { type: 'daily' }
            : parsed.repeat === 'weekdays'
              ? { type: 'weekdays' }
              : parsed.repeat === 'weekly'
                ? { type: 'weekly', days: [weekday(due ?? today)] }
                : { type: 'none' },
      });
    }
    setText('');
    onAdded?.();
  };

  return (
    <div>
      <div
        className={cx(
          'flex items-center gap-2 rounded-[14px] bg-surface pl-3.5 pr-1.5 ring-accent/25 focus-within:ring-2',
          compact ? 'h-11' : 'h-12',
        )}
      >
        <Plus size={17} className="shrink-0 text-faint" aria-hidden />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          autoFocus={autoFocus}
          enterKeyHint="done"
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
        />
        {text.trim() && (
          <button
            type="button"
            onClick={submit}
            aria-label="追加"
            className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent"
          >
            <ArrowUp size={17} strokeWidth={2.2} />
          </button>
        )}
      </div>
      {parsed && parsed.chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 px-1" aria-live="polite">
          {parsed.chips.map((c, i) => (
            <span key={i} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11.5px] font-medium text-ink/75">
              {c}
            </span>
          ))}
          {parsed.time && <span className="px-1 text-[11.5px] text-subtle">→ 予定として追加</span>}
        </div>
      )}
    </div>
  );
});
