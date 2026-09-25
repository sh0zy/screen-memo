import { useRef, useState } from 'react';
import {
  Archive,
  ChevronRight,
  Download,
  Inbox,
  Layers,
  Moon,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  Sunrise,
  Vibrate,
  Wand2,
  X,
} from 'lucide-react';
import { useData, type BackupFile } from '../store/data';
import { useUI } from '../store/ui';
import { cx } from '../lib/id';
import { APP_THEMES, ACCENTS } from '../wallpaper/templates';
import { notificationsAvailable, requestNotificationPermission } from '../lib/reminder';
import { Button, Group, IconButton, Row, Segmented, Toggle } from '../components/ui';
import type { CompletedDisplay, DeviceRatio, ResetPolicy, ThemePref } from '../types';

export default function SettingsScreen() {
  const settings = useData((s) => s.settings);
  const update = useData((s) => s.updateSettings);
  const exportBackup = useData((s) => s.exportBackup);
  const importBackup = useData((s) => s.importBackup);
  const wipeAll = useData((s) => s.wipeAll);
  const quickTidy = useData((s) => s.quickTidy);
  const openSheet = useUI((s) => s.openSheet);
  const showToast = useUI((s) => s.showToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screen-memo-${data.exportedAt.slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('バックアップを書き出しました');
    } catch {
      showToast('書き出しに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File) => {
    if (!confirm('現在のデータはすべて置き換えられます。読み込みますか？')) return;
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      await importBackup(parsed);
      showToast('バックアップを読み込みました');
    } catch {
      showToast('ファイルを読み込めませんでした');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-[520px] px-4">
      <h1 className="px-1 pb-4 pt-3 text-[22px] font-semibold tracking-[-0.02em]">設定</h1>

      <Group title="外観">
        <div className="px-4 py-3">
          <Segmented<ThemePref>
            label="テーマ"
            value={settings.theme}
            onChange={(v) => update({ theme: v })}
            options={[
              { value: 'light', label: 'ライト' },
              { value: 'dark', label: 'ダーク' },
              { value: 'system', label: '端末に合わせる' },
            ]}
          />
        </div>
        <div className="px-4 py-3">
          <div className="mb-2 text-[12.5px] font-medium text-subtle">アプリの色</div>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {APP_THEMES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-label={t.name}
                  aria-pressed={settings.appTheme === t.id}
                  onClick={() => update({ appTheme: t.id })}
                  className={cx(
                    'press h-11 w-11 shrink-0 rounded-full ring-1 ring-black/[0.08] dark:ring-white/[0.12]',
                    settings.appTheme === t.id && 'ring-2 ring-accent',
                  )}
                  style={{ background: t.swatch }}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-3">
          <div className="mb-2 text-[12.5px] font-medium text-subtle">アクセント</div>
          <ul className="flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  aria-label={`アクセント ${c}`}
                  aria-pressed={settings.accent === c}
                  onClick={() => update({ accent: c })}
                  className={cx(
                    'press h-9 w-9 rounded-full ring-1 ring-black/[0.08] dark:ring-white/[0.12]',
                    settings.accent === c && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                  )}
                  style={{ background: c }}
                />
              </li>
            ))}
          </ul>
        </div>
      </Group>

      <Group title="表示">
        <div className="px-4 py-3">
          <div className="mb-2 text-[12.5px] font-medium text-subtle">完了したタスク</div>
          <Segmented<CompletedDisplay>
            label="完了したタスクの表示"
            value={settings.completedDisplay}
            onChange={(v) => update({ completedDisplay: v })}
            options={[
              { value: 'dim', label: '薄く' },
              { value: 'strike', label: '打ち消し' },
              { value: 'hide', label: '隠す' },
            ]}
          />
        </div>
        <div className="px-4 py-3">
          <div className="mb-2 text-[12.5px] font-medium text-subtle">壁紙の縦横比</div>
          <Segmented<DeviceRatio>
            label="壁紙の縦横比"
            value={settings.deviceRatio}
            onChange={(v) => update({ deviceRatio: v })}
            size="sm"
            options={[
              { value: 'auto', label: '自動' },
              { value: '9:16', label: '9:16' },
              { value: '9:19.5', label: '9:19.5' },
              { value: '9:20', label: '9:20' },
            ]}
          />
        </div>
        <Row
          icon={<Vibrate size={18} />}
          label="触覚フィードバック"
          description="対応端末のみ"
          right={<Toggle checked={settings.haptics} onChange={(v) => update({ haptics: v })} label="触覚フィードバック" />}
        />
      </Group>

      <Group
        title="1日の区切り"
        footer={`${settings.resetHour}:00 を過ぎるまでは前日として扱われます。`}
      >
        <div className="px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12.5px] font-medium text-subtle">リセット時刻</span>
            <span className="text-[13px] tabular text-subtle">{settings.resetHour}:00</span>
          </div>
          <input
            type="range"
            min={0}
            max={9}
            step={1}
            value={settings.resetHour}
            aria-label="リセット時刻"
            onChange={(e) => update({ resetHour: Number(e.target.value) })}
            className="h-11 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[4px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-[10px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
            style={{ ['--p' as string]: `${(settings.resetHour / 9) * 100}%` }}
          />
        </div>
        <div className="px-4 py-3">
          <div className="mb-2 text-[12.5px] font-medium text-subtle">残ったタスクの扱い</div>
          <Segmented<ResetPolicy>
            label="残ったタスクの扱い"
            value={settings.resetPolicy}
            onChange={(v) => update({ resetPolicy: v })}
            options={[
              { value: 'carry', label: '今日へ移す' },
              { value: 'inbox', label: '受信箱へ' },
              { value: 'keep', label: 'そのまま' },
            ]}
          />
        </div>
      </Group>

      <Group
        title="リマインダー"
        footer="アプリを開いている間だけ通知します。端末を閉じている間の配信はできません。"
      >
        <ReminderRow slot="morning" label="朝のリマインダー" />
        <ReminderRow slot="night" label="夜のリマインダー" />
      </Group>

      <Group title="整理">
        <Row icon={<Wand2 size={18} />} label="今日用に並べ替える" description="期限切れ・重要を上へ" onClick={quickTidy} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<Inbox size={18} />} label="受信箱" onClick={() => openSheet({ type: 'inbox' })} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<Tag size={18} />} label="カテゴリ" onClick={() => openSheet({ type: 'categories' })} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<Layers size={18} />} label="Screen" onClick={() => openSheet({ type: 'screens' })} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<Archive size={18} />} label="アーカイブ" onClick={() => openSheet({ type: 'archive' })} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<Trash2 size={18} />} label="ゴミ箱" description="30日後に自動削除" onClick={() => openSheet({ type: 'trash' })} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<RotateCcw size={18} />} label="履歴" onClick={() => openSheet({ type: 'history' })} right={<ChevronRight size={17} className="text-faint" />} />
      </Group>

      <Group title="データ" footer="データはこの端末の中だけに保存されます。外部に送信されることはありません。">
        <Row icon={<Download size={18} />} label="バックアップを書き出す" onClick={busy ? undefined : onExport} right={<ChevronRight size={17} className="text-faint" />} />
        <Row icon={<Upload size={18} />} label="バックアップを読み込む" onClick={busy ? undefined : () => fileRef.current?.click()} right={<ChevronRight size={17} className="text-faint" />} />
        <Row
          icon={<Trash2 size={18} />}
          label="すべてのデータを削除"
          danger
          onClick={() => {
            if (confirm('すべてのデータを削除します。元に戻せません。よろしいですか？')) void wipeAll();
          }}
        />
      </Group>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
        }}
      />

      <div className="flex items-center justify-center gap-2 pb-10 pt-2 text-[11.5px] text-faint">
        <Moon size={13} aria-hidden />
        Screen Memo — オフラインで動作します
      </div>

      <Button
        variant="ghost"
        block
        className="mb-10"
        onClick={() => update({ onboarded: false, screenshotGuideSeen: false })}
      >
        使い方をもう一度見る
      </Button>
    </div>
  );
}

