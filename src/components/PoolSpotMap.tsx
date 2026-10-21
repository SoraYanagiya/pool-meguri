import { ExternalLink } from 'lucide-react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { POOL_ICONS } from '../lib/mapIcons'
import type { Pool } from '../lib/types'

type Props = {
  pool: Pick<Pool, 'name' | 'address' | 'lat' | 'lng' | 'status'>
  visited: boolean
}

/** Google マップの検索 URL。施設名と住所で探し、住所がなければ座標で示す */
function googleMapsUrl({ name, address, lat, lng }: Props['pool']): string | null {
  const query = address ? `${name} ${address}` : lat !== null && lng !== null ? `${lat},${lng}` : null
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** 施設ページの基本情報に載せる、1施設分の小さな地図 */
export function PoolSpotMap({ pool, visited }: Props) {
  const url = googleMapsUrl(pool)
  const hasPosition = pool.lat !== null && pool.lng !== null
  if (!hasPosition && !url) return null

  const kind = visited ? 'visited' : pool.status === 'closed' ? 'out' : 'normal'
  return (
    <div className="stack" style={{ marginBottom: 14 }}>
      {hasPosition && (
        // ページのスクロールを妨げないよう、ホイールでの拡大は止める
        <MapContainer
          center={[pool.lat as number, pool.lng as number]}
          zoom={16}
          className="map map-spot"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[pool.lat as number, pool.lng as number]} icon={POOL_ICONS[kind]} />
        </MapContainer>
      )}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn" style={{ justifySelf: 'start' }}>
          Google マップで開く
          <ExternalLink size={16} aria-hidden />
        </a>
      )}
    </div>
  )
}
