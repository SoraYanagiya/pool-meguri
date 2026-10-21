export type Visibility = 'public' | 'private'
export type PoolStatus = 'open' | 'temporarily_closed' | 'closed'
/** public: 市民プールなどの公共プール / school: 学校施設の一般開放 */
export type PoolKind = 'public' | 'school'
export type Stroke = 'crawl' | 'crawl_fast' | 'breast' | 'back' | 'leisurely' | 'water_walk' | 'aquabics'

export type Meal = { name: string; kcal: number }

export type Pool = {
  id: string
  name: string
  prefecture: string
  municipality: string
  kind: PoolKind
  status: PoolStatus
  address: string
  lat: number | null
  lng: number | null
  official_url: string | null
  is_indoor: boolean | null
  season_note: string
  opening_hours: string
  closed_days: string
  fee_note: string
  has_25m: boolean | null
  has_50m: boolean | null
  has_kids_pool: boolean | null
  has_diving_pool: boolean | null
  has_water_slide: boolean | null
  has_restaurant: boolean | null
  has_parking: boolean | null
  access_note: string
  note: string
  source_url: string | null
  verified_on: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

/** 編集フォームで扱う項目（サーバー側で決まる列を除く） */
export type PoolInput = Omit<Pool, 'id' | 'created_at' | 'updated_at' | 'updated_by'>

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string
  onboarded_at: string | null
  created_at: string
}

export type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50s' | '60s' | '70plus'
export type Gender = 'female' | 'male' | 'other'

export type ProfileAttributes = {
  age_group: AgeGroup | null
  gender: Gender | null
}

export type Visit = {
  id: string
  user_id: string
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
  created_at: string
  updated_at: string
}

export type VisitWithRelations = Visit & {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  pools: Pick<Pool, 'id' | 'name' | 'prefecture' | 'municipality'> | null
}

export type VisitedSummary = {
  pool_id: string
  visit_count: number
  first_visited_on: string
  last_visited_on: string
}

export type PoolRevision = {
  id: number
  pool_id: string
  edited_by: string | null
  edited_at: string
  before_data: Partial<Pool> | null
  after_data: Partial<Pool>
  profiles: Pick<Profile, 'id' | 'display_name'> | null
}

export type PoolAppearance = {
  id: number
  pool_id: string
  program: string
  season: number | null
  episode: number | null
  aired_on: string | null
  note: string
  source_url: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}
