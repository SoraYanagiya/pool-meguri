import { useParams } from 'react-router-dom'
import { Avatar, ErrorNotice, Loading, PageError, PageLoading } from '../components/common'
import { VisitCard } from '../components/VisitCard'
import { getProfile, listVisitsByUser } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync } from '../lib/useAsync'

export function UserPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const profile = useAsync(() => getProfile(id), [id])
  // 他人のページでは RLS により公開記録のみ返る。本人が見る場合も公開分だけを表示する
  const visits = useAsync(() => listVisitsByUser(id), [id, session?.user.id])
  const publicVisits = visits.data?.filter((v) => v.visibility === 'public')
  const poolCount = new Set(publicVisits?.map((v) => v.pool_id)).size

  if (profile.loading) return <PageLoading />
  if (profile.error) return <PageError error={profile.error} />
  const p = profile.data
  if (!p) return <main className="page"><div className="empty">ユーザーが見つかりません。</div></main>

  return (
    <main className="page stack">
      <div className="row">
        <Avatar url={p.avatar_url} name={p.display_name} large />
        <div>
          <h1 className="h-page">{p.display_name}</h1>
          {visits.data && <span className="small muted">公開記録で{poolCount}施設</span>}
        </div>
      </div>
      {p.bio && <p className="prewrap" style={{ margin: 0 }}>{p.bio}</p>}

      <h2 className="h-section">公開しているめぐり記録</h2>
      {visits.loading && <Loading />}
      {visits.error && <ErrorNotice error={visits.error} />}
      {publicVisits?.length === 0 && <div className="empty">公開している記録はありません。</div>}
      {publicVisits?.map((v) => (
        <VisitCard key={v.id} visit={v} show="pool" onChanged={visits.reload} />
      ))}
    </main>
  )
}
