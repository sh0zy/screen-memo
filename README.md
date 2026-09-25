# Screen Memo

今日やることを1画面にまとめて、スクリーンショットでロック画面の壁紙にするための PWA。
データはすべて端末内（IndexedDB / localStorage）に保存され、外部には送信されません。

**公開URL: https://sh0zy.github.io/screen-memo/**

スマホのブラウザで開き、「ホーム画面に追加」するとアプリとして使えます（オフライン動作）。

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 型チェック + 本番ビルド
npm run lint     # oxlint
npm run preview  # ビルド結果の確認
npm run deploy   # ビルドして gh-pages ブランチへ公開
```

## デプロイ

GitHub Pages の `gh-pages` ブランチ配信。`npm run deploy` を実行すると、
ビルド結果が `gh-pages` ブランチに push され数十秒で反映されます。

サブパス配信のため `vite.config.ts` の `base` を `/screen-memo/` にしています。
独自ドメインや別のリポジトリ名に移すときは、環境変数で上書きできます。

```bash
VITE_BASE=/ npm run build
```

## 構成

```
src/
  App.tsx              アプリのシェル（タブ切り替え・日付またぎ・各ホストの配置）
  main.tsx             エントリポイント
  index.css            Tailwind + CSS変数によるテーマ土台

  screens/             ボトムナビの5タブ
    Today.tsx          その日の編集画面。Screen の各セクションを編集欄として並べる
    Tasks.tsx          期限バケット別のタスク一覧
    Notes.tsx          メモ / チェックリスト
    Templates.tsx      テンプレート・My Template・デザイン入口
    Settings.tsx       外観・1日の区切り・整理・バックアップ

  sheets/              ボトムシート群（index.tsx がルーター）
    TaskSheet / NoteSheet / SmallSheets / DesignSheet /
    SectionsSheet / ScreensSheet / ListSheets / ActionSheets

  components/          画面をまたいで使う部品
    ui/index.tsx       Sheet・Button・Segmented などの UI キット
    TaskItem / Checkbox / QuickAddInput / SortableList
    BottomNav / Fab / ToastHost / PreviewOverlay / Onboarding
    useGestures.ts     スワイプ + 長押しを1つのポインタ処理で扱う
    useAutosave.ts     入力が止まってから遅延保存する

  store/
    data.ts            ドメイン状態と永続化（zustand + Dexie）
    ui.ts              タブ・シートスタック・プレビュー・トースト

  wallpaper/           壁紙そのものの描画系
    model.ts           表示データの組み立て（優先度・伏せ字・件数の間引き）
    WallpaperCanvas.tsx 実際の描画。入りきらなければ密度を段階的に下げる
    ScaledCanvas.tsx   論理幅390pxで描いて親幅に縮小するサムネイル
    templates.ts       組み込みテンプレート・アプリテーマ・配色

  lib/                 date / logic / icons / haptics / quickParse / theme / id
  db/                  Dexie スキーマとファクトリ
  types/index.ts       ドメイン型の定義
```

## 設計上の約束

- 日付は常にローカル日付の `YYYY-MM-DD` 文字列、時刻は `HH:mm`。タイムスタンプは epoch ms。
- 「今日」は `settings.resetHour` を考慮した**論理上の今日**（`logicalToday`）。深夜作業でも日付が変わらない。
- 削除は即時ではなくゴミ箱（`deletedAt`）で、30日後に自動削除。破壊的操作にはトーストの「取り消す」を用意する。
- 保存は `persist()` 経由。失敗してもUIは進み、トーストで知らせる。
- シート／プレビューは `history.pushState` と対応しており、端末の戻るジェスチャーで閉じられる。
- 壁紙に関わる見た目の設定は `ScreenDoc` に閉じる。Screen ごとに独立して持てる。

## 壁紙の作り方（利用者側の流れ）

1. Today タブで今日の内容を書く
2. プレビューを開く（`明日の分` で翌日分の下書きも確認できる）
3. スクリーンショットを撮る、または `保存` で PNG を書き出す
4. 端末の壁紙に設定する
