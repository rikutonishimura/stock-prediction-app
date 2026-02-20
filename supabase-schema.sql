-- Supabase データベーススキーマ
-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください

-- 1. プロフィールテーブル
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 予想データテーブル
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  nikkei_previous_close numeric,
  nikkei_predicted_change numeric,
  nikkei_actual_change numeric,
  nikkei_deviation numeric,
  sp500_previous_close numeric,
  sp500_predicted_change numeric,
  sp500_actual_change numeric,
  sp500_deviation numeric,
  gold_previous_close numeric,
  gold_predicted_change numeric,
  gold_actual_change numeric,
  gold_deviation numeric,
  bitcoin_previous_close numeric,
  bitcoin_predicted_change numeric,
  bitcoin_actual_change numeric,
  bitcoin_deviation numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  confirmed_at timestamp with time zone,

  -- 同じユーザーが同じ日に複数の予想を作成できないようにする
  unique(user_id, date)
);

-- 7. Gold/Bitcoinカラム追加マイグレーション（既存テーブルに対して実行）
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS gold_previous_close numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS gold_predicted_change numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS gold_actual_change numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS gold_deviation numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS bitcoin_previous_close numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS bitcoin_predicted_change numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS bitcoin_actual_change numeric;
-- ALTER TABLE predictions ADD COLUMN IF NOT EXISTS bitcoin_deviation numeric;

-- 3. Row Level Security (RLS) を有効化
alter table profiles enable row level security;
alter table predictions enable row level security;

-- 4. プロフィールのRLSポリシー
-- 自分のプロフィールのみ参照可能
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- 自分のプロフィールのみ作成可能
create policy "Users can create own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- 自分のプロフィールのみ更新可能
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- 5. 予想データのRLSポリシー
-- 自分の予想のみ参照可能
create policy "Users can view own predictions"
  on predictions for select
  using (auth.uid() = user_id);

-- 自分の予想のみ作成可能
create policy "Users can create own predictions"
  on predictions for insert
  with check (auth.uid() = user_id);

-- 自分の予想のみ更新可能
create policy "Users can update own predictions"
  on predictions for update
  using (auth.uid() = user_id);

-- 自分の予想のみ削除可能
create policy "Users can delete own predictions"
  on predictions for delete
  using (auth.uid() = user_id);

-- 6. インデックス（検索パフォーマンス向上）
create index if not exists predictions_user_id_idx on predictions(user_id);
create index if not exists predictions_date_idx on predictions(date);
create index if not exists predictions_user_date_idx on predictions(user_id, date);

-- 8. ニュースAI分析キャッシュテーブル
create table if not exists news_analysis_cache (
  id uuid primary key default gen_random_uuid(),
  analysis_data jsonb not null,
  checkpoint text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLSを無効にする（サーバーサイドのみアクセス、service_role使用）
-- alter table news_analysis_cache enable row level security;
