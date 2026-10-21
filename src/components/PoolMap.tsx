import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { Pool } from '../lib/types'

// 施設がないときの表示位置（東京駅付近）
const FALLBACK: [number, number] = [35.681, 139.767]

function icon(kind: 'visited' | 'normal' | 'out') {
  const cls = kind === 'visited' ? 'marker marker-visited' : kind === 'out' ? 'marker marker-out' : 'marker'
  return L.divIcon({
    className: '',
    html: `<div class="${cls}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

const ICONS = { visited: icon('visited'), normal: icon('normal'), out: icon('out') }

type Props = {
  pools: Pool[]
  isVisited: (id: string) => boolean
}

export function PoolMap({ pools, isVisited }: Props) {
  const located = pools.filter((p) => p.lat !== null && p.lng !== null)
  const bounds =
    located.length > 1
      ? L.latLngBounds(located.map((p) => [p.lat as number, p.lng as number] as [number, number])).pad(0.1)
      : undefined
  const center: [number, number] =
    located.length === 1 ? [located[0].lat as number, located[0].lng as number] : FALLBACK
  return (
    <MapContainer
      key={located.map((p) => p.id).join(',')}
      center={center}
      zoom={13}
      bounds={bounds}
      className="map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {located.map((p) => {
        const kind = isVisited(p.id) ? 'visited' : p.status === 'closed' ? 'out' : 'normal'
        return (
          <Marker key={p.id} position={[p.lat as number, p.lng as number]} icon={ICONS[kind]}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {p.prefecture}
              {p.municipality}
              <br />
              <Link to={`/pools/${p.id}`}>詳しく見る</Link>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
