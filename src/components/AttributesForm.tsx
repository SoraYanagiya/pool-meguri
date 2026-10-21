import { useState, type FormEvent, type ReactNode } from 'react'
import { errorMessage } from '../lib/errors'
import { AGE_GROUPS, GENDERS } from '../lib/fields'
import type { AgeGroup, Gender, ProfileAttributes } from '../lib/types'
import { ErrorNotice } from './common'

type Props = {
  initial: ProfileAttributes | null
  submitLabel: string
  onSubmit: (v: ProfileAttributes) => Promise<void>
  secondary?: ReactNode
}

/** 年代・性別の任意回答フォーム。どちらも「回答しない」を選べる */
export function AttributesForm({ initial, submitLabel, onSubmit, secondary }: Props) {
  const [age, setAge] = useState<AgeGroup | ''>(initial?.age_group ?? '')
  const [gender, setGender] = useState<Gender | ''>(initial?.gender ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit({ age_group: age || null, gender: gender || null })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      <label className="field">
        <span>年代</span>
        <select value={age} onChange={(e) => setAge(e.target.value as AgeGroup | '')}>
          <option value="">回答しない</option>
          {AGE_GROUPS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>性別</span>
        <select value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
          <option value="">回答しない</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      {error && <ErrorNotice>保存できませんでした。{error}</ErrorNotice>}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {submitLabel}
        </button>
        {secondary}
      </div>
    </form>
  )
}
