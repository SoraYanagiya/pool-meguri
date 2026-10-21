import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AttributesForm } from '../components/AttributesForm'
import { PageLoading } from '../components/common'
import { markOnboarded, saveMyAttributes } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useMyData } from '../lib/mydata'
import { safeNextPath } from '../lib/paths'
import type { ProfileAttributes } from '../lib/types'

/** 初回ログイン後に一度だけ表示する任意アンケート */
export function WelcomePage() {
  const { session, profile, loading, reloadProfile } = useAuth()
  const { refresh } = useMyData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const safeNext = safeNextPath(params.get('next'))

  if (loading || (session && !profile)) return <PageLoading />
  if (!session || !profile) return <Navigate to="/login" replace />

  const userId = session.user.id

  async function finish(attrs: ProfileAttributes | null) {
    if (attrs && (attrs.age_group || attrs.gender)) await saveMyAttributes(userId, attrs)
    await markOnboarded(userId)
    await reloadProfile()
    await refresh()
    navigate(safeNext, { replace: true })
  }

  return (
    <main className="page stack">
      <h1 className="h-page sign">ようこそ</h1>
      <p style={{ margin: 0 }}>
        よろしければ年代と性別を教えてください。泳いだときの消費カロリーの目安を計算するために使います。回答は任意で、ほかのユーザーには表示されません。設定からいつでも変更・削除できます。
      </p>
      <div className="panel">
        <AttributesForm
          initial={null}
          submitLabel="回答してはじめる"
          onSubmit={(v) => finish(v)}
          secondary={
            <button type="button" className="btn btn-quiet" onClick={() => void finish(null)}>
              回答せずにはじめる
            </button>
          }
        />
      </div>
    </main>
  )
}
