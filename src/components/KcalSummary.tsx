import { formatBalance } from '../lib/calorie'

type Props = {
  burned: number | null
  intake: number | null
  balanceLabel?: string
  /** 入力に合わせて値が変わる場面では読み上げで知らせる */
  live?: boolean
}

function kcal(v: number | null): string {
  return v === null ? '—' : v.toLocaleString('ja-JP')
}

/** 消費・摂取・収支の3項目 */
export function KcalSummary({ burned, intake, balanceLabel = '収支（目安）', live }: Props) {
  return (
    <div className="kcal" aria-live={live ? 'polite' : undefined}>
      <div>
        消費
        <strong>{kcal(burned)}</strong>
      </div>
      <div>
        摂取
        <strong>{kcal(intake)}</strong>
      </div>
      <div>
        {balanceLabel}
        <strong>{formatBalance(burned, intake) ?? '—'}</strong>
      </div>
    </div>
  )
}
