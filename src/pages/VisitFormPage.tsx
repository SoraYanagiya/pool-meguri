import { Globe, Lock, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorNotice, LoginPrompt, PageLoading } from '../components/common'
import { KcalSummary } from '../components/KcalSummary'
import { createVisit, getPool, getVisit, updateVisit } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  MEAL_PRESETS,
  STROKES,
  estimateBurnedKcal,
  estimateWeightKg,
  sumIntakeKcal,
  swimMinutes,
} from '../lib/calorie'
import { errorMessage } from '../lib/errors'
import { today } from '../lib/fields'
import { useMyData } from '../lib/mydata'
import type { Meal, Stroke, Visibility } from '../lib/types'

type MealRow = { name: string; kcal: string }

/** /pools/:id/log で新規、/visits/:visitId/edit で編集 */
export function VisitFormPage() {
  const { id: poolIdParam, visitId } = useParams()
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const { refresh, attributes } = useMyData()

  const [poolId, setPoolId] = useState(poolIdParam ?? '')
  const [poolName, setPoolName] = useState('')
  const [visitedOn, setVisitedOn] = useState(today())
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [distance, setDistance] = useState('')
  const [minutes, setMinutes] = useState('')
  const [stroke, setStroke] = useState<Stroke>('crawl')
  const [meals, setMeals] = useState<MealRow[]>([])
  const [showCalories, setShowCalories] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        let pid = poolIdParam ?? ''
        if (visitId) {
          const data = await getVisit(visitId)
          if (!data) throw new Error('記録が見つかりません')
          pid = data.pool_id
          if (!active) return
          setVisitedOn(data.visited_on)
          setBody(data.body)
          setVisibility(data.visibility)
          setDistance(data.swim_distance_m?.toString() ?? '')
          setMinutes(data.swim_minutes?.toString() ?? '')
          if (data.stroke) setStroke(data.stroke)
          setMeals(data.meals.map((m) => ({ name: m.name, kcal: String(m.kcal) })))
          setShowCalories(data.show_calories)
        }
        const p = await getPool(pid)
        if (!active) return
        setPoolId(pid)
        setPoolName(p?.name ?? '')
      } catch (e) {
        if (active) setError(errorMessage(e))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [poolIdParam, visitId])

  const weight = estimateWeightKg(attributes)
  const swim = {
    distanceM: distance ? Number(distance) : null,
    minutes: minutes ? Number(minutes) : null,
    stroke,
  }
  const cleanMeals: Meal[] = useMemo(
    () =>
      meals
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim().slice(0, 50), kcal: Math.max(0, Math.round(Number(m.kcal) || 0)) })),
    [meals],
  )
  const burned = estimateBurnedKcal(swim, weight)
  const intake = sumIntakeKcal(cleanMeals)
  const estMinutes = swimMinutes(swim)

  if (authLoading || loading) return <PageLoading />
  if (!session) {
    return (
      <main className="page">
        <LoginPrompt>めぐり記録を書くにはログインしてください。</LoginPrompt>
      </main>
    )
  }

  function setMeal(i: number, patch: Partial<MealRow>) {
    setMeals((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fields = {
      visited_on: visitedOn,
      body: body.trim(),
      visibility,
      swim_distance_m: swim.distanceM,
      swim_minutes: swim.minutes,
      stroke: swim.distanceM || swim.minutes ? stroke : null,
      meals: cleanMeals,
      kcal_burned: burned,
      kcal_intake: intake,
      show_calories: showCalories,
    }
    try {
      if (visitId) await updateVisit(visitId, fields)
      else await createVisit({ pool_id: poolId, ...fields })
      await refresh()
      navigate(`/pools/${poolId}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <h1 className="h-page sign">{visitId ? '記録を編集' : 'めぐり記録を書く'}</h1>
        {poolName && <p style={{ margin: 0, fontWeight: 700 }}>{poolName}</p>}

        <label className="field">
          <span>行った日</span>
          <input type="date" required max={today()} value={visitedOn} onChange={(e) => setVisitedOn(e.target.value)} />
        </label>

        <h2 className="h-section">泳いだ内容</h2>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <label className="field" style={{ flex: 1 }}>
            <span>距離（m）</span>
            <input type="number" inputMode="numeric" min={0} max={100000} step={25} value={distance} onChange={(e) => setDistance(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>時間（分）</span>
            <input type="number" inputMode="numeric" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>主な泳ぎ方</span>
          <select value={stroke} onChange={(e) => setStroke(e.target.value as Stroke)}>
            {STROKES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {!minutes && estMinutes !== null && (
            <small>時間が未入力のため、標準的なペースから約{Math.round(estMinutes)}分として計算します。</small>
          )}
        </label>

        <h2 className="h-section">プール飯</h2>
        {meals.map((m, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <input
              type="text"
              aria-label="メニュー名"
              placeholder="メニュー名"
              maxLength={50}
              value={m.name}
              onChange={(e) => setMeal(i, { name: e.target.value })}
              style={{ flex: 2 }}
            />
            <input
              type="number"
              aria-label="kcal"
              placeholder="kcal"
              inputMode="numeric"
              min={0}
              max={5000}
              value={m.kcal}
              onChange={(e) => setMeal(i, { kcal: e.target.value })}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              className="btn btn-quiet"
              aria-label="このメニューを外す"
              onClick={() => setMeals((rows) => rows.filter((_, j) => j !== i))}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        ))}
        {meals.length < 10 && (
          <>
            <div className="row">
              {MEAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="chip"
                  onClick={() => setMeals((rows) => [...rows, { name: p.name, kcal: String(p.kcal) }])}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-quiet"
              style={{ justifySelf: 'start' }}
              onClick={() => setMeals((rows) => [...rows, { name: '', kcal: '' }])}
            >
              <Plus size={16} aria-hidden />
              メニューを入力
            </button>
          </>
        )}

        <div className="panel stack">
          <KcalSummary burned={burned} intake={intake} balanceLabel="収支" live />
          <p className="small muted" style={{ margin: 0 }}>
            体重{weight}kg（{attributes?.age_group || attributes?.gender ? '年代・性別の平均' : '成人の平均'}
            ）として計算した目安です。
            {!attributes?.age_group && !attributes?.gender && (
              <>
                {' '}
                <Link to="/me/settings">年代・性別を設定</Link>すると、より近い値になります。
              </>
            )}
          </p>
          <label className="row small">
            <input type="checkbox" checked={showCalories} onChange={(e) => setShowCalories(e.target.checked)} />
            記録にカロリー収支を表示する
          </label>
        </div>

        <h2 className="h-section">感想</h2>
        <label className="field">
          <span className="visually-hidden">感想</span>
          <textarea
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="混み具合、水温、プール飯の味など。空欄でも「行った」記録として保存できます。"
          />
          <small>{body.length} / 2000</small>
        </label>

        <div className="field">
          <span>公開範囲</span>
          <div className="segmented" role="group" aria-label="公開範囲">
            <button type="button" aria-pressed={visibility === 'public'} onClick={() => setVisibility('public')}>
              <Globe size={16} aria-hidden /> 公開
            </button>
            <button type="button" aria-pressed={visibility === 'private'} onClick={() => setVisibility('private')}>
              <Lock size={16} aria-hidden /> 自分だけ
            </button>
          </div>
          <small>
            {visibility === 'public'
              ? '施設ページとあなたのページに表示されます。'
              : 'あなた以外には表示されません。制覇数には数えられます。'}
          </small>
        </div>

        {error && <ErrorNotice>保存できませんでした。{error}</ErrorNotice>}
        <div className="row">
          <button type="submit" className="btn btn-rope" disabled={busy || !poolId}>
            {visitId ? '変更を保存' : '記録する'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>
            キャンセル
          </button>
        </div>
      </form>
    </main>
  )
}
