import { ChevronLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AttributesForm } from '../components/AttributesForm'
import { ErrorNotice, Loading, LoginPrompt } from '../components/common'
import { deleteMyAttributes, getMyAttributes, saveMyAttributes, updateProfile } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useMyData } from '../lib/mydata'
import { useAsync } from '../lib/useAsync'

export function SettingsPage() {
  const { session, profile, loading, reloadProfile } = useAuth()
  const { refresh } = useMyData()
  const userId = session?.user.id
  const attrs = useAsync(() => (userId ? getMyAttributes() : Promise.resolve(null)), [userId])

  if (loading) return <main className="page"><Loading /></main>
  if (!session || !userId) {
    return (
      <main className="page">
        <LoginPrompt>設定を変更するにはログインしてください。</LoginPrompt>
      </main>
    )
  }

  return (
    <main className="page stack">
      <Link to="/me" className="btn btn-quiet" style={{ justifySelf: 'start' }}>
        <ChevronLeft size={18} aria-hidden />
        マイページに戻る
      </Link>
      <h1 className="h-page sign">設定</h1>

      <h2 className="h-section">プロフィール</h2>
      {profile && (
        <ProfileForm
          key={profile.id}
          initialName={profile.display_name}
          initialBio={profile.bio}
          onSave={async (display_name, bio) => {
            await updateProfile(userId, { display_name, bio })
            await reloadProfile()
          }}
        />
      )}

      <h2 className="h-section">年代と性別（任意）</h2>
      <p className="small muted" style={{ margin: 0 }}>
        消費カロリーの目安を計算する体重に使います。ほかのユーザーには表示されません。
      </p>
      {attrs.loading && <Loading />}
      {attrs.error && <ErrorNotice error={attrs.error} />}
      {!attrs.loading && !attrs.error && (
        <div className="panel">
          <AttributesForm
            key={JSON.stringify(attrs.data)}
            initial={attrs.data ?? null}
            submitLabel="保存"
            onSubmit={async (v) => {
              if (!v.age_group && !v.gender) await deleteMyAttributes(userId)
              else await saveMyAttributes(userId, v)
              attrs.reload()
              void refresh()
            }}
            secondary={
              attrs.data && (
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => void deleteMyAttributes(userId).then(() => {
                    attrs.reload()
                    void refresh()
                  })}
                >
                  回答を削除
                </button>
              )
            }
          />
        </div>
      )}
    </main>
  )
}

function ProfileForm({
  initialName,
  initialBio,
  onSave,
}: {
  initialName: string
  initialBio: string
  onSave: (name: string, bio: string) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setStatus('表示名を入力してください。')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await onSave(name.trim(), bio.trim())
      setStatus('保存しました。')
    } catch (err) {
      setStatus(`保存できませんでした。${err instanceof Error ? err.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel stack" onSubmit={(e) => void submit(e)}>
      <label className="field">
        <span>表示名</span>
        <input type="text" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>自己紹介</span>
        <textarea maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} />
        <small>{bio.length} / 200</small>
      </label>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          保存
        </button>
        {status && <span className="small" role="status">{status}</span>}
      </div>
    </form>
  )
}
