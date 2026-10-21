import { Link } from 'react-router-dom'
import type { Pool, VisitedSummary } from '../lib/types'

type Props = {
  pools: Pool[]
  visited: Map<string, VisitedSummary>
  wishes?: Set<string>
}

/**
 * 対象施設を1枚ずつのタイルとして並べる。訪問済みは黄色で埋まる。
 * 並びは自治体順で固定し、どこが埋まったかを覚えやすくする。
 */
export function TileWall({ pools, visited, wishes }: Props) {
  if (pools.length === 0) return null
  return (
    <div className="tilewall" role="list" aria-label="施設のタイル">
      {pools.map((p) => {
        const v = visited.has(p.id)
        const w = !v && wishes?.has(p.id)
        const cls = ['tile', v && 'tile-visited', w && 'tile-wish'].filter(Boolean).join(' ')
        const state = v ? '行った' : w ? '気になる' : 'まだ'
        return (
          <Link
            key={p.id}
            role="listitem"
            to={`/pools/${p.id}`}
            className={cls}
            title={`${p.name}（${state}）`}
            aria-label={`${p.name}、${state}`}
          />
        )
      })}
    </div>
  )
}

export function TileLegend() {
  return (
    <div className="legend">
      <span>
        <i className="v" />
        行った
      </span>
      <span>
        <i className="w" />
        気になる
      </span>
      <span>
        <i />
        まだ
      </span>
    </div>
  )
}
