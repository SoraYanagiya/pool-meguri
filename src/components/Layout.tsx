import { Map as MapIcon, MessagesSquare, User } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function Layout() {
  const { session, loading } = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="topbar-title">
          プールめぐり
        </Link>
        <span className="topbar-spacer" />
        {!loading && !session && (
          <Link to="/login" className="topbar-login">
            ログイン
          </Link>
        )}
      </header>

      {!isSupabaseConfigured && (
        <div className="page" style={{ paddingBottom: 0 }}>
          <div className="notice notice-error small">
            接続先が未設定です。.env.example を参考に VITE_SUPABASE_URL と
            VITE_SUPABASE_PUBLISHABLE_KEY を設定してください。
          </div>
        </div>
      )}

      <Outlet />

      <nav className="bottomnav" aria-label="メインメニュー">
        <NavLink to="/" end>
          <MapIcon size={22} aria-hidden />
          さがす
        </NavLink>
        <NavLink to="/visits">
          <MessagesSquare size={22} aria-hidden />
          みんなの記録
        </NavLink>
        <NavLink to="/me">
          <User size={22} aria-hidden />
          マイページ
        </NavLink>
      </nav>
    </div>
  )
}
