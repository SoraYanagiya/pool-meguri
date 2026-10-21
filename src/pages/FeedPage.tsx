import { ErrorNotice, Loading } from '../components/common'
import { VisitCard } from '../components/VisitCard'
import { listRecentPublicVisits } from '../lib/api'
import { useAsync } from '../lib/useAsync'

export function FeedPage() {
  const feed = useAsync(() => listRecentPublicVisits(), [])
  return (
    <main className="page stack">
      <h1 className="h-page sign">みんなの記録</h1>
      {feed.loading && <Loading />}
      {feed.error && <ErrorNotice error={feed.error} />}
      {feed.data?.length === 0 && <div className="empty">公開された記録はまだありません。</div>}
      {feed.data?.map((v) => (
        <VisitCard key={v.id} visit={v} show="both" onChanged={feed.reload} />
      ))}
    </main>
  )
}
