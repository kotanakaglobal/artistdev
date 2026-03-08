# Artist Scout MVP

「これから来そうな音楽アーティスト」を記録し、投票で的中判定して、発掘者ランキングを表示する MVP Web アプリです。

## 技術スタック
- Next.js (App Router)
- TypeScript
- Supabase (Auth + Postgres)
- Vercel デプロイ想定

## 実装済み MVP 機能
1. 記録機能（投稿）
2. 投票機能（👍 バズった / 👎 バズってない、1ユーザー1投稿1票）
3. トップ画面と自分の投稿画面での投票サマリー表示
4. 発掘者ランキング
5. ポイント付与（既存ロジック: 的中時 100pt）
6. 表示名変更（プロフィール設定）

## 画面一覧
- `/` トップ画面（サービス説明、最近投稿、投票UI、導線）
- `/login` メールログイン画面（メール+パスワード）
- `/submit` 投稿画面（artist_name / artist_link）
- `/my-predictions` 自分の投稿一覧
- `/ranking` ランキング画面
- `/settings` プロフィール設定（display_name 更新）
- `/admin` 管理画面（admin 権限のみ）

## 必要環境
- Node.js 18.18 以上（推奨: 20 以上）
- npm 9 以上
- Supabase アカウント
- Vercel アカウント（デプロイする場合）

## インストール方法
```bash
npm install
```

## Supabase プロジェクト作成方法
1. Supabase ダッシュボードで新規プロジェクト作成。
2. `Authentication > Providers` で Email を有効化。
3. `SQL Editor` を開く。
4. `supabase/schema.sql` を全文実行してテーブル・RLS・トリガーを作成。

## 必要な環境変数
`.env.local` を作成し、以下を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`.env.example` も同梱しています。

## ローカル起動方法
```bash
npm run dev
```

起動後 `http://localhost:3000` を開いて動作確認してください。

## Vercel デプロイ方法
1. GitHub に push。
2. Vercel で本リポジトリを import。
3. Project Settings > Environment Variables に以下を設定。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy を実行。

## 管理者ユーザーの作り方
1. 通常ユーザーとしてサインアップ（`/login`）
2. Supabase SQL Editor で次を実行（UUID は対象ユーザーの ID に置換）:

```sql
update public.profiles
set role = 'admin'
where id = 'USER_UUID_HERE';
```

## DB テーブル作成 SQL
- `supabase/schema.sql` にすべて記載。
- テーブル:
  - `profiles`
  - `predictions`
  - `point_logs`
  - `prediction_votes`

## 投票ルール
- 1ユーザーは1投稿に1票まで（`unique(prediction_id, user_id)`）
- 既存票がある場合は `insert` ではなく `update` で上書き
- `vote=true` は 👍 バズった、`vote=false` は 👎 バズってない
- 👍 が 10 票以上になると `predictions.result_status = 'hit'`
- それ以外は `predictions.result_status = 'pending'`

## MVP 起動手順（初心者向け）
1. `npm install`
2. Supabase でプロジェクト作成
3. `supabase/schema.sql` を実行
4. `.env.local` を作成して URL / ANON KEY を設定
5. `npm run dev`
6. `/login` でログイン
7. `/submit` で投稿
8. `/` で投票
9. `/settings` で表示名変更
10. `/ranking` でランキング確認

