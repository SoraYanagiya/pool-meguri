import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> = {
  data: T | undefined
  error: Error | null
  loading: boolean
  reload: () => void
}

/** 非同期関数の結果を状態として持つ。deps が変わると再実行する */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fn()
      .then((d) => {
        if (!active) return
        setData(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
