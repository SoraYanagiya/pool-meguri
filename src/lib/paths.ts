/** ?next= の値をサイト内のパスに限定する（外部サイトへの転送を防ぐ） */
export function safeNextPath(next: string | null, fallback = '/me'): string {
  const v = next ?? fallback
  return v.startsWith('/') && !v.startsWith('//') ? v : fallback
}
