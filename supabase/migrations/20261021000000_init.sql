-- プールめぐり 初期スキーマ
-- 施設（pools）は誰でも閲覧可能、ログインユーザーが編集可能。編集は pool_revisions に自動記録する。
-- めぐり記録（visits）は公開／自分だけを選べる。気になる（wishes）は本人のみ閲覧可能。
-- 番組登場情報（pool_appearances）は施設ごとに複数持てる。


-- ---------------------------------------------------------------------------
-- プロフィール
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'スイマー'
    check (char_length(display_name) between 1 and 30),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 200),
  -- 初回ログイン時の任意アンケートを表示したか（回答の有無ではない）
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- 任意回答の属性（年代・性別）。本人以外は読めない
create type public.age_group as enum ('10s', '20s', '30s', '40s', '50s', '60s', '70plus');
create type public.gender as enum ('female', 'male', 'other');

create table public.profile_attributes (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  age_group public.age_group,
  gender public.gender,
  updated_at timestamptz not null default now()
);

-- 新規ユーザー登録時に SNS の表示名・アイコンからプロフィールを作成する
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      'スイマー'
    ), 30),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 施設
-- 設備の有無は true / false / null（不明）の3値で持つ
-- ---------------------------------------------------------------------------
create type public.pool_status as enum ('open', 'temporarily_closed', 'closed');

create table public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  prefecture text not null check (char_length(prefecture) between 2 and 4),
  municipality text not null check (char_length(municipality) between 1 and 30),
  status public.pool_status not null default 'open',
  address text not null default '' check (char_length(address) <= 200),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  official_url text check (official_url is null or official_url ~ '^https?://'),

  is_indoor boolean,
  season_note text not null default '' check (char_length(season_note) <= 200),
  opening_hours text not null default '' check (char_length(opening_hours) <= 500),
  closed_days text not null default '' check (char_length(closed_days) <= 300),
  fee_note text not null default '' check (char_length(fee_note) <= 500),

  has_25m boolean,
  has_50m boolean,
  has_kids_pool boolean,
  has_diving_pool boolean,
  has_water_slide boolean,
  has_restaurant boolean,
  has_parking boolean,

  access_note text not null default '' check (char_length(access_note) <= 500),

  note text not null default '' check (char_length(note) <= 1000),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  verified_on date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index pools_area_idx on public.pools (prefecture, municipality);

-- ---------------------------------------------------------------------------
-- 施設の編集履歴
-- ---------------------------------------------------------------------------
create table public.pool_revisions (
  id bigint generated always as identity primary key,
  pool_id uuid not null references public.pools (id) on delete cascade,
  edited_by uuid references public.profiles (id) on delete set null,
  edited_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb not null
);

create index pool_revisions_pool_idx on public.pool_revisions (pool_id, edited_at desc);

-- 更新者・更新日時をサーバー側で確定させる（クライアントからの偽装を防ぐ）
create function public.pools_set_updated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger pools_set_updated
  before insert or update on public.pools
  for each row execute function public.pools_set_updated();

create function public.pools_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pool_revisions (pool_id, edited_by, before_data, after_data)
  values (
    new.id,
    auth.uid(),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger pools_record_revision
  after insert or update on public.pools
  for each row execute function public.pools_record_revision();

-- 指定した履歴の「編集前」の状態へ戻す（戻す操作自体も新しい履歴として残る）
-- 列を列挙せず、サーバー側で決まる列以外をすべて戻す
create function public.revert_pool_revision(revision_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  rev public.pool_revisions;
  cols text;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  select * into rev from public.pool_revisions where id = revision_id;
  if rev is null then
    raise exception '履歴が見つかりません';
  end if;
  if rev.before_data is null then
    raise exception '新規登録の履歴は戻せません';
  end if;

  select string_agg(format('%I = r.%I', column_name, column_name), ', ')
    into cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'pools'
     and column_name not in ('id', 'created_at', 'updated_at', 'updated_by');

  execute format(
    'update public.pools p set %s from jsonb_populate_record(null::public.pools, $1) r where p.id = $2',
    cols
  ) using rev.before_data, rev.pool_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 番組登場情報（例: 『ロバート秋山の市民プール万歳』SEASON3 第7話）
-- ---------------------------------------------------------------------------
create table public.pool_appearances (
  id bigint generated always as identity primary key,
  pool_id uuid not null references public.pools (id) on delete cascade,
  program text not null default 'ロバート秋山の市民プール万歳'
    check (char_length(program) between 1 and 100),
  season smallint check (season between 1 and 99),
  episode smallint check (episode between 1 and 999),
  aired_on date,
  note text not null default '' check (char_length(note) <= 300),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, program, season, episode)
);

create index pool_appearances_pool_idx on public.pool_appearances (pool_id);

create function public.appearances_set_updated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger appearances_set_updated
  before insert or update on public.pool_appearances
  for each row execute function public.appearances_set_updated();

-- ---------------------------------------------------------------------------
-- めぐり記録（訪問の記録と投稿）
-- 本文が空でも「行った」記録として扱う
-- ---------------------------------------------------------------------------
create type public.visibility as enum ('public', 'private');

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  pool_id uuid not null references public.pools (id) on delete cascade,
  visited_on date not null default current_date,
  body text not null default '' check (char_length(body) <= 2000),
  visibility public.visibility not null default 'public',

  -- 泳いだ内容とプール飯。カロリーは保存時に端末側で概算した値を持つ
  swim_distance_m integer check (swim_distance_m between 0 and 100000),
  swim_minutes integer check (swim_minutes between 1 and 1440),
  stroke text check (stroke in (
    'crawl', 'crawl_fast', 'breast', 'back', 'leisurely', 'water_walk', 'aquabics'
  )),
  meals jsonb not null default '[]'
    check (jsonb_typeof(meals) = 'array' and jsonb_array_length(meals) <= 10),
  kcal_burned integer check (kcal_burned between 0 and 20000),
  kcal_intake integer check (kcal_intake between 0 and 20000),
  show_calories boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visits_pool_idx on public.visits (pool_id, visited_on desc);
create index visits_user_idx on public.visits (user_id, visited_on desc);

create function public.visits_set_updated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger visits_set_updated
  before update on public.visits
  for each row execute function public.visits_set_updated();

-- ---------------------------------------------------------------------------
-- 気になる（行きたい施設の保存）
-- ---------------------------------------------------------------------------
create table public.wishes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  pool_id uuid not null references public.pools (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pool_id)
);

