import L from 'leaflet'

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

/** 地図上の施設マーカー。訪問済み・通常・閉館で色を変える */
export const POOL_ICONS = { visited: icon('visited'), normal: icon('normal'), out: icon('out') }
