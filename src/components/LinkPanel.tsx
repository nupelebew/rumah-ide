import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link2, X, Search } from 'lucide-react'
import { db } from '../db/db'
import { link, linksOf, unlink } from '../db/repo'
import { allEntities, resolveEntity, TYPE_LABEL, type EntityInfo } from '../db/entities'
import type { EntityType, ID } from '../db/types'
import { Sheet } from './Sheet'
import { Button, IconButton, Label } from './ui'
import { navigate } from '../lib/router'

/** Daftar tautan sebuah entitas + tombol untuk menautkan ke ide/referensi lain. */
export function LinkPanel({ type, id, title = 'Tautan' }: { type: EntityType; id: ID; title?: string }) {
  const items = useLiveQuery(async () => {
    void (await db.links.count())
    const ls = await linksOf(type, id)
    const resolved = await Promise.all(ls.map(async (l) => ({ info: await resolveEntity(l.type, l.id), linkId: l.link.id })))
    return resolved.filter((r) => r.info) as { info: EntityInfo; linkId: ID }[]
  }, [type, id])
  const [picking, setPicking] = useState(false)

  return (
    <div>
      <Label>{title}</Label>
      <div className="space-y-1.5">
        {items?.map(({ info, linkId }) => (
          <div key={linkId} className="flex min-h-12 items-center gap-1 rounded-xl border-[1.5px] border-line bg-card pl-3">
            <button type="button" className="min-w-0 flex-1 py-2 text-left" onClick={() => navigate(info.route)}>
              <div className="kicker">{TYPE_LABEL[info.type]}</div>
              <div className="truncate text-sm font-medium">{info.title}</div>
            </button>
            <IconButton label="Lepas tautan" onClick={() => unlink(linkId)}>
              <X size={18} />
            </IconButton>
          </div>
        ))}
        <Button variant="ghost" icon={<Link2 size={18} />} onClick={() => setPicking(true)} className="border-dashed border-line">
          Tautkan ke ide / referensi
        </Button>
      </div>
      <LinkPicker
        open={picking}
        onClose={() => setPicking(false)}
        exclude={id}
        onPick={async (e) => {
          await link(type, id, e.type, e.id)
          setPicking(false)
        }}
      />
    </div>
  )
}

export function LinkPicker({
  open,
  onClose,
  onPick,
  exclude,
  types,
}: {
  open: boolean
  onClose: () => void
  onPick: (e: EntityInfo) => void
  exclude?: ID
  types?: EntityType[]
}) {
  const all = useLiveQuery(() => (open ? allEntities() : Promise.resolve([] as EntityInfo[])), [open]) ?? []
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all
      .filter((e) => e.id !== exclude && (!types || types.includes(e.type)))
      .filter((e) => !s || `${e.title} ${e.sub}`.toLowerCase().includes(s))
      .slice(0, 60)
  }, [all, q, exclude, types])
  return (
    <Sheet open={open} onClose={onClose} title="Pilih yang ditautkan">
      <div className="relative mb-3">
        <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul…" className="field pl-10" />
      </div>
      <div className="space-y-1.5">
        {list.map((e) => (
          <button key={e.type + e.id} type="button" onClick={() => onPick(e)} className="block min-h-12 w-full rounded-xl border-[1.5px] border-line bg-card px-3 py-2 text-left active:bg-paper-2">
            <div className="kicker">{TYPE_LABEL[e.type]}</div>
            <div className="truncate text-sm font-medium">{e.title}</div>
          </button>
        ))}
        {!list.length && <p className="py-6 text-center text-sm text-ink-3">Tidak ada yang cocok.</p>}
      </div>
    </Sheet>
  )
}
