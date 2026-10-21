import {
  Baby,
  CarFront,
  Ruler,
  Utensils,
  Waves,
  Spline,
  ArrowDownToLine,
  type LucideIcon,
} from 'lucide-react'
import type { AgeGroup, Gender, Pool, PoolKind, PoolStatus } from './types'

export type FacilityKey =
  | 'has_25m'
  | 'has_50m'
  | 'has_kids_pool'
  | 'has_diving_pool'
  | 'has_water_slide'
  | 'has_restaurant'
  | 'has_parking'

export const FACILITIES: { key: FacilityKey; label: string; icon: LucideIcon }[] = [
  { key: 'has_25m', label: '25mプール', icon: Ruler },
  { key: 'has_50m', label: '50mプール', icon: Waves },
  { key: 'has_kids_pool', label: '幼児用プール', icon: Baby },
  { key: 'has_diving_pool', label: '飛び込みプール', icon: ArrowDownToLine },
  { key: 'has_water_slide', label: 'スライダー', icon: Spline },
  { key: 'has_restaurant', label: 'レストラン', icon: Utensils },
  { key: 'has_parking', label: '駐車場', icon: CarFront },
]

export function triState(v: boolean | null): 'yes' | 'no' | 'unknown' {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return 'unknown'
}

export function indoorLabel(p: Pick<Pool, 'is_indoor'>): string {
  if (p.is_indoor === true) return '屋内'
  if (p.is_indoor === false) return '屋外'
  return '屋内外不明'
}

export const STATUS_LABEL: Record<PoolStatus, string> = {
  open: '営業中',
  temporarily_closed: '休館中',
  closed: '閉館',
}

export const KIND_LABEL: Record<PoolKind, string> = {
  public: '市民プール',
  school: '学校開放',
}

/** 制覇の母数に含めるか（閉館した施設と学校開放は含めない） */
export function countsForCompletion(p: Pick<Pool, 'status' | 'kind'>): boolean {
  return p.status !== 'closed' && p.kind !== 'school'
}

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const

function prefectureOrder(p: string): number {
  const i = (PREFECTURES as readonly string[]).indexOf(p)
  return i === -1 ? 999 : i
}

/** 都道府県名を重複なく、北から順に並べる */
export function sortPrefectures(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) => prefectureOrder(a) - prefectureOrder(b))
}

export function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: '10s', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50s', label: '50代' },
  { value: '60s', label: '60代' },
  { value: '70plus', label: '70代以上' },
]

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'other', label: 'その他' },
]

export function episodeLabel(a: { season: number | null; episode: number | null }): string {
  const parts = []
  if (a.season) parts.push(`SEASON${a.season}`)
  if (a.episode) parts.push(`第${a.episode}話`)
  return parts.join(' ') || '回不明'
}