-- ---------------------------------------------------------------------------
-- 通報（公開投稿への不適切報告）。閲覧は管理者のみ（ダッシュボードから確認）
-- ---------------------------------------------------------------------------
create table public.visit_reports (
  id bigint generated always as identity primary key,
  visit_id uuid not null references public.visits (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (visit_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- 行単位アクセス制御
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pools enable row level security;
alter table public.pool_revisions enable row level security;
alter table public.visits enable row level security;
alter table public.wishes enable row level security;
alter table public.visit_reports enable row level security;
alter table public.profile_attributes enable row level security;
alter table public.pool_appearances enable row level security;

create policy "pool_appearances: 誰でも閲覧" on public.pool_appearances
  for select using (true);
create policy "pool_appearances: ログインユーザーが追加" on public.pool_appearances
  for insert to authenticated with check (true);
create policy "pool_appearances: ログインユーザーが更新" on public.pool_appearances
  for update to authenticated using (true) with check (true);
create policy "pool_appearances: 登録者が削除" on public.pool_appearances
  for delete to authenticated using (created_by = (select auth.uid()));

create policy "profile_attributes: 本人のみ閲覧" on public.profile_attributes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profile_attributes: 本人が追加" on public.profile_attributes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profile_attributes: 本人が更新" on public.profile_attributes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profile_attributes: 本人が削除" on public.profile_attributes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "profiles: 誰でも閲覧" on public.profiles
  for select using (true);
create policy "profiles: 本人のみ更新" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "pools: 誰でも閲覧" on public.pools
  for select using (true);
create policy "pools: ログインユーザーが追加" on public.pools
  for insert to authenticated with check (true);
create policy "pools: ログインユーザーが更新" on public.pools
  for update to authenticated using (true) with check (true);
-- 削除ポリシーは作らない（削除は管理者がダッシュボードから行う）

create policy "pool_revisions: 誰でも閲覧" on public.pool_revisions
  for select using (true);
-- 書き込みはトリガー（security definer）経由のみ

create policy "visits: 公開投稿または本人の投稿を閲覧" on public.visits
  for select using (visibility = 'public' or user_id = (select auth.uid()));
create policy "visits: 本人が追加" on public.visits
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "visits: 本人が更新" on public.visits
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "visits: 本人が削除" on public.visits
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "wishes: 本人のみ閲覧" on public.wishes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "wishes: 本人が追加" on public.wishes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wishes: 本人が削除" on public.wishes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "visit_reports: 公開投稿を本人名義で通報" on public.visit_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1 from public.visits v
      where v.id = visit_id and v.visibility = 'public'
    )
  );

-- ---------------------------------------------------------------------------
-- 制覇状況の集計（本人の記録は非公開分も含めて数える）
-- ---------------------------------------------------------------------------
create view public.my_visited_pools
with (security_invoker = true)
as
select
  v.pool_id,
  count(*)::int as visit_count,
  min(v.visited_on) as first_visited_on,
  max(v.visited_on) as last_visited_on
from public.visits v
where v.user_id = (select auth.uid())
group by v.pool_id;

-- 公開記録の件数（施設一覧での表示用）
create view public.pool_public_stats
with (security_invoker = true)
as
select
  p.id as pool_id,
  count(v.id) filter (where v.visibility = 'public')::int as public_visit_count
from public.pools p
left join public.visits v on v.pool_id = p.id
group by p.id;

grant select on public.my_visited_pools to authenticated;
grant select on public.pool_public_stats to anon, authenticated;
grant execute on function public.revert_pool_revision(bigint) to authenticated;
