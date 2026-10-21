/** catch で受け取った値を Error にそろえる */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

export function errorMessage(e: unknown): string {
  return toError(e).message
}
