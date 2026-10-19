import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarArrowDown, CalendarPlus, Plus } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, CheckRow, Empty, PageHeader, SampleBadge, Section } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { checkItems, newShoot, DEFAULT_PREP } from '../../db/factories'
import type { ShootSession } from '../../db/types'
import { navigate } from '../../lib/router'
import { relativeDay, toDateKey } from '../../lib/dates'
import { downloadBlob, pickFiles } from '../../lib/file'
import { parseIcs, type IcsEvent } from '../../lib/ics'
import { ContentTabs } from '../content/ContentBoard'
import { shootsToIcs } from './shootOps'

const SHOOT_WORDS = /\b(take|syuting|shoot|rekam)\b/i
const NOT_SHOOT = /review|rapikan|siap|istirahat|edit|santai|jeda/i

export default function ShootList() {
  const shoots = useLiveQuery(() => db.shoots.toArray(), [])
  const [events, setEvents] = useState<IcsEvent[] | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const today = toDateKey()
  const all = shoots ?? []
  const upcoming = all.filter((s) => !s.date || s.date >= today).sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.start ?? '').localeCompare(b.start ?? ''))
  const past = all.filter((s) => s.date && s.date < today).sort((a, b) => b.date!.localeCompare(a.date!))

  const create = async () => {
    const s = newShoot('Sesi syuting baru', { date: today, prep: checkItems(DEFAULT_PREP) })
    await db.shoots.add(s)
    navigate(`syuting/${s.id}`)
  }
  const importIcs = async () => {
    const [f] = await pickFiles('.ics,text/calendar')
    if (!f) return
    const evs = parseIcs(await f.text()).filter((e) => !e.allDay && e.date >= today)
    const known = new Set(all.map((s) => s.icsUid))
    const fresh = evs.filter((e) => !known.has(e.uid))
    if (!fresh.length) return toast('Tidak ada jadwal baru di file itu')
    setEvents(fresh.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)))
    setPicked(fresh.filter((e) => SHOOT_WORDS.test(e.summary) && !NOT_SHOOT.test(e.summary)).map((e) => e.uid))
  }
  const confirmImport = async () => {
    const chosen = events!.filter((e) => picked.includes(e.uid))
    await db.shoots.bulkAdd(
      chosen.map((e) => newShoot(e.summary, { date: e.date, start: e.start, end: e.end, location: e.location ?? '', notes: e.description ?? '', icsUid: e.uid, prep: checkItems(DEFAULT_PREP) })),
    )
    toast(`${chosen.length} jadwal syuting diimpor`)
    setEvents(null)
  }
  const exportIcs = () => {
    const withDate = all.filter((s) => s.date && s.date >= today)
    if (!withDate.length) return toast('Belum ada syuting terjadwal')
    downloadBlob(new Blob([shootsToIcs(withDate)], { type: 'text/calendar' }), `syuting-rumah-ide-${today}.ics`)
  }

  return (
    <Page>
      <PageHeader
        kicker="Mode 3"
        title="Syuting"
        actions={
          <Button size="sm" variant="ink" icon={<Plus size={16} />} onClick={create}>
            Baru
          </Button>
        }
      >
        <ContentTabs value="syuting" />
      </PageHeader>

      <div className="grid grid-cols-2 gap-2 px-4">
        <Button icon={<CalendarArrowDown size={18} />} onClick={importIcs}>
          Impor .ics
        </Button>
        <Button icon={<CalendarPlus size={18} />} onClick={exportIcs}>
          Ekspor ke kalender
        </Button>
      </div>
      <p className="mt-1.5 px-4 text-xs text-ink-3">Tukar jadwal dengan Ritme / Google Calendar lewat file .ics.</p>

      <Section title="Akan datang">
        {upcoming.length === 0 ? (
          <Empty title="Belum ada jadwal syuting" text="Buat dari Referensi Utama (paling lengkap), impor jadwal dari Ritme, atau ketuk “Baru”." />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <ShootRow key={s.id} s={s} />
            ))}
          </ul>
        )}
      </Section>
      {past.length > 0 && (
        <Section title="Sudah lewat">
          <ul className="space-y-2 opacity-80">
            {past.map((s) => (
              <ShootRow key={s.id} s={s} />
            ))}
          </ul>
        </Section>
      )}

      <Sheet
        open={!!events}
        onClose={() => setEvents(null)}
        title="Pilih yang jadi sesi syuting"
        footer={
          <Button variant="primary" size="lg" block disabled={!picked.length} onClick={confirmImport}>
            Impor {picked.length} jadwal
          </Button>
        }
      >
        <p className="mb-2 text-sm text-ink-2">Jadwal yang namanya diawali “take / syuting / shoot” sudah dicentang. Sesuaikan sendiri.</p>
        <div className="divide-y-[1.5px] divide-line">
          {events?.map((e) => (
            <CheckRow key={e.uid} checked={picked.includes(e.uid)} onToggle={() => setPicked((p) => (p.includes(e.uid) ? p.filter((x) => x !== e.uid) : [...p, e.uid]))} sub={`${relativeDay(e.date)} · ${e.start}–${e.end ?? ''}${e.categories ? ` · ${e.categories}` : ''}`}>
              {e.summary}
            </CheckRow>
          ))}
        </div>
      </Sheet>
    </Page>
  )
}

function ShootRow({ s }: { s: ShootSession }) {
  const done = s.shots.filter((x) => x.done).length
  const pct = s.shots.length ? Math.round((done / s.shots.length) * 100) : 0
  return (
    <li>
      <button type="button" onClick={() => navigate(`syuting/${s.id}`)} className="sketch w-full p-3.5 text-left active:translate-y-px">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold">{s.title}</span>
          {s.sample && <SampleBadge />}
        </div>
        <div className="mt-0.5 font-mono text-xs text-ink-3">
          {s.date ? relativeDay(s.date) : 'Tanpa tanggal'}
          {s.start ? ` · ${s.start}${s.end ? `–${s.end}` : ''}` : ''}
          {s.location ? ` · ${s.location}` : ''}
        </div>
        {s.shots.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs">
              {done}/{s.shots.length}
            </span>
          </div>
        )}
      </button>
    </li>
  )
}
