import { LogOut, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, ErrorNotice, Loading, LoginPrompt, PageLoading } from '../components/common'
import { KcalSummary } from '../components/KcalSummary'
import { PoolListItem } from '../components/PoolListItem'
import { TileLegend, TileWall } from '../components/TileWall'
import { VisitCard } from '../components/VisitCard'
import { listVisitsByUser } from '../lib/api'
import { useAuth } from '../lib/auth'
import { countsForCompletion, sortPrefectures } from '../lib/fields'
import { useMyData } from '../lib/mydata'
import { useAsync } from '../lib/useAsync'

export function MyPage() {
  const { session, profile, loading, signOut } = useAuth()
  const { pools, visited, wishes, area, setArea, refresh } = useMyData()
  const userId = session?.user.id
  const myVisits = useAsync(() => (userId ? listVisitsByUser(userId) : Promise.resolve([])), [userId])

  // 制覇の母数: 選んだ都道府県の、閉館していない市民プール（学校開放は含めない）
  const target = useMemo(
    () => pools.filter((p) => p.prefecture === area && countsForCompletion(p)),
    [pools, area],
  )
  const done = target.filter((p) => visited.has(p.id)).length

  const prefectures = useMemo(() => sortPrefectures(pools.map((p) => p.prefecture)), [pools])
  const visitedPrefectures = useMemo(
    () => new Set(pools.filter((p) => visited.has(p.id)).map((p) => p.prefecture)),
    [pools, visited],
  )

  const byCity = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>()
    for (const p of target) {
      const e = m.get(p.municipality) ?? { total: 0, done: 0 }
      e.total += 1
      if (visited.has(p.id)) e.done += 1
      m.set(p.municipality, e)
    }
    return [...m.entries()].sort(
      (a, b) => b[1].done / b[1].total - a[1].done / a[1].total || b[1].total - a[1].total,
    )
  }, [target, visited])

  const totals = useMemo(() => {
    const t = { distance: 0, burned: 0, intake: 0, hasKcal: false }
    for (const v of myVisits.data ?? []) {
      t.distance += v.swim_distance_m ?? 0
      if (v.kcal_burned !== null || v.kcal_intake !== null) t.hasKcal = true
      t.burned += v.kcal_burned ?? 0
      t.intake += v.kcal_intake ?? 0
    }
    return t
  }, [myVisits.data])

  const wishPools = pools.filter((p) => wishes.has(p.id) && !visited.has(p.id))

  if (loading) return <PageLoading />
  if (!session) {
    return (
      <main className="page stack">
        <h1 className="h-page sign">マイページ</h1>
        <LoginPrompt>ログインすると、行ったプールがタイルのように埋まっていきます。</LoginPrompt>
      </main>
    )
  }

  const name = profile?.display_name ?? 'スイマー'

  return (
    <main className="page stack">
      <div className="row">
        <Avatar url={profile?.avatar_url ?? null} name={name} large />
        <div style={{ flex: 1 }}>
          <h1 className="h-page">{name}</h1>
          <Link to={`/users/${session.user.id}`} className="small">
            公開ページを見る
          </Link>
        </div>
        <Link to="/me/settings" className="btn btn-quiet" aria-label="設定">
          <Settings size={20} aria-hidden />
        </Link>
      </div>

      <section className="panel">
        <h2 className="visually-hidden">制覇状況</h2>
        <label className="field" style={{ marginBottom: 10 }}>
          <span className="visually-hidden">都道府県</span>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {sortPrefectures([area, ...prefectures]).map((p) => (
              <option key={p} value={p}>
                {p}
                {visitedPrefectures.has(p) ? '（行った施設あり）' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="score">
          <span className="score-num">{done}</span>
          <span className="score-den">/ {target.length}施設</span>
        </div>
        {target.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {area}の施設はまだ登録されていません。
          </p>
        ) : (
          <>
            <TileWall pools={target} visited={visited} wishes={wishes} />
            <TileLegend />
          </>
        )}
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          全国で{visited.size}施設、{visitedPrefectures.size}都道府県に行きました。閉館した施設と学校開放のプールは、制覇の数に含めていません。
        </p>
      </section>

      {byCity.length > 1 && (
        <details className="panel disclosure">
          <summary>市区町村ごとに見る</summary>
          <div className="bars">
            {byCity.map(([city, e]) => (
              <div key={city} className="bar-row">
                <span>{city}</span>
                <span className="bar" aria-hidden>
                  <span style={{ width: `${(e.done / e.total) * 100}%` }} />
                </span>
                <span className="small" style={{ textAlign: 'right' }}>
                  {e.done}/{e.total}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {(totals.distance > 0 || totals.hasKcal) && (
        <>
          <h2 className="h-section">これまでの合計</h2>
          <div className="panel stack">
            {totals.distance > 0 && (
              <p style={{ margin: 0 }}>
                泳いだ距離 <strong>{(totals.distance / 1000).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}km</strong>
              </p>
            )}
            {totals.hasKcal && <KcalSummary burned={totals.burned} intake={totals.intake} />}
          </div>
        </>
      )}

      <h2 className="h-section">気になる</h2>
      {wishPools.length === 0 ? (
        <div className="empty">施設ページの「気になる」で保存すると、ここに並びます。</div>
      ) : (
        <ul className="pool-list">
          {wishPools.map((p) => (
            <PoolListItem key={p.id} pool={p} visited={false} wished />
          ))}
        </ul>
      )}

      <h2 className="h-section">自分の記録</h2>
      {myVisits.loading && <Loading />}
      {myVisits.error && <ErrorNotice error={myVisits.error} />}
      {myVisits.data?.length === 0 && (
        <div className="empty">
          まだ記録がありません。<Link to="/">プールをさがす</Link>から行った施設を選んで記録してください。
        </div>
      )}
      {myVisits.data?.map((v) => (
        <VisitCard
          key={v.id}
          visit={v}
          show="pool"
          onChanged={() => {
            myVisits.reload()
            void refresh()
          }}
        />
      ))}

      <button type="button" className="btn btn-quiet" style={{ justifySelf: 'start' }} onClick={() => void signOut()}>
        <LogOut size={16} aria-hidden />
        ログアウト
      </button>
    </main>
  )
}
