import { Flag, Lock, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteVisit, reportVisit } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatBalance, strokeInfo } from '../lib/calorie'
import { formatDate } from '../lib/fields'
import type { VisitWithRelations } from '../lib/types'
import { Avatar } from './common'

type Props = {
  visit: VisitWithRelations
  /** 施設ページでは施設名を省き、ユーザーページでは投稿者を省く */
  show: 'pool' | 'user' | 'both'
  onChanged?: () => void
}

export function VisitCard({ visit, show, onChanged }: Props) {
  const { session } = useAuth()
  const mine = session?.user.id === visit.user_id
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm('この記録を削除します。元に戻せません。')) return
    setBusy(true)
    try {
      await deleteVisit(visit.id)
      onChanged?.()
    } catch (e) {
      setMessage(`削除できませんでした。${e instanceof Error ? e.message : ''}`)
      setBusy(false)
    }
  }

  async function report() {
    const reason = window.prompt('通報する理由を入力してください（500文字まで）')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      await reportVisit(visit.id, reason.trim().slice(0, 500))
      setMessage('通報を受け付けました。')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '通報できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  const author = visit.profiles?.display_name ?? '退会したユーザー'

  return (
    <article className="visit">
      <div className="visit-head">
        {show !== 'pool' && (
          <Link to={`/users/${visit.user_id}`} className="row" style={{ color: 'inherit' }}>
            <Avatar url={visit.profiles?.avatar_url ?? null} name={author} />
            <span>{author}</span>
          </Link>
        )}
        <span className="muted">{formatDate(visit.visited_on)}</span>
        {visit.visibility === 'private' && (
          <span className="chip">
            <Lock size={12} aria-hidden />
            自分だけ
          </span>
        )}
      </div>
      {show !== 'user' && visit.pools && (
        <Link to={`/pools/${visit.pool_id}`} style={{ fontWeight: 700 }}>
          {visit.pools.name}
          <span className="muted small">
            （{visit.pools.prefecture}
            {visit.pools.municipality}）
          </span>
        </Link>
      )}
      {(visit.swim_distance_m || visit.swim_minutes || visit.meals.length > 0) && (
        <div className="row small">
          {(visit.swim_distance_m || visit.swim_minutes) && (
            <span className="chip">
              {strokeInfo(visit.stroke).label}
              {visit.swim_distance_m ? ` ${visit.swim_distance_m.toLocaleString('ja-JP')}m` : ''}
              {visit.swim_minutes ? ` ${visit.swim_minutes}分` : ''}
            </span>
          )}
          {visit.meals.map((m, i) => (
            <span key={i} className="chip">
              {m.name}
            </span>
          ))}
        </div>
      )}
      {visit.show_calories && (visit.kcal_burned !== null || visit.kcal_intake !== null) && (
        <div className="kcal">
          <div>
            消費
            <strong>{visit.kcal_burned?.toLocaleString('ja-JP') ?? '—'}</strong>
          </div>
          <div>
            摂取
            <strong>{visit.kcal_intake?.toLocaleString('ja-JP') ?? '—'}</strong>
          </div>
          <div>
            収支（目安）
            <strong>{formatBalance(visit.kcal_burned, visit.kcal_intake)}</strong>
          </div>
        </div>
      )}
      {visit.body ? (
        <p className="prewrap" style={{ margin: 0 }}>
          {visit.body}
        </p>
      ) : (
        !visit.swim_distance_m &&
        !visit.swim_minutes &&
        visit.meals.length === 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            行った記録のみ
          </p>
        )
      )}
      <div className="row">
        {mine ? (
          <>
            <Link to={`/visits/${visit.id}/edit`} className="btn btn-quiet">
              <Pencil size={16} aria-hidden />
              編集
            </Link>
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void remove()}>
              <Trash2 size={16} aria-hidden />
              削除
            </button>
          </>
        ) : (
          session && (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void report()}>
              <Flag size={16} aria-hidden />
              通報
            </button>
          )
        )}
      </div>
      {message && (
        <p className="small" role="status" style={{ margin: 0 }}>
          {message}
        </p>
      )}
    </article>
  )
}
