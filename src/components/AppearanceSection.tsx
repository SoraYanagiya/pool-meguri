import { ExternalLink, Pencil, Plus, Trash2, Tv } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { deleteAppearance, listAppearances, saveAppearance } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/errors'
import { episodeLabel, formatDate } from '../lib/fields'
import type { PoolAppearance } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { ErrorNotice } from './common'

const DEFAULT_PROGRAM = 'ロバート秋山の市民プール万歳'

/** 施設ページの「番組に登場」欄。ログインユーザーが追加・修正できる */
export function AppearanceSection({ poolId }: { poolId: string }) {
  const { session } = useAuth()
  const list = useAsync(() => listAppearances(poolId), [poolId])
  const [editing, setEditing] = useState<PoolAppearance | 'new' | null>(null)

  const items = list.data ?? []
  if (!session && items.length === 0) return null

  return (
    <section className="stack">
      <h2 className="h-section">番組に登場</h2>
      {list.error && <ErrorNotice error={list.error} />}
      {items.map((a) =>
        editing !== 'new' && editing?.id === a.id ? (
          <AppearanceForm
            key={a.id}
            poolId={poolId}
            initial={a}
            onDone={() => {
              setEditing(null)
              list.reload()
            }}
          />
        ) : (
          <div key={a.id} className="appearance">
            <Tv size={18} aria-hidden />
            <span className="appearance-ep">{episodeLabel(a)}</span>
            <span className="small">
              {a.program !== DEFAULT_PROGRAM ? a.program : '市民プール万歳'}
              {a.aired_on && `（${formatDate(a.aired_on)}放送）`}
            </span>
            {a.note && <span className="small muted" style={{ flexBasis: '100%' }}>{a.note}</span>}
            {a.source_url && (
              <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="small">
                出典 <ExternalLink size={12} aria-hidden style={{ verticalAlign: -1 }} />
              </a>
            )}
            {session && (
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(a)} aria-label="この登場情報を直す">
                <Pencil size={14} aria-hidden />
              </button>
            )}
          </div>
        ),
      )}
      {session &&
        (editing === 'new' ? (
          <AppearanceForm
            poolId={poolId}
            initial={null}
            onDone={() => {
              setEditing(null)
              list.reload()
            }}
          />
        ) : (
          <button type="button" className="btn btn-quiet" style={{ justifySelf: 'start' }} onClick={() => setEditing('new')}>
            <Plus size={16} aria-hidden />
            登場回を追加
          </button>
        ))}
    </section>
  )
}

function AppearanceForm({
  poolId,
  initial,
  onDone,
}: {
  poolId: string
  initial: PoolAppearance | null
  onDone: () => void
}) {
  const { session } = useAuth()
  const [program, setProgram] = useState(initial?.program ?? DEFAULT_PROGRAM)
  const [season, setSeason] = useState(initial?.season?.toString() ?? '')
  const [episode, setEpisode] = useState(initial?.episode?.toString() ?? '')
  const [airedOn, setAiredOn] = useState(initial?.aired_on ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const toInt = (v: string) => (v.trim() === '' ? null : Number(v))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await saveAppearance(initial?.id ?? null, {
        pool_id: poolId,
        program: program.trim() || DEFAULT_PROGRAM,
        season: toInt(season),
        episode: toInt(episode),
        aired_on: airedOn || null,
        note: note.trim(),
        source_url: sourceUrl.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function remove() {
    if (!initial || !window.confirm('この登場情報を削除します。')) return
    try {
      await deleteAppearance(initial.id)
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const canDelete = initial && initial.created_by === session?.user.id

  return (
    <form className="panel stack" onSubmit={(e) => void submit(e)}>
      <label className="field">
        <span>番組名</span>
        <input type="text" maxLength={100} value={program} onChange={(e) => setProgram(e.target.value)} />
      </label>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <label className="field" style={{ flex: 1 }}>
          <span>シーズン</span>
          <input type="number" min={1} max={99} value={season} onChange={(e) => setSeason(e.target.value)} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>話数</span>
          <input type="number" min={1} max={999} value={episode} onChange={(e) => setEpisode(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>放送日</span>
        <input type="date" value={airedOn} onChange={(e) => setAiredOn(e.target.value)} />
      </label>
      <label className="field">
        <span>メモ</span>
        <input type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="field">
        <span>出典URL</span>
        <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      </label>
      {error && <ErrorNotice>保存できませんでした。{error}</ErrorNotice>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          保存
        </button>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          キャンセル
        </button>
        {canDelete && (
          <button type="button" className="btn btn-quiet" onClick={() => void remove()}>
            <Trash2 size={16} aria-hidden />
            削除
          </button>
        )}
      </div>
    </form>
  )
}
