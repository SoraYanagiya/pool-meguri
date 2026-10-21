import { FACILITIES, triState } from '../lib/fields'
import type { Pool } from '../lib/types'

const SUFFIX = { yes: 'あり', no: 'なし', unknown: '不明' } as const

export function FacilityGrid({ pool }: { pool: Pool }) {
  return (
    <ul className="facilities" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {FACILITIES.map(({ key, label, icon: Icon }) => {
        const s = triState(pool[key])
        return (
          <li key={key} className={`facility facility-${s}`}>
            <Icon size={18} aria-hidden />
            <span>
              {label}
              <span className="visually-hidden">：</span>
              <span className="small">{s === 'yes' ? '' : `（${SUFFIX[s]}）`}</span>
              {s === 'yes' && <span className="visually-hidden">あり</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
