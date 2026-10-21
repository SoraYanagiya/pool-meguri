/**
 * カロリー収支の概算
 *
 * 消費 = メッツ × 体重(kg) × 時間(h) × 1.05
 *   メッツ値: 国立健康・栄養研究所「改訂版 身体活動のメッツ（METs）表」
 *   体重: 「日本人の食事摂取基準（2025年版）」の参照体重（年代・性別から選ぶ）
 * 摂取 = プール飯ごとの kcal の合計（定番メニューの目安値、または利用者の入力値）
 *
 * いずれも目安であり、個人の体格や泳ぎ方で大きく変わる。
 */
import type { AgeGroup, Gender, Meal, ProfileAttributes, Stroke } from './types'

export const STROKES: {
  value: Stroke
  label: string
  mets: number
  /** 時間が未入力のとき距離から時間を推定するための標準ペース（m/分） */
  metersPerMinute: number
}[] = [
  // メッツ表「クロール、ふつうの速さ、46m/分未満」。ペースは表の上限付近の45m/分とする
  { value: 'crawl', label: 'クロール（ふつう）', mets: 8.3, metersPerMinute: 45 },
  // メッツ表「クロール、速い、69m/分」
  { value: 'crawl_fast', label: 'クロール（速い）', mets: 10.0, metersPerMinute: 69 },
  // 以下のペースはメッツ表に記載がないため、本アプリでの仮定値
  { value: 'breast', label: '平泳ぎ（ゆっくり）', mets: 5.3, metersPerMinute: 30 },
  { value: 'back', label: '背泳ぎ（ゆっくり）', mets: 4.8, metersPerMinute: 30 },
  { value: 'leisurely', label: 'のんびり泳ぐ', mets: 6.0, metersPerMinute: 30 },
  { value: 'water_walk', label: '水中ウォーキング', mets: 4.5, metersPerMinute: 25 },
  { value: 'aquabics', label: 'アクアビクス', mets: 5.3, metersPerMinute: 25 },
]

export function strokeInfo(s: Stroke | null) {
  return STROKES.find((x) => x.value === s) ?? STROKES.find((x) => x.value === 'leisurely')!
}

/** 参照体重（kg）。日本人の食事摂取基準（2025年版） */
const REF_WEIGHT = {
  '15-17': { male: 59.7, female: 51.9 },
  '18-29': { male: 63.0, female: 51.0 },
  '30-49': { male: 70.0, female: 53.3 },
  '50-64': { male: 69.1, female: 54.0 },
  '65-74': { male: 64.4, female: 52.6 },
  '75+': { male: 61.0, female: 49.3 },
} as const

type Band = keyof typeof REF_WEIGHT

/** 年代を参照体重の年齢区分に対応させる。区分をまたぐ年代は2区分の平均 */
const AGE_TO_BANDS: Record<AgeGroup, Band[]> = {
  '10s': ['15-17'],
  '20s': ['18-29'],
  '30s': ['30-49'],
  '40s': ['30-49'],
  '50s': ['50-64'],
  '60s': ['50-64', '65-74'],
  '70plus': ['65-74', '75+'],
}

function weightFor(bands: Band[], gender: Gender | null): number {
  const values = bands.map((b) => {
    const w = REF_WEIGHT[b]
    if (gender === 'male') return w.male
    if (gender === 'female') return w.female
    return (w.male + w.female) / 2
  })
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** 年代・性別から体重を決める。未回答の項目は成人（30〜49歳）・男女平均で補う */
export function estimateWeightKg(attrs: ProfileAttributes | null): number {
  const bands = attrs?.age_group ? AGE_TO_BANDS[attrs.age_group] : (['30-49'] as Band[])
  return Math.round(weightFor(bands, attrs?.gender ?? null) * 10) / 10
}

export type SwimInput = {
  distanceM: number | null
  minutes: number | null
  stroke: Stroke | null
}

/** 泳いだ時間（分）。未入力なら距離と標準ペースから推定する */
export function swimMinutes(s: SwimInput): number | null {
  if (s.minutes && s.minutes > 0) return s.minutes
  if (s.distanceM && s.distanceM > 0) return s.distanceM / strokeInfo(s.stroke).metersPerMinute
  return null
}

export function estimateBurnedKcal(s: SwimInput, weightKg: number): number | null {
  const min = swimMinutes(s)
  if (min === null) return null
  return Math.round(strokeInfo(s.stroke).mets * weightKg * (min / 60) * 1.05)
}

export function sumIntakeKcal(meals: Meal[]): number | null {
  if (meals.length === 0) return null
  return meals.reduce((a, m) => a + (Number.isFinite(m.kcal) ? m.kcal : 0), 0)
}

/**
 * プール飯の定番メニューと目安エネルギー
 * 出典: 厚生労働省「食事バランスガイド」関連資料（フードガイド（仮称）検討会報告書を基に作成）の料理例
 */
export const MEAL_PRESETS: { name: string; kcal: number }[] = [
  { name: 'カレーライス', kcal: 761 },
  { name: 'ラーメン', kcal: 426 },
  { name: 'カツ丼', kcal: 865 },
  { name: '親子丼', kcal: 511 },
  { name: '天ぷらうどん', kcal: 638 },
  { name: 'ざるそば', kcal: 432 },
  { name: '焼きそば', kcal: 539 },
  { name: '炒飯', kcal: 696 },
  { name: 'ミックスサンドイッチ', kcal: 545 },
  { name: 'ピザトースト', kcal: 335 },
]

export function formatBalance(burned: number | null, intake: number | null): string | null {
  if (burned === null && intake === null) return null
  const b = burned ?? 0
  const i = intake ?? 0
  const diff = i - b
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±'
  return `${sign}${Math.abs(diff).toLocaleString('ja-JP')} kcal`
}
