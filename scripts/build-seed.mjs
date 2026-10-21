// data/pools*.json から supabase/seed.sql を生成する
// 使い方: npm run seed:build
//   --only <ファイル名>  指定したデータファイルだけを対象にする（本番DBへの追加投入用）
//   --out <パス>         出力先を変える（既定: supabase/seed.sql）
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argValue = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? null : args[i + 1]
}
const only = argValue('--only')
const outPath = argValue('--out') ?? join(root, 'supabase/seed.sql')

const files = readdirSync(join(root, 'data'))
  .filter((f) => /^pools.*\.json$/.test(f))
  .filter((f) => !only || f === only)
  .sort()
if (files.length === 0) throw new Error('対象のデータファイルがありません')

const POOL_COLUMNS = [
  'id', 'name', 'prefecture', 'municipality', 'status', 'address', 'lat', 'lng', 'official_url',
  'is_indoor', 'season_note', 'opening_hours', 'closed_days', 'fee_note',
  'has_25m', 'has_50m', 'has_kids_pool', 'has_diving_pool', 'has_water_slide', 'has_restaurant', 'has_parking',
  'access_note', 'note', 'source_url', 'verified_on',
]
// null を許さず空文字を既定値とする列
const TEXT_DEFAULT_EMPTY = new Set([
  'address', 'season_note', 'opening_hours', 'closed_days', 'fee_note', 'access_note', 'note',
])
const REQUIRED = ['id', 'name', 'prefecture', 'municipality']

function lit(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`数値が不正です: ${v}`)
    return String(v)
  }
  return `'${String(v).replaceAll("'", "''")}'`
}

const ids = new Set()
const nameKeys = new Set()
const poolRows = []
const appRows = []

for (const file of files) {
  const data = JSON.parse(readFileSync(join(root, 'data', file), 'utf8'))
  for (const p of data.pools) {
    for (const k of REQUIRED) if (!p[k]) throw new Error(`${file}: ${p.name ?? p.id}: ${k} がありません`)
    for (const k of Object.keys(p)) {
      if (!POOL_COLUMNS.includes(k)) throw new Error(`${file}: ${p.name}: 未知の項目 ${k}`)
    }
    if (ids.has(p.id)) throw new Error(`ID が重複しています: ${p.id}`)
    ids.add(p.id)
    const nameKey = `${p.prefecture}|${p.municipality}|${p.name}`
    if (nameKeys.has(nameKey)) throw new Error(`施設名が重複しています: ${nameKey}`)
    nameKeys.add(nameKey)
    const row = { status: 'open', verified_on: data.verified_on, ...p }
    poolRows.push(
      `(${POOL_COLUMNS.map((c) => {
        const v = row[c]
        if ((v === undefined || v === null) && TEXT_DEFAULT_EMPTY.has(c)) return "''"
        return lit(v)
      }).join(', ')})`,
    )
  }
  for (const a of data.appearances ?? []) {
    if (!ids.has(a.pool_id)) throw new Error(`登場情報の施設IDが見つかりません: ${a.pool_id}`)
    appRows.push(
      `(${[a.pool_id, a.season ?? null, a.episode ?? null, a.aired_on ?? null, a.note ?? '', a.source_url ?? null]
        .map(lit)
        .join(', ')})`,
    )
  }
}

let sql = `-- このファイルは scripts/build-seed.mjs が ${files.map((f) => `data/${f}`).join('、')} から生成します。直接編集しないでください。

insert into public.pools (${POOL_COLUMNS.join(', ')}) values
${poolRows.join(',\n')}
on conflict (id) do nothing;
`
if (appRows.length > 0) {
  sql += `
insert into public.pool_appearances (pool_id, season, episode, aired_on, note, source_url) values
${appRows.join(',\n')}
on conflict (pool_id, program, season, episode) do nothing;
`
}

writeFileSync(outPath, sql)
console.log(`${files.join(', ')}: 施設 ${poolRows.length} 件、番組登場 ${appRows.length} 件を ${outPath} に書き出しました`)
