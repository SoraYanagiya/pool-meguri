import { Check, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { STATUS_LABEL, indoorLabel } from '../lib/fields'
import type { Pool } from '../lib/types'

type Props = {
  pool: Pool
  visited: boolean
  wished: boolean
}

export function PoolListItem({ pool, visited, wished }: Props) {
  const lanes = [pool.has_50m && '50m', pool.has_25m && '25m', pool.has_kids_pool && '幼児用']
    .filter(Boolean)
    .join('・')
  return (
    <li>
      <Link to={`/pools/${pool.id}`} className="pool-item">
        <span className="pool-item-name">{pool.name}</span>
        <span className="small muted">
          {pool.prefecture}
          {pool.municipality}
        </span>
        <span className="pool-item-meta">
          {visited && (
            <span className="chip chip-visited">
              <Check size={14} aria-hidden />
              行った
            </span>
          )}
          {wished && !visited && (
            <span className="chip">
              <Heart size={14} aria-hidden />
              気になる
            </span>
          )}
          {pool.status !== 'open' && <span className="chip chip-closed">{STATUS_LABEL[pool.status]}</span>}
          <span className="chip">{indoorLabel(pool)}</span>
          {lanes && <span className="chip">{lanes}</span>}
        </span>
      </Link>
    </li>
  )
}
