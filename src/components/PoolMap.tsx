import L from 'leaflet'
import { LoaderCircle, LocateFixed } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { POOL_ICONS } from '../lib/mapIcons'
import type { Pool } from '../lib/types'

// 施設がないときの表示位置（東京駅付近）
const FALLBACK: [number, number] = [35.681, 139.767]
const HERE_ZOOM = 14

const canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator

type Here = { lat: number; lng: number; accuracy: number }

type Props = {
  pools: Pool[]
  isVisited: (id: string) => boolean
  /** この値が変わったときだけ、表示中の施設が収まる範囲に地図を合わせる */
  fitKey?: string
}

export function PoolMap({ pools, isVisited, fitKey }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const [here, setHere] = useState<Here | null>(null)
  const [locating, setLocating] = useState(canLocate)
  const [locError, setLocError] = useState<string | null>(null)

  /** 現在地を取得して地図を寄せる。auto は画面を開いたときの自動取得 */
  const requestHere = useCallback((auto: boolean) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
        setHere(pos)
        setLocError(null)
        setLocating(false)
        const map = mapRef.current
        if (map) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), HERE_ZOOM))
      },
      (e) => {
        setLocating(false)
        // 自動取得で許可されなかった場合は、利用者の選択なので知らせない
        if (auto && e.code === e.PERMISSION_DENIED) return
        setLocError(
          e.code === e.PERMISSION_DENIED
            ? '位置情報の利用が許可されていません。ブラウザの設定から許可してください。'
            : '現在地を取得できませんでした。',
        )
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    if (canLocate) requestHere(true)
  }, [requestHere])

  function onLocate() {
    setLocating(true)
    setLocError(null)
    requestHere(false)
  }

  const located = useMemo(() => pools.filter((p) => p.lat !== null && p.lng !== null), [pools])
  const bounds = useMemo(
    () =>
      located.length > 1
        ? L.latLngBounds(located.map((p) => [p.lat as number, p.lng as number] as [number, number])).pad(0.1)
        : undefined,
    [located],
  )
  const center: [number, number] =
    located.length === 1 ? [located[0].lat as number, located[0].lng as number] : FALLBACK

  const fittedKey = useRef(fitKey)
  useEffect(() => {
    if (fittedKey.current === fitKey) return
    fittedKey.current = fitKey
    const map = mapRef.current
    if (!map || located.length === 0) return
    if (bounds) map.fitBounds(bounds)
    else map.setView([located[0].lat as number, located[0].lng as number], HERE_ZOOM)
  }, [fitKey, located, bounds])
  return (
    <div className="stack">
      <div className="map-wrap">
        {/* center と bounds は初回のみ使われる。絞り込みを変えても表示位置は保つ */}
        <MapContainer
          ref={mapRef}
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
              <Marker key={p.id} position={[p.lat as number, p.lng as number]} icon={POOL_ICONS[kind]}>
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
          {here && (
            <>
              <Circle
                center={[here.lat, here.lng]}
                radius={here.accuracy}
                pathOptions={{ className: 'here-accuracy' }}
                interactive={false}
              />
              <CircleMarker center={[here.lat, here.lng]} radius={8} pathOptions={{ className: 'here-dot' }}>
                <Tooltip>現在地</Tooltip>
              </CircleMarker>
            </>
          )}
        </MapContainer>
        {canLocate && (
          <button
            type="button"
            className="btn map-locate"
            onClick={onLocate}
            disabled={locating}
            aria-label="現在地を表示"
            title="現在地を表示"
          >
            {locating ? (
              <LoaderCircle size={18} className="spin" aria-hidden />
            ) : (
              <LocateFixed size={18} aria-hidden />
            )}
          </button>
        )}
      </div>
      {locError && (
        <p className="small muted" role="status" style={{ margin: 0 }}>
          {locError}
        </p>
      )}
    </div>
  )
}
