import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// 未設定でも画面を表示できるよう、ダミー値でクライアントを作る（通信は失敗する）
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type OAuthProvider = 'google' | 'github' | 'twitter' | 'x' | 'discord' | 'apple'

const SUPPORTED: OAuthProvider[] = ['google', 'github', 'twitter', 'x', 'discord', 'apple']

/** VITE_AUTH_PROVIDERS（カンマ区切り）で有効なログイン方法を切り替える */
export const enabledProviders: OAuthProvider[] = (
  (import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? 'google,github'
)
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is OAuthProvider => (SUPPORTED as string[]).includes(s))
