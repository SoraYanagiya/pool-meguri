import { List, Map as MapIcon, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/common'
import { PoolListItem } from '../components/PoolListItem'
import { PoolMap } from '../components/PoolMap'
import { useAuth } from '../lib/auth'
import { listAppearedPoolIds } from '../lib/api'
import { FACILITIES, prefectureOrder, type FacilityKey } from '../lib/fields'
import { useAsync } from '../lib/useAsync'
import { useMyData } from '../lib/mydata'

type View = 'map' | 'list'
type Status = 'all' | 'unvisited' | 'visited' | 'wish'

const FILTER_KEYS: FacilityKey[] = ['has_50m', 'has_25m', 'has_kids_pool', 'has_water_slide', 'has_restaurant']

export function SearchPage() {
  const { session } = useAuth()
  const { pools, poolsLoading, poolsError, visited, wishes } = useMyData()
  const appeared = useAsync(() => listAppearedPoolIds(), [])
  const [view, setView] = useState<View>('list')
  const [q, setQ] = useState('')
  const [pref, setPref] = useState('')
  const [onlyAppeared, setOnlyAppeared] = useState(false)
  const [hideClosed, setHideClosed] = useState(true)

  const prefectures = useMemo(
    () => [...new Set(pools.map((p) => p.prefecture))].sort((a, b) => prefectureOrder(a) - prefectureOrder(b)),
    [pools],
  )
  const [indoor, setIndoor] = useState<'any' | 'indoor' | 'outdoor'>('any')
  const [need, setNeed] = useState<Set<FacilityKey>>(new Set())
  const [status, setStatus] = useState<Status>('all')

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return pools.filter((p) => {
      if (pref && p.prefecture !== pref) return false
      if (hideClosed && p.status === 'closed') return false
      if (onlyAppeared && !appeared.data?.has(p.id)) return false
      if (indoor === 'indoor' && p.is_indoor !== true) return false
      if (indoor === 'outdoor' && p.is_indoor !== false) return false
      for (const k of need) if (p[k] !== true) return false
      if (status === 'visited' && !visited.has(p.id)) return false
      if (status === 'unvisited' && visited.has(p.id)) return false
      if (status === 'wish' && !wishes.has(p.id)) return false
      if (words.length) {
        const hay = `${p.name} ${p.prefecture}${p.municipality} ${p.address} ${p.access_note}`.toLowerCase()
        if (!words.every((w) => hay.includes(w))) return false
      }
      return true
    })
  }, [pools, q, pref, hideClosed, onlyAppeared, appeared.data, indoor, need, status, visited, wishes])

  function toggleNeed(k: FacilityKey) {
    setNeed((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  return (
    <main className="page stack">
      <h1 className="h-page sign">プールをさがす</h1>

      <label className="field">
        <span className="visually-hidden">施設名・地名で検索</span>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            aria-hidden
            style={{ position: 'absolute', left: 12, top: 13, color: 'var(--muted)' }}
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="施設名・市区町村名・駅名"
            style={{ paddingLeft: 38 }}
          />
        </div>
      </label>

      <label className="field">
        <span className="visually-hidden">都道府県</span>
        <select value={pref} onChange={(e) => setPref(e.target.value)}>
          <option value="">すべての都道府県</option>
          {prefectures.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <button type="button" className="chip" aria-pressed={onlyAppeared} onClick={() => setOnlyAppeared((v) => !v)}>
          番組に出た
        </button>
        <button type="button" className="chip" aria-pressed={hideClosed} onClick={() => setHideClosed((v) => !v)}>
          閉館を除く
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={indoor === 'indoor'}
          onClick={() => setIndoor((v) => (v === 'indoor' ? 'any' : 'indoor'))}
        >
          屋内
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={indoor === 'outdoor'}
          onClick={() => setIndoor((v) => (v === 'outdoor' ? 'any' : 'outdoor'))}
        >
          屋外
        </button>
        {FACILITIES.filter((f) => FILTER_KEYS.includes(f.key)).map((f) => (
          <button
            key={f.key}
            type="button"
            className="chip"
            aria-pressed={need.has(f.key)}
            onClick={() => toggleNeed(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {session && (
        <div className="segmented" role="group" aria-label="訪問状況で絞り込み">
          {(
            [
              ['all', 'すべて'],
              ['unvisited', 'まだ'],
              ['visited', '行った'],
              ['wish', '気になる'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted small">{filtered.length}施設</span>
        <div className="segmented" role="group" aria-label="表示の切り替え">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={16} aria-hidden /> 一覧
          </button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
            <MapIcon size={16} aria-hidden /> 地図
          </button>
        </div>
      </div>

      {poolsLoading && <Loading />}
      {poolsError && <ErrorNotice error={poolsError} />}

      {!poolsLoading && !poolsError && view === 'map' && (
        <PoolMap pools={filtered} isVisited={(id) => visited.has(id)} />
      )}

      {!poolsLoading && !poolsError && view === 'list' && (
        filtered.length === 0 ? (
          <div className="empty">条件に合う施設がありません。絞り込みを外してみてください。</div>
        ) : (
          <ul className="pool-list">
            {filtered.map((p) => (
              <PoolListItem key={p.id} pool={p} visited={visited.has(p.id)} wished={wishes.has(p.id)} />
            ))}
          </ul>
        )
      )}

      {session && (
        <p className="small muted" style={{ margin: 0 }}>
          載っていない公営プールは、
          <Link to="/pools/new">
            <Plus size={14} aria-hidden style={{ verticalAlign: -2 }} />
            施設を追加
          </Link>
          から登録できます。
        </p>
      )}
    </main>
  )
}
