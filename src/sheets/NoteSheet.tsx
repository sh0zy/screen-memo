import { useRef, useState } from 'react';
import { ArrowUpRight, Check, EyeOff, Lock, Pin, Plus, Star, Trash2, X } from 'lucide-react';
import { useData } from '../store/data';
import { cx, uid } from '../lib/id';
import { Button, Chip, Field, IconButton, Sheet, TextArea, TextInput, Toggle } from '../components/ui';
import { Checkbox } from '../components/Checkbox';
import type { ChecklistItem, ID, Note, NoteKind } from '../types';
import type { SheetProps } from './types';

export function NoteSheet({ id, kind, depth, onClose }: SheetProps & { id?: ID; kind?: NoteKind }) {
  const existing = useData((s) => (id ? s.notes.find((n) => n.id === id) : undefined));
  const addNote = useData((s) => s.addNote);
  const updateNote = useData((s) => s.updateNote);
  const deleteNote = useData((s) => s.deleteNote);
  const noteToTask = useData((s) => s.noteToTask);

  const [draft, setDraft] = useState<Partial<Note>>(() =>
    existing
      ? { ...existing }
      : {
          kind: kind ?? 'text',
          title: '',
          content: '',
          items: kind === 'checklist' ? [{ id: uid('i_'), text: '', checked: false }] : [],
          tags: [],
          pinned: false,
          favorite: false,
          showOnScreen: false,
          hideFromWallpaper: false,
          sensitive: false,
        },
  );
  const [tagText, setTagText] = useState('');
  const lastItemRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Note>(k: K, v: Note[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const items = draft.items ?? [];
  const tags = draft.tags ?? [];

  const isEmpty = !(draft.title ?? '').trim() && !(draft.content ?? '').trim() && items.every((i) => !i.text.trim());

  const save = () => {
    if (isEmpty) {
      if (existing) deleteNote(existing.id);
      onClose();
      return;
    }
    const payload = { ...draft, items: items.filter((i) => i.text.trim()) };
    if (existing) updateNote(existing.id, payload);
    else addNote(payload);
    onClose();
  };

  const patchItem = (iid: string, p: Partial<ChecklistItem>) =>
    set('items', items.map((i) => (i.id === iid ? { ...i, ...p } : i)));

  const addItem = () => {
    set('items', [...items, { id: uid('i_'), text: '', checked: false }]);
    setTimeout(() => lastItemRef.current?.focus(), 0);
  };

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
      title={existing ? 'メモ' : '新しいメモ'}
      headerRight={
        <div className="flex items-center">
          <IconButton label={draft.pinned ? 'ピン留めを外す' : 'ピン留め'} onClick={() => set('pinned', !draft.pinned)}>
            <Pin size={18} className={cx(draft.pinned && 'fill-current text-accent')} />
          </IconButton>
          <IconButton
            label={draft.favorite ? 'お気に入りを外す' : 'お気に入り'}
            onClick={() => set('favorite', !draft.favorite)}
          >
            <Star size={18} className={cx(draft.favorite && 'fill-current text-accent')} />
          </IconButton>
          {existing && (
            <IconButton
              label="削除"
              onClick={() => {
                deleteNote(existing.id);
                onClose();
              }}
            >
              <Trash2 size={18} className="text-danger" />
            </IconButton>
          )}
        </div>
      }
      footer={
        <div className="flex gap-2">
          {existing && (
            <Button
              variant="secondary"
              onClick={() => {
                noteToTask(existing.id);
                onClose();
              }}
            >
              <ArrowUpRight size={17} aria-hidden />
              タスクに
            </Button>
          )}
          <Button variant="primary" block size="lg" onClick={save}>
            <Check size={18} aria-hidden />
            保存
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <TextInput
          value={draft.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="タイトル"
          className="h-14 bg-transparent px-0 text-[19px] font-semibold tracking-[-0.015em]"
          autoFocus={!existing}
        />

        {draft.kind === 'checklist' ? (
          <ul className="flex flex-col gap-1">
            {items.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={item.checked}
                  onChange={() => patchItem(item.id, { checked: !item.checked })}
                  label={item.text || '項目'}
                  size={20}
                />
                <input
                  ref={idx === items.length - 1 ? lastItemRef : undefined}
                  value={item.text}
                  onChange={(e) => patchItem(item.id, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                    if (e.key === 'Backspace' && !item.text && items.length > 1) {
                      e.preventDefault();
                      set('items', items.filter((i) => i.id !== item.id));
                    }
                  }}
                  placeholder="項目"
                  className={cx(
                    'h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint',
                    item.checked && 'text-ink/40 line-through',
                  )}
                />
                <IconButton label="項目を削除" size="sm" onClick={() => set('items', items.filter((i) => i.id !== item.id))}>
                  <X size={16} />
                </IconButton>
              </li>
            ))}
            <li>
              <Button variant="ghost" size="sm" onClick={addItem}>
                <Plus size={15} aria-hidden />
                項目を追加
              </Button>
            </li>
          </ul>
        ) : (
          <TextArea
            value={draft.content ?? ''}
            onChange={(e) => set('content', e.target.value)}
            rows={10}
            placeholder="本文"
            className="bg-transparent px-0"
          />
        )}

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

        <div className="overflow-hidden rounded-[18px] bg-surface">
          <label className="flex min-h-[52px] items-center gap-3 border-b hairline px-4">
            <Pin size={17} className="shrink-0 text-subtle" aria-hidden />
            <span className="flex-1 text-[15px]">Today に表示</span>
            <Toggle
              checked={draft.showOnScreen ?? false}
              onChange={(v) => set('showOnScreen', v)}
              label="Today に表示"
            />
          </label>
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
            <span className="flex-1 text-[15px]">プレビューで伏せ字</span>
            <Toggle checked={draft.sensitive ?? false} onChange={(v) => set('sensitive', v)} label="プレビューで伏せ字" />
          </label>
        </div>
      </div>
    </Sheet>
  );
}
