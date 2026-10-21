import { ChevronLeft, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/common'
import { listPoolRevisions, revertPoolRevision } from '../lib/api'
import { useAuth } from '../lib/auth'
import { FACILITIES } from '../lib/fields'
import { useMyData } from '../lib/mydata'
import type { Pool, PoolRevision } from '../lib/types'
import { useAsync } from '../lib/useAsync'

const LABELS: Partial<Record<keyof Pool, string>> = {
  name: '施設名',
  prefecture: '都道府県',
  municipality: '市区町村',
  status: '営業状況',
  address: '住所',
  lat: '緯度',
  lng: '経度',
  official_url: '公式サイト',
  is_indoor: '屋内・屋外',
  season_note: '営業期間',
  opening_hours: '営業時間',
  closed_days: '休館日',
  fee_note: '料金',
  access_note: '行き方',
  note: 'メモ',
  source_url: '出典',
  verified_on: '確認日',
  ...Object.fromEntries(FACILITIES.map((f) => [f.key, f.label])),
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '（空欄）'
  if (v === true) return 'あり／屋内'
  if (v === false) return 'なし／屋外'
  if (v === 'open') return '営業中'
  if (v === 'temporarily_closed') return '休館中'
  if (v === 'closed') return '閉館'
  return String(v)
}

function changes(r: PoolRevision): { key: string; label: string; before: unknown; after: unknown }[] {
  const out = []
  for (const [key, label] of Object.entries(LABELS)) {
    const k = key as keyof Pool
    const before = r.before_data?.[k]
    const after = r.after_data[k]
    if (r.before_data && JSON.stringify(before) === JSON.stringify(after)) continue
    if (!r.before_data && (after === null || after === '')) continue
    out.push({ key, label: label as string, before, after })
  }
  return out
}

export function PoolHistoryPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const { refresh } = useMyData()
  const revs = useAsync(() => listPoolRevisions(id), [id])
  const [message, setMessage] = useState<string | null>(null)

  async function revert(r: PoolRevision) {
    if (!window.confirm('この編集をする前の状態に戻します。戻す操作も履歴に残ります。')) return
    setMessage(null)
    try {
      await revertPoolRevision(r.id)
      setMessage('元に戻しました。')
      revs.reload()
      void refresh()
    } catch (e) {
      setMessage(`戻せませんでした。${e instanceof Error ? e.message : ''}`)
    }
  }

  return (
    <main className="page stack">
      <Link to={`/pools/${id}`} className="btn btn-quiet" style={{ justifySelf: 'start' }}>
        <ChevronLeft size={18} aria-hidden />
        施設に戻る
      </Link>
      <h1 className="h-page sign">編集履歴</h1>
      {message && <div className="notice" role="status">{message}</div>}
      {revs.loading && <Loading />}
      {revs.error && <ErrorNotice error={revs.error} />}
      {revs.data?.map((r) => {
        const list = changes(r)
        return (
          <article key={r.id} className="visit">
            <div className="visit-head">
              <strong>{r.before_data ? '編集' : '登録'}</strong>
              <span className="muted">
                {new Date(r.edited_at).toLocaleString('ja-JP')}
                {'　'}
                {r.profiles?.display_name ?? (r.edited_by ? '退会したユーザー' : '運営')}
              </span>
            </div>
            <div className="diff">
              {list.length === 0 && <span className="muted">表示対象の項目に変更はありません</span>}
              {list.map((c) => (
                <div key={c.key}>
                  <strong>{c.label}</strong>：
                  {r.before_data && (
                    <>
                      <del>{show(c.before)}</del>
                      {' から '}
                    </>
                  )}
                  <ins>{show(c.after)}</ins>
                </div>
              ))}
            </div>
            {session && r.before_data && (
              <button
                type="button"
                className="btn btn-quiet"
                style={{ justifySelf: 'start' }}
                onClick={() => void revert(r)}
              >
                <Undo2 size={16} aria-hidden />
                この編集を取り消す
              </button>
            )}
          </article>
        )
      })}
    </main>
  )
}
