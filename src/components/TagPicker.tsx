import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '../db/db'
import { ensureTags } from '../db/repo'
import { Chip } from './ui'

/** Pilih tag bersama (dipakai semua mode). Tag baru otomatis masuk daftar tag global. */
export function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const all = useLiveQuery(() => db.tags.orderBy('name').toArray(), []) ?? []
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const names = [...new Set([...all.map((t) => t.name), ...value])]
  const toggle = (n: string) => onChange(value.includes(n) ? value.filter((v) => v !== n) : [...value, n])
  const add = async () => {
    const n = draft.trim().toLowerCase().replace(/^#/, '')
    if (!n) return setAdding(false)
    await ensureTags([n])
    if (!value.includes(n)) onChange([...value, n])
    setDraft('')
    setAdding(false)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {names.map((n) => (
        <Chip key={n} active={value.includes(n)} onClick={() => toggle(n)}>
          #{n}
        </Chip>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="tag baru"
          className="field min-h-11 w-32 rounded-full py-1.5"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-11 items-center gap-1 rounded-full border-[1.5px] border-dashed border-ink-3 px-3.5 text-sm font-medium text-ink-2"
        >
          <Plus size={16} /> Tag
        </button>
      )}
    </div>
  )
}

export const ENERGY_OPTIONS = [
  { value: 'kecil' as const, label: 'Energi kecil' },
  { value: 'sedang' as const, label: 'Sedang' },
  { value: 'besar' as const, label: 'Besar' },
]
