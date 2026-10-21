# プールめぐり

公営プールをめぐって記録するウェブアプリです。行った施設が都道府県ごとのタイルとして埋まっていき、制覇状況を確認できます。

## 主な機能

- 施設ページ: 住所・営業時間・料金と、25m／50m／幼児用プール・スライダー・レストラン・駐車場の有無を表示。ログインユーザーが情報を修正でき、編集履歴から取り消せます
- 番組登場情報: 『ロバート秋山の市民プール万歳』などに登場した回（シーズン・話数・放送日）を施設ごとに登録
- めぐり記録: 行った日、泳いだ距離・時間・泳ぎ方、プール飯、感想を記録。公開／自分だけを選べます
- カロリー収支: 消費（泳ぎ）と摂取（プール飯）の目安を記録ごとと累計で表示
- 気になる: 行きたい施設を保存（本人のみ閲覧）
- 制覇状況: 都道府県ごとのタイル表示と市区町村ごとの達成率。閉館した施設と学校開放のプール（学校施設の一般開放）は母数に含めません
- 年代・性別（任意）: 初回ログイン時に回答。カロリー概算の体重に使い、本人以外は閲覧できません

## カロリー概算の方法

- 消費 = メッツ × 体重(kg) × 時間(h) × 1.05
  - メッツ値は国立健康・栄養研究所「改訂版 身体活動のメッツ（METs）表」の水泳・水中運動の値
  - 体重は「日本人の食事摂取基準（2025年版）」の参照体重を年代・性別から選択（未回答は成人・男女平均）
  - 時間が未入力の場合は、距離と泳ぎ方ごとの標準ペースから推定（クロールのペースはメッツ表の速度区分に合わせ、ほかは本アプリでの仮定値）
- 摂取 = プール飯の kcal の合計。定番メニューの値は厚生労働省「食事バランスガイド」関連資料の料理例

いずれも目安です。

## 技術構成

- フロントエンド: Vite + React + TypeScript、React Router、Leaflet（OpenStreetMap タイル）、lucide-react
- バックエンド: Supabase（PostgreSQL、認証、行単位アクセス制御）
- SNS ログイン: Google・GitHub を標準で有効化。`VITE_AUTH_PROVIDERS` で X（twitter / x）、Discord、Apple も切り替え可能

## セットアップ

### 1. 依存パッケージ

```sh
npm install
```

### 2. Supabase

ホスティング版を使う場合:

1. Supabase でプロジェクトを作成
2. SQL エディタで `supabase/migrations/` 内の SQL を実行し、続けて `supabase/seed.sql` を実行
   （Supabase CLI を使う場合は `npx supabase link` の後に `npx supabase db push`）
3. Authentication > Providers で Google と GitHub を有効化し、各サービスで発行した OAuth のクライアント ID とシークレットを登録
   - 各サービス側のコールバック URL は `https://<プロジェクト>.supabase.co/auth/v1/callback`
4. Authentication > URL Configuration の Site URL と Redirect URLs に、公開するサイトの URL（例: `https://example.vercel.app/**`）と `http://localhost:5173/**` を登録

ローカルの Supabase を使う場合（Docker が必要）:

```sh
cp supabase/.env.example supabase/.env   # OAuth の認証情報を記入
npx supabase start                       # マイグレーションと seed.sql が適用される
```

### 3. 環境変数

```sh
cp .env.example .env
```

`VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` に、Supabase の Project Settings > API Keys の値を設定します。

### 4. 起動

```sh
npm run dev
```

## 施設データの追加

初期データは `data/pools.json` で管理しています。編集後に次のコマンドで `supabase/seed.sql` を生成し直します。

```sh
npm run seed:build
```

公開後は、ログインユーザーが画面から施設を追加・修正できます。施設の削除と、通報された記録の確認は Supabase のダッシュボードから行います。

## デプロイ

`npm run build` の出力（`dist/`）を静的ホスティングに配置します。画面遷移のため、すべてのパスを `index.html` に転送する設定が必要です（Vercel 用の `vercel.json` と Cloudflare Pages 用の `public/_redirects` を同梱）。
