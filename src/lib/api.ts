import { supabase } from './supabase'
import type {
  Pool,
  PoolAppearance,
  PoolInput,
  PoolRevision,
  Profile,
  ProfileAttributes,
  Meal,
  Stroke,
  Visibility,
  Visit,
  VisitedSummary,
  VisitWithRelations,
} from './types'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

const VISIT_SELECT =
  '*, profiles:user_id (id, display_name, avatar_url), pools:pool_id (id, name, prefecture, municipality)'

// ---- 施設 ----------------------------------------------------------------

export async function listPools(): Promise<Pool[]> {
  // 全国分を想定し、1回の上限（1000件）を超える場合は分割して取得する
  const all: Pool[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const page = check(
      await supabase
        .from('pools')
        .select('*')
        .order('prefecture')
        .order('municipality')
        .order('name')
        .range(from, from + size - 1),
    ) as Pool[]
    all.push(...page)
    if (page.length < size) return all
  }
}

export async function getPool(id: string): Promise<Pool | null> {
  return check(await supabase.from('pools').select('*').eq('id', id).maybeSingle())
}

export async function createPool(input: PoolInput): Promise<Pool> {
  return check(await supabase.from('pools').insert(input).select('*').single())
}

export async function updatePool(id: string, input: PoolInput): Promise<Pool> {
  return check(await supabase.from('pools').update(input).eq('id', id).select('*').single())
}

export async function listPoolRevisions(poolId: string): Promise<PoolRevision[]> {
  return check(
    await supabase
      .from('pool_revisions')
      .select('*, profiles:edited_by (id, display_name)')
      .eq('pool_id', poolId)
      .order('edited_at', { ascending: false })
      .limit(50),
  )
}

export async function revertPoolRevision(revisionId: number): Promise<void> {
  check(await supabase.rpc('revert_pool_revision', { revision_id: revisionId }))
}

export async function getPublicVisitCounts(): Promise<Map<string, number>> {
  const rows = check(
    await supabase.from('pool_public_stats').select('pool_id, public_visit_count'),
  ) as { pool_id: string; public_visit_count: number }[]
  return new Map(rows.map((r) => [r.pool_id, r.public_visit_count]))
}

// ---- 番組登場情報 --------------------------------------------------------

export async function listAppearances(poolId: string): Promise<PoolAppearance[]> {
  return check(
    await supabase
      .from('pool_appearances')
      .select('*')
      .eq('pool_id', poolId)
      .order('season', { nullsFirst: false })
      .order('episode', { nullsFirst: false }),
  )
}

/** 番組に登場した施設IDの一覧（一覧画面の絞り込み用） */
export async function listAppearedPoolIds(): Promise<Set<string>> {
  const rows = check(await supabase.from('pool_appearances').select('pool_id')) as { pool_id: string }[]
  return new Set(rows.map((r) => r.pool_id))
}

export type AppearanceInput = Pick<
  PoolAppearance,
  'pool_id' | 'program' | 'season' | 'episode' | 'aired_on' | 'note' | 'source_url'
>

export async function saveAppearance(id: number | null, input: AppearanceInput): Promise<void> {
  const res = id
    ? await supabase.from('pool_appearances').update(input).eq('id', id)
    : await supabase.from('pool_appearances').insert(input)
  if (res.error?.code === '23505') throw new Error('同じ回がすでに登録されています')
  check(res)
}

export async function deleteAppearance(id: number): Promise<void> {
  check(await supabase.from('pool_appearances').delete().eq('id', id))
}

// ---- めぐり記録 ----------------------------------------------------------

export async function listVisitsForPool(poolId: string): Promise<VisitWithRelations[]> {
  // RLS により、他人の記録は公開分のみ、自分の記録は非公開分も返る
  return check(
    await supabase
      .from('visits')
      .select(VISIT_SELECT)
      .eq('pool_id', poolId)
      .order('visited_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  )
}

export async function listVisitsByUser(userId: string): Promise<VisitWithRelations[]> {
  return check(
    await supabase
      .from('visits')
      .select(VISIT_SELECT)
      .eq('user_id', userId)
      .order('visited_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
  )
}

export async function listRecentPublicVisits(): Promise<VisitWithRelations[]> {
  return check(
    await supabase
      .from('visits')
      .select(VISIT_SELECT)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(30),
  )
}

export type VisitInput = {
  pool_id: string
  visited_on: string
  body: string
  visibility: Visibility
  swim_distance_m: number | null
  swim_minutes: number | null
  stroke: Stroke | null
  meals: Meal[]
  kcal_burned: number | null
  kcal_intake: number | null
  show_calories: boolean
}

export async function createVisit(input: VisitInput): Promise<Visit> {
  return check(await supabase.from('visits').insert(input).select('*').single())
}

export async function updateVisit(id: string, input: Omit<VisitInput, 'pool_id'>): Promise<Visit> {
  return check(await supabase.from('visits').update(input).eq('id', id).select('*').single())
}

export async function deleteVisit(id: string): Promise<void> {
  check(await supabase.from('visits').delete().eq('id', id))
}

export async function reportVisit(visitId: string, reason: string): Promise<void> {
  const res = await supabase.from('visit_reports').insert({ visit_id: visitId, reason })
  if (res.error?.code === '23505') throw new Error('この記録はすでに通報済みです')
  check(res)
}

export async function listMyVisited(): Promise<VisitedSummary[]> {
  return check(await supabase.from('my_visited_pools').select('*'))
}

// ---- 気になる ------------------------------------------------------------

export async function listMyWishes(): Promise<string[]> {
  const rows = check(await supabase.from('wishes').select('pool_id')) as { pool_id: string }[]
  return rows.map((r) => r.pool_id)
}

export async function addWish(poolId: string): Promise<void> {
  check(await supabase.from('wishes').insert({ pool_id: poolId }))
}

export async function removeWish(poolId: string, userId: string): Promise<void> {
  check(await supabase.from('wishes').delete().eq('pool_id', poolId).eq('user_id', userId))
}

// ---- プロフィール --------------------------------------------------------

export async function getProfile(id: string): Promise<Profile | null> {
  return check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle())
}

export async function updateProfile(
  id: string,
  input: Pick<Profile, 'display_name' | 'bio'>,
): Promise<Profile> {
  return check(await supabase.from('profiles').update(input).eq('id', id).select('*').single())
}

export async function markOnboarded(id: string): Promise<void> {
  check(
    await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', id),
  )
}

// ---- 任意回答の属性（本人のみ） ------------------------------------------

export async function getMyAttributes(): Promise<ProfileAttributes | null> {
  return check(
    await supabase.from('profile_attributes').select('age_group, gender').maybeSingle(),
  )
}

export async function saveMyAttributes(userId: string, input: ProfileAttributes): Promise<void> {
  check(
    await supabase
      .from('profile_attributes')
      .upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() }),
  )
}

export async function deleteMyAttributes(userId: string): Promise<void> {
  check(await supabase.from('profile_attributes').delete().eq('user_id', userId))
}
