-- 施設の種別: 市民プールなどの公共プール (public) と、学校施設の一般開放 (school)
-- 学校開放は利用できる曜日・時間帯が限られるため、検索や制覇の母数で区別する
create type public.pool_kind as enum ('public', 'school');

alter table public.pools
  add column kind public.pool_kind not null default 'public';

-- 種別を追加する前の履歴には kind が含まれないため、
-- 履歴に記録されている列だけを戻す（記録のない列は null にせず現在の値を保つ）
create or replace function public.revert_pool_revision(revision_id bigint)
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
     and column_name not in ('id', 'created_at', 'updated_at', 'updated_by')
     and rev.before_data ? column_name;

  if cols is null then
    raise exception '戻せる項目がありません';
  end if;

  execute format(
    'update public.pools p set %s from jsonb_populate_record(null::public.pools, $1) r where p.id = $2',
    cols
  ) using rev.before_data, rev.pool_id;
end;
$$;
