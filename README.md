# Battle Tree Canvas

競技ポケモン向けの **ツリー式 対戦シミュレート用メモアプリ**（Pokémon Champions Regulation M-A／シングル・ダブル対応）。

対戦分岐をターンごとのツリーとして整理し、各分岐に **自分/相手の行動・ダメージ計算結果・HP変化・盤面状態・勝ち筋/負け筋ラベル・メガ着地候補・崩壊ポイント・メモ** を記録できます。

> このプロダクトでは **AIによる分析・最善手提案・自動レビュー・自動勝率計算は一切行いません。**
> ユーザー自身が考えた対戦分岐を、見やすく記録・比較・共有するためのキャンバスです。

## 主な機能（MVP）

- **プロジェクト作成** — 検討単位ごとに作成。シングル / ダブルを選択
- **構築入力** — 自分・相手の6体（ポケモン名・持ち物・特性・技・各種メモ・メガ候補フラグ・メガ運用分類）
- **世界線ツリー** — ターンノードを親子関係でつなぐ分岐ツリー。追加・複製・削除
- **ノード色分け** — 緑 / 黄 / 赤 / 青 / 紫 / 灰
- **勝ち筋ラベル** — 主線 / 副線 / 非常線 / 負け筋 / 確認分岐 / メガ着地候補 / 崩壊ポイント / 保留
- **盤面表示** — HP%バー・状態異常・天候・フィールド・追い風・トリル・壁・設置
- **ダメージメモ** — 外部ダメ計の結果を手入力（攻撃側→防御側・技・最小/最大/想定%・備考）
- **メガ着地チェック** — Regulation M-A 向け専用チェック（着地前/着地ターン/着地後、ダブル専用項目あり）
- **ルート評価** — メガ依存度・非メガ自立性・第2軸・メガ不選出時の勝ち筋・崩壊理由
- **ルート比較** — 末端ルートを横並びで一覧。崩壊ポイント/メガ着地候補/負け筋の集計
- **ローカル保存** — ブラウザの localStorage に自動保存
- **JSON エクスポート / インポート**
- **共有URL** — プロジェクト内容をURLに埋め込み、読み取り専用ビューで共有（複製可）

## 技術スタック

- [Next.js 15](https://nextjs.org/)（App Router, 静的書き出し `output: export`）
- TypeScript
- Tailwind CSS v4
- 状態は完全クライアントサイド（バックエンドなし / localStorage 保存）

## 開発

```bash
npm install
npm run dev      # http://localhost:3000
```

### 本番ビルド（静的書き出し）

```bash
npm run build    # out/ に静的ファイルを生成
```

`out/` を任意の静的ホスティング（Vercel / GitHub Pages / Netlify など）へ配置できます。

GitHub Pages のようにサブパスで配信する場合は、ビルド時に環境変数を設定します。

```bash
NEXT_PUBLIC_BASE_PATH=/Battle-Tree-Canvas npm run build
```

## データ構造

主要な型は [`lib/types.ts`](lib/types.ts) に定義されています（企画書 第11章に準拠）。
エクスポートされる JSON はこの `ReviewProject` 型そのものです。

## プロジェクト構成

```
app/
  page.tsx            ダッシュボード（プロジェクト一覧・作成・インポート）
  project/page.tsx    プロジェクト編集（概要・構築 / ツリー編集 / ルート比較）
  share/page.tsx      共有ビュー（読み取り専用）
components/
  ui.tsx, Modal.tsx, TopBar.tsx
  editor/             エディタ各カラム（TreeView / BoardEditor / NodeDetail ほか）
lib/
  types.ts            データ型定義
  constants.ts        ラベル・色・選択肢メタデータ
  factory.ts          エンティティ生成・ID採番
  storage.ts          localStorage 永続化
  tree.ts             ツリー操作（純粋関数）
  share.ts            共有URLエンコード/デコード
  io.ts               JSON エクスポート/インポート
```

## 方針（やらないこと）

AI分析 / AI最善手提案 / AI構築診断 / 自動勝率計算 / 完全自動ダメージ計算 は **行いません**。
本アプリは「ユーザーが考えた対戦分岐をツリー状に整理する、ポケモン対戦専用の高機能メモアプリ」です。

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
