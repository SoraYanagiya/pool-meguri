import { Navigate, useSearchParams } from 'react-router-dom'
import { Loading, LoginButtons } from '../components/common'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/me'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/me'

  if (loading) return <main className="page"><Loading /></main>
  if (session) return <Navigate to={safeNext} replace />

  return (
    <main className="page stack">
      <h1 className="h-page sign">ログイン</h1>
      <p style={{ margin: 0 }}>
        お持ちのアカウントでログインできます。初めての場合は、そのまま新規登録になります。
      </p>
      <LoginButtons returnTo={safeNext} />
      <p className="small muted" style={{ margin: 0 }}>
        アカウントの表示名とアイコンが、このサービスのプロフィールとして使われます。あとから変更できます。
      </p>
    </main>
  )
}
