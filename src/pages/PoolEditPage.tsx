import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorNotice, Loading, LoginPrompt } from '../components/common'
import { createPool, getPool, updatePool } from '../lib/api'
import { useAuth } from '../lib/auth'
import { FACILITIES, PREFECTURES, STATUS_LABEL, type FacilityKey } from '../lib/fields'
import { useMyData } from '../lib/mydata'
import type { Pool, PoolInput, PoolStatus } from '../lib/types'

const EMPTY: PoolInput = {
  name: '',
  prefecture: '',
  municipality: '',
  status: 'open',
  address: '',
  lat: null,
  lng: null,
  official_url: null,
  is_indoor: null,
  season_note: '',
  opening_hours: '',
  closed_days: '',
  fee_note: '',
  has_25m: null,
  has_50m: null,
  has_kids_pool: null,
  has_diving_pool: null,
  has_water_slide: null,
  has_restaurant: null,
  has_parking: null,
  access_note: '',
  note: '',
  source_url: null,
  verified_on: null,
}

function toInput(p: Pool): PoolInput {
  const out = { ...EMPTY }
  for (const k of Object.keys(EMPTY) as (keyof PoolInput)[]) {
    ;(out as Record<string, unknown>)[k] = p[k]
  }
  return out
}

function TriSelect({
  value,
  onChange,
  yes = 'あり',
  no = 'なし',
}: {
  value: boolean | null
  onChange: (v: boolean | null) => void
  yes?: string
  no?: string
}) {
  const options: [boolean | null, string][] = [
    [true, yes],
    [false, no],
    [null, '不明'],
  ]
  return (
    <div className="segmented" role="group">
      {options.map(([v, label]) => (
        <button key={label} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function PoolEditPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const { refresh } = useMyData()
  const [form, setForm] = useState<PoolInput>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    getPool(id)
      .then((p) => {
        if (p) setForm(toInput(p))
        else setLoadError(new Error('施設が見つかりません'))
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }, [id])

  if (authLoading || loading) return <main className="page"><Loading /></main>
  if (!session) {
    return (
      <main className="page">
        <LoginPrompt>施設の情報を追加・修正するにはログインしてください。</LoginPrompt>
      </main>
    )
  }
  if (loadError) return <main className="page"><ErrorNotice error={loadError} /></main>

  function set<K extends keyof PoolInput>(k: K, v: PoolInput[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const text = (k: keyof PoolInput) => ({
    value: (form[k] as string | null) ?? '',
    onChange: (e: { target: { value: string } }) => set(k, e.target.value as never),
  })

  const optionalUrl = (k: 'official_url' | 'source_url') => ({
    value: form[k] ?? '',
    onChange: (e: { target: { value: string } }) => set(k, e.target.value.trim() || null),
  })

  const num = (k: 'lat' | 'lng') => ({
    value: form[k] ?? '',
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value
      set(k, v === '' ? null : Number(v))
    },
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.prefecture || !form.municipality.trim()) {
      setSaveError('施設名・都道府県・市区町村は必須です。')
      return
    }
    setBusy(true)
    setSaveError(null)
    try {
      const input = { ...form, name: form.name.trim(), municipality: form.municipality.trim() }
      const saved = isNew ? await createPool(input) : await updatePool(id as string, input)
      await refresh()
      navigate(`/pools/${saved.id}`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <h1 className="h-page sign">{isNew ? '施設を追加' : '情報を直す'}</h1>
        <p className="small muted" style={{ margin: 0 }}>
          変更は全員の画面に反映され、編集履歴に残ります。公式サイトなどで確認した内容を入力してください。
        </p>

        <Field label="施設名（必須）">
          <input type="text" required maxLength={100} {...text('name')} />
        </Field>
        <Field label="都道府県（必須）">
          <select required value={form.prefecture} onChange={(e) => set('prefecture', e.target.value)}>
            <option value="">選択してください</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="市区町村（必須）" hint="施設の所在地。例: 調布市、世田谷区">
          <input type="text" required maxLength={30} {...text('municipality')} />
        </Field>
        <Field label="営業状況">
          <select value={form.status} onChange={(e) => set('status', e.target.value as PoolStatus)}>
            {(Object.keys(STATUS_LABEL) as PoolStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="住所">
          <input type="text" maxLength={200} {...text('address')} />
        </Field>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Field label="緯度">
            <input type="number" step="any" min={-90} max={90} {...num('lat')} />
          </Field>
          <Field label="経度">
            <input type="number" step="any" min={-180} max={180} {...num('lng')} />
          </Field>
        </div>

        <h2 className="h-section">屋内・屋外と営業</h2>
        <TriSelect value={form.is_indoor} onChange={(v) => set('is_indoor', v)} yes="屋内" no="屋外" />
        <Field label="営業期間" hint="屋外プールの夏季営業など">
          <input type="text" maxLength={200} {...text('season_note')} />
        </Field>
        <Field label="営業時間">
          <textarea maxLength={500} {...text('opening_hours')} />
        </Field>
        <Field label="休館日">
          <input type="text" maxLength={300} {...text('closed_days')} />
        </Field>
        <Field label="料金">
          <textarea maxLength={500} {...text('fee_note')} />
        </Field>

        <h2 className="h-section">設備</h2>
        {FACILITIES.map((f) => (
          <div key={f.key} className="row" style={{ justifyContent: 'space-between' }}>
            <span>{f.label}</span>
            <TriSelect value={form[f.key]} onChange={(v) => set(f.key as FacilityKey, v)} />
          </div>
        ))}

        <h2 className="h-section">行き方</h2>
        <Field label="行き方" hint="最寄駅・バス停と徒歩時間など">
          <textarea maxLength={500} {...text('access_note')} />
        </Field>

        <h2 className="h-section">出典</h2>
        <Field label="公式サイトのURL">
          <input type="url" {...optionalUrl('official_url')} />
        </Field>
        <Field label="情報の出典URL">
          <input type="url" {...optionalUrl('source_url')} />
        </Field>
        <Field label="確認した日">
          <input
            type="date"
            value={form.verified_on ?? ''}
            onChange={(e) => set('verified_on', e.target.value || null)}
          />
        </Field>
        <Field label="メモ">
          <textarea maxLength={1000} {...text('note')} />
        </Field>

        {saveError && <ErrorNotice>保存できませんでした。{saveError}</ErrorNotice>}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {isNew ? '施設を追加' : '変更を保存'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>
            キャンセル
          </button>
        </div>
      </form>
    </main>
  )
}
