import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Chip, ChipRow, Empty, PageHeader } from '../../components/ui'
import { db } from '../../db/db'
import { searchIndex, TYPE_LABEL } from '../../db/entities'
import { navigate } from '../../lib/router'

/** Pencarian global di semua mode + filter tag bersama. */
export default function SearchScreen() {
  const index = useLiveQuery(() => searchIndex(), []) ?? []
  const tags = useLiveQuery(() => db.tags.orderBy('name').toArray(), []) ?? []
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string>()
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length && !tag) return []
    return index.filter((e) => words.every((w) => e.text.includes(w)) && (!tag || e.text.includes(`#${tag}`) || e.text.includes(` ${tag}`))).slice(0, 80)
  }, [index, q, tag])

  return (
    <Page>
      <PageHeader title="Cari" backTo="hari-ini" />
      <div className="px-4">
        <div className="relative">
          <Search size={20} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
          <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ide, referensi, tugas, catatan…" className="field min-h-14 pl-11 text-base" />
        </div>
      </div>
      {tags.length > 0 && (
        <ChipRow className="mt-2 px-4">
          {tags.map((t) => (
            <Chip key={t.id} active={tag === t.name} onClick={() => setTag(tag === t.name ? undefined : t.name)}>
              #{t.name}
            </Chip>
          ))}
        </ChipRow>
      )}
      <div className="px-4 pt-3">
        {!q && !tag ? (
          <p className="text-sm text-ink-3">Cari di semua mode sekaligus: judul, isi bedah ATM, hook, catatan, dan tag.</p>
        ) : !results.length ? (
          <Empty title="Tidak ketemu" text="Coba kata lain yang lebih pendek." />
        ) : (
          <ul className="space-y-1.5">
            {results.map((r) => (
              <li key={r.type + r.id}>
                <button type="button" onClick={() => navigate(r.route)} className="sketch block min-h-14 w-full px-3.5 py-2.5 text-left active:translate-y-px">
                  <div className="kicker">{TYPE_LABEL[r.type]}</div>
                  <div className="font-medium break-words">{r.title}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  )
}
