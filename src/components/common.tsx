import { LoaderCircle, LogIn } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { enabledProviders, isSupabaseConfigured, type OAuthProvider } from '../lib/supabase'

export function Loading({ label = '読み込み中' }: { label?: string }) {
  return (
    <p className="row muted" role="status">
      <LoaderCircle size={18} className="spin" aria-hidden />
      {label}
    </p>
  )
}

export function ErrorNotice({ error, children }: { error?: Error | null; children?: ReactNode }) {
  return (
    <div className="notice notice-error" role="alert">
      {children ?? '読み込みに失敗しました。通信状況を確認して、ページを再読み込みしてください。'}
      {error && <div className="small muted">{error.message}</div>}
    </div>
  )
}

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  twitter: 'X',
  x: 'X',
  discord: 'Discord',
  apple: 'Apple',
}

export function LoginButtons({ returnTo }: { returnTo?: string }) {
  const { signIn } = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<OAuthProvider | null>(null)

  if (!isSupabaseConfigured) {
    return (
      <div className="notice notice-error">
        Supabase の接続先が設定されていないため、ログインできません。README の手順で環境変数を設定してください。
      </div>
    )
  }

  async function handle(p: OAuthProvider) {
    setBusy(p)
    setError(null)
    try {
      await signIn(p, returnTo ?? location.pathname)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(null)
    }
  }

  return (
    <div className="stack">
      {enabledProviders.map((p) => (
        <button
          key={p}
          type="button"
          className="btn btn-block"
          disabled={busy !== null}
          onClick={() => void handle(p)}
        >
          {busy === p ? (
            <LoaderCircle size={18} className="spin" aria-hidden />
          ) : (
            <LogIn size={18} aria-hidden />
          )}
          {PROVIDER_LABEL[p]}でログイン
        </button>
      ))}
      {error && <ErrorNotice>ログインを開始できませんでした。{error}</ErrorNotice>}
    </div>
  )
}

export function LoginPrompt({ children }: { children: ReactNode }) {
  return (
    <div className="panel stack">
      <p style={{ margin: 0 }}>{children}</p>
      <LoginButtons />
    </div>
  )
}

export function Avatar({ url, name, large }: { url: string | null; name: string; large?: boolean }) {
  const cls = large ? 'avatar avatar-lg' : 'avatar'
  if (!url) return <span className={cls} aria-hidden />
  return <img className={cls} src={url} alt={`${name}のアイコン`} referrerPolicy="no-referrer" />
}
