import { Check, ExternalLink, Heart, History, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppearanceSection } from '../components/AppearanceSection'
import { ErrorNotice, Loading, LoginPrompt, PageError, PageLoading } from '../components/common'
import { FacilityGrid } from '../components/FacilityGrid'
import { PoolSpotMap } from '../components/PoolSpotMap'
import { VisitCard } from '../components/VisitCard'
import { getPool, listVisitsForPool } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/errors'
import { KIND_LABEL, STATUS_LABEL, formatDate, indoorLabel } from '../lib/fields'
import { useMyData } from '../lib/mydata'
import { useAsync } from '../lib/useAsync'

export function PoolDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { visited, wishes, toggleWish, refresh } = useMyData()
  const pool = useAsync(() => getPool(id), [id])
  const visits = useAsync(() => listVisitsForPool(id), [id, session?.user.id])
  const [wishError, setWishError] = useState<string | null>(null)

  if (pool.loading) return <PageLoading />
  if (pool.error) return <PageError error={pool.error} />
  const p = pool.data
  if (!p) {
    return (
      <main className="page">
        <div className="empty">施設が見つかりません。削除されたか、URLが間違っている可能性があります。</div>
      </main>
    )
  }

  const v = visited.get(p.id)
  const wished = wishes.has(p.id)

  async function onWish() {
    setWishError(null)
    try {
      await toggleWish(id)
    } catch (e) {
      setWishError(errorMessage(e))
    }
  }

  return (
    <main className="page stack">
      <section className="pool-hero">
        <div className="pool-hero-body">
          <div className="row">
            <span className="chip">
              {p.prefecture}
              {p.municipality}
            </span>
            <span className="chip">{indoorLabel(p)}</span>
            {p.status !== 'open' && <span className="chip">{STATUS_LABEL[p.status]}</span>}
            {p.kind === 'school' && <span className="chip">{KIND_LABEL.school}</span>}
            {v && (
              <span className="chip chip-visited">
                <Check size={14} aria-hidden />
                {v.visit_count}回行った
              </span>
            )}
          </div>
          <h1>{p.name}</h1>
        </div>
      </section>

      {session ? (
        <div className="row">
          <Link to={`/pools/${p.id}/log`} className="btn btn-rope">
            <Plus size={18} aria-hidden />
            めぐり記録を書く
          </Link>
          <button type="button" className="btn" aria-pressed={wished} onClick={() => void onWish()}>
            <Heart size={18} aria-hidden fill={wished ? 'currentColor' : 'none'} />
            {wished ? '気になる済み' : '気になる'}
          </button>
        </div>
      ) : (
        <LoginPrompt>ログインすると、行った記録や気になる施設を保存できます。</LoginPrompt>
      )}
      {wishError && <ErrorNotice>保存できませんでした。{wishError}</ErrorNotice>}

      {p.status === 'closed' && (
        <div className="notice">この施設は閉館しています。行った記録は残せますが、制覇の数には含まれません。</div>
      )}
      {p.kind === 'school' && (
        <div className="notice">
          学校施設の一般開放です。利用できる曜日・時間帯が限られるため、公式情報を確認してください。行った記録は残せますが、制覇の数には含まれません。
        </div>
      )}
      {p.status === 'temporarily_closed' && (
        <div className="notice">この施設は休館中です。再開時期は公式サイトで確認してください。</div>
      )}

      <AppearanceSection poolId={p.id} />

      <h2 className="h-section">設備</h2>
      <FacilityGrid pool={p} />

      <h2 className="h-section">基本情報</h2>
      <div className="panel">
        <PoolSpotMap pool={p} visited={Boolean(v)} />
        <dl className="info">
          <dt>住所</dt>
          <dd>{p.address || '未登録'}</dd>
          <dt>営業時間</dt>
          <dd>{p.opening_hours || '未登録'}</dd>
          <dt>休館日</dt>
          <dd>{p.closed_days || '未登録'}</dd>
          {p.season_note && (
            <>
              <dt>営業期間</dt>
              <dd>{p.season_note}</dd>
            </>
          )}
          <dt>料金</dt>
          <dd>{p.fee_note || '未登録'}</dd>
          <dt>行き方</dt>
          <dd>{p.access_note || '未登録'}</dd>
          {p.note && (
            <>
              <dt>メモ</dt>
              <dd>{p.note}</dd>
            </>
          )}
          {p.official_url && (
            <>
              <dt>公式サイト</dt>
              <dd>
                <a href={p.official_url} target="_blank" rel="noopener noreferrer">
                  開く <ExternalLink size={14} aria-hidden style={{ verticalAlign: -2 }} />
                </a>
              </dd>
            </>
          )}
        </dl>
        <p className="small muted" style={{ margin: '14px 0 0' }}>
          {p.verified_on ? `${formatDate(p.verified_on)}時点の情報です。` : '確認日は未登録です。'}
          営業時間や料金は変わることがあるため、出かける前に公式サイトで確認してください。
        </p>
      </div>

      <div className="row">
        {session && (
          <Link to={`/pools/${p.id}/edit`} className="btn btn-quiet">
            <Pencil size={16} aria-hidden />
            情報を直す
          </Link>
        )}
        <Link to={`/pools/${p.id}/history`} className="btn btn-quiet">
          <History size={16} aria-hidden />
          編集履歴
        </Link>
      </div>

      <h2 className="h-section">めぐり記録</h2>
      {visits.loading && <Loading />}
      {visits.error && <ErrorNotice error={visits.error} />}
      {visits.data && visits.data.length === 0 && (
        <div className="empty">まだ記録がありません。行ったら最初の記録を書いてみてください。</div>
      )}
      <div className="stack">
        {visits.data?.map((x) => (
          <VisitCard
            key={x.id}
            visit={x}
            show="user"
            onChanged={() => {
              visits.reload()
              void refresh()
            }}
          />
        ))}
      </div>
    </main>
  )
}