function ReminderRow({ slot, label }: { slot: 'morning' | 'night'; label: string }) {
  const key = slot === 'morning' ? 'morningReminder' : 'nightReminder';
  const value = useData((s) => s.settings[key]);
  const update = useData((s) => s.updateSettings);
  const showToast = useUI((s) => s.showToast);

  const setTime = async (v: string) => {
    if (!v) {
      update({ [key]: undefined });
      return;
    }
    if (!(await requestNotificationPermission())) {
      showToast('通知が許可されていません');
      return;
    }
    update({ [key]: v });
  };

  return (
    <Row
      icon={slot === 'morning' ? <Sunrise size={18} /> : <Moon size={18} />}
      label={label}
      description={value ? `${value} に通知` : '未設定'}
      right={
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={value ?? ''}
            aria-label={label}
            disabled={!notificationsAvailable()}
            onChange={(e) => void setTime(e.target.value)}
            className="h-10 rounded-[12px] bg-elevated px-2.5 text-[14px] tabular outline-none ring-accent/30 focus:ring-2 disabled:opacity-40"
          />
          {value && (
            <IconButton label={`${label} を解除`} size="sm" onClick={() => update({ [key]: undefined })}>
              <X size={16} />
            </IconButton>
          )}
        </div>
      }
    />
  );
}
