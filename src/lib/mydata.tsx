import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { addWish, getMyAttributes, listMyVisited, listMyWishes, listPools, removeWish } from './api'
import { toError } from './errors'
import type { Pool, ProfileAttributes, VisitedSummary } from './types'

type MyData = {
  pools: Pool[]
  poolsError: Error | null
  poolsLoading: boolean
  visited: Map<string, VisitedSummary>
  wishes: Set<string>
  /** 本人の年代・性別（カロリー概算に使う。未回答は null） */
  attributes: ProfileAttributes | null
  /** マイページで制覇状況を見る都道府県 */
  area: string
  setArea: (v: string) => void
  toggleWish: (poolId: string) => Promise<void>
  refresh: () => Promise<void>
}

const MyDataContext = createContext<MyData | null>(null)

const AREA_KEY = 'pool-meguri:area'
const DEFAULT_AREA = '東京都'

function loadArea(): string {
  try {
    return localStorage.getItem(AREA_KEY) || DEFAULT_AREA
  } catch {
    return DEFAULT_AREA
  }
}

/** 施設一覧と、ログインユーザーの訪問済み・気になる・属性を全画面で共有する */
export function MyDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null

  const [pools, setPools] = useState<Pool[]>([])
  const [poolsError, setPoolsError] = useState<Error | null>(null)
  const [poolsLoading, setPoolsLoading] = useState(true)
  const [visited, setVisited] = useState<Map<string, VisitedSummary>>(new Map())
  const [wishes, setWishes] = useState<Set<string>>(new Set())
  const [attributes, setAttributes] = useState<ProfileAttributes | null>(null)
  const [area, setAreaState] = useState(loadArea)

  const refresh = useCallback(async () => {
    try {
      setPools(await listPools())
      setPoolsError(null)
    } catch (e) {
      setPoolsError(toError(e))
    } finally {
      setPoolsLoading(false)
    }
    if (userId) {
      try {
        const [v, w, a] = await Promise.all([listMyVisited(), listMyWishes(), getMyAttributes()])
        setVisited(new Map(v.map((x) => [x.pool_id, x])))
        setWishes(new Set(w))
        setAttributes(a)
      } catch {
        // 個人データの取得失敗は施設の閲覧を妨げない
      }
    } else {
      setVisited(new Map())
      setWishes(new Set())
      setAttributes(null)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setArea = useCallback((v: string) => {
    setAreaState(v)
    try {
      localStorage.setItem(AREA_KEY, v)
    } catch {
      // 保存できなくても動作は続ける
    }
  }, [])

  const toggleWish = useCallback(
    async (poolId: string) => {
      if (!userId) return
      const had = wishes.has(poolId)
      const flip = (add: boolean) =>
        setWishes((prev) => {
          const next = new Set(prev)
          if (add) next.add(poolId)
          else next.delete(poolId)
          return next
        })
      // 先に画面へ反映し、失敗したら戻す
      flip(!had)
      try {
        if (had) await removeWish(poolId, userId)
        else await addWish(poolId)
      } catch (e) {
        flip(had)
        throw e
      }
    },
    [userId, wishes],
  )

  const value = useMemo(
    () => ({
      pools,
      poolsError,
      poolsLoading,
      visited,
      wishes,
      attributes,
      area,
      setArea,
      toggleWish,
      refresh,
    }),
    [pools, poolsError, poolsLoading, visited, wishes, attributes, area, setArea, toggleWish, refresh],
  )

  return <MyDataContext.Provider value={value}>{children}</MyDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMyData(): MyData {
  const ctx = useContext(MyDataContext)
  if (!ctx) throw new Error('MyDataProvider の外で useMyData が呼ばれました')
  return ctx
}
