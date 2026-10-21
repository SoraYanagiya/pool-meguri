import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './lib/auth'
import { MyDataProvider } from './lib/mydata'
import { FeedPage } from './pages/FeedPage'
import { LoginPage } from './pages/LoginPage'
import { MyPage } from './pages/MyPage'
import { PoolDetailPage } from './pages/PoolDetailPage'
import { PoolEditPage } from './pages/PoolEditPage'
import { PoolHistoryPage } from './pages/PoolHistoryPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { UserPage } from './pages/UserPage'
import { VisitFormPage } from './pages/VisitFormPage'
import { WelcomePage } from './pages/WelcomePage'

/** 初回ログイン直後に一度だけ任意アンケートへ案内する */
function OnboardingRedirect() {
  const { session, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!session || !profile || profile.onboarded_at) return
    if (location.pathname === '/welcome') return
    const next = encodeURIComponent(location.pathname + location.search)
    navigate(`/welcome?next=${next}`, { replace: true })
  }, [session, profile, location.pathname, location.search, navigate])

  return null
}

function NotFound() {
  return (
    <main className="page">
      <div className="empty">ページが見つかりません。</div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MyDataProvider>
          <OnboardingRedirect />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<SearchPage />} />
              <Route path="pools/new" element={<PoolEditPage />} />
              <Route path="pools/:id" element={<PoolDetailPage />} />
              <Route path="pools/:id/edit" element={<PoolEditPage />} />
              <Route path="pools/:id/history" element={<PoolHistoryPage />} />
              <Route path="pools/:id/log" element={<VisitFormPage />} />
              <Route path="visits" element={<FeedPage />} />
              <Route path="visits/:visitId/edit" element={<VisitFormPage />} />
              <Route path="me" element={<MyPage />} />
              <Route path="me/settings" element={<SettingsPage />} />
              <Route path="users/:id" element={<UserPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="welcome" element={<WelcomePage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </MyDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
