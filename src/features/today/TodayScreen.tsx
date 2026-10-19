import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, ClipboardCheck, Flame, Inbox, Plus, X, History } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, CheckRow, PageHeader, Section, cx } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { db } from '../../db/db'
import { resolveEntity, TYPE_LABEL, type EntityInfo } from '../../db/entities'
import { togglePick, TODAY_MAX } from '../../db/repo'
import type { EntityType, ID } from '../../db/types'
import { formatDate, toDateKey, weekStart } from '../../lib/dates'
import { navigate } from '../../lib/router'
import { currentStreak } from '../../lib/streak'
import { toast } from '../../components/Toast'
import { toggleHabitToday, toggleTask } from '../daily/DailyScreen'
import { STAGE_LABEL } from '../content/contentMeta'

interface PickInfo extends EntityInfo {
  done?: boolean
}

/** Halaman Hari Ini: maksimal 3 hal prioritas supaya tidak kewalahan. */
export default function TodayScreen() {
  const today = toDateKey()
  const picks = useLiveQuery(async () => {
    const p = await db.today.get(today)
    const out: PickInfo[] = []
    for (const it of p?.items ?? []) {
      const info = await resolveEntity(it.type, it.id)
      if (!info) continue
      let done: boolean | undefined
      if (it.type === 'task') done = (await db.tasks.get(it.id))?.done
      if (it.type === 'habit') done = (await db.habits.get(it.id))?.checkins.includes(today)
      if (it.type === 'shoot') {
        const s = await db.shoots.get(it.id)
        done = !!s && s.shots.length > 0 && s.shots.every((x) => x.done)
      }
      out.push({ ...info, done })
    }
    return out
  }, [today])
  const glance = useLiveQuery(async () => {
    const [raw, tasks, habits, shoots, review] = await Promise.all([
      db.ideas.where('kind').equals('raw').count(),
      db.tasks.filter((t) => !t.done && !!t.due && t.due <= today).toArray(),
      db.habits.filter((h) => !h.archived).toArray(),
      db.shoots.where('date').equals(today).toArray(),
      db.reviews.get(weekStart(today)),
    ])
    return { raw, tasks, habits, shoots, reviewed: !!review }
  }, [today])
  const [picking, setPicking] = useState(false)
  const slots = Array.from({ length: TODAY_MAX }, (_, i) => picks?.[i])
  const doneCount = picks?.filter((p) => p.done).length ?? 0
  const dow = new Date().getDay()

  const toggleDone = async (p: PickInfo) => {
    if (p.type === 'task') {
      const t = await db.tasks.get(p.id)
      if (t) await toggleTask(t)
    } else if (p.type === 'habit') {
      const h = await db.habits.get(p.id)
      if (h) await toggleHabitToday(h)
    } else navigate(p.route)
  }

  return (
    <Page>
      <PageHeader kicker={formatDate(today)} title="Hari Ini" />
      <div className="px-4">
        <p className="mb-3 text-sm text-ink-2">
          {picks?.length ? `${doneCount} dari ${picks.length} beres. Fokus ke ini dulu, sisanya bisa nanti.` : 'Pilih maksimal 3 hal terpenting hari ini. Sisanya biar menunggu.'}
        </p>
        <ol className="space-y-2.5">
          {slots.map((p, i) =>
            p ? (
              <li key={p.type + p.id} className={cx('sketch flex min-h-20 items-center gap-3 p-3', p.done && 'opacity-70')}>
                <span className={cx('font-display text-3xl leading-none font-bold', p.done ? 'text-ok' : 'text-accent')}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  {p.type === 'task' || p.type === 'habit' ? (
                    <CheckRow checked={!!p.done} onToggle={() => toggleDone(p)} sub={TYPE_LABEL[p.type]}>
                      {p.title}
                    </CheckRow>
                  ) : (
                    <button type="button" onClick={() => navigate(p.route)} className="block w-full py-1 text-left">
                      <div className="kicker">{p.sub}</div>
                      <div className={cx('font-semibold break-words', p.done && 'line-through')}>{p.title}</div>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Lepas dari Hari Ini"
                  onClick={() => togglePick(p.type, p.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-3 active:bg-paper-2"
                >
                  <X size={19} />
                </button>
              </li>
            ) : (
              <li key={`empty-${i}`}>
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="flex min-h-20 w-full items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-ink-3 px-3 text-left text-ink-2 active:bg-paper-2"
                >
                  <span className="font-display text-3xl leading-none font-bold text-line">{i + 1}</span>
                  <span className="flex-1 font-medium">Pilih prioritas</span>
                  <Plus size={20} />
                </button>
              </li>
            ),
          )}
        </ol>
      </div>

      {glance && (
        <Section title="Sekilas">
          <div className="space-y-2">
            {glance.shoots.map((s) => (
              <button key={s.id} type="button" onClick={() => navigate(`syuting/${s.id}`)} className="sketch flex w-full items-center gap-3 border-accent p-3 text-left">
                <ClipboardCheck className="shrink-0 text-accent" size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Syuting: {s.title}</span>
                  <span className="font-mono text-xs text-ink-3">
                    {s.start ?? ''} · {s.shots.filter((x) => x.done).length}/{s.shots.length} shot
                  </span>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
            {glance.habits.length > 0 && (
              <div className="sketch p-3">
                <div className="kicker mb-1">Kebiasaan</div>
                <div className="flex flex-wrap gap-2">
                  {glance.habits.map((h) => {
                    const on = h.checkins.includes(today)
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => toggleHabitToday(h)}
                        aria-pressed={on}
                        className={cx('inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-sm font-medium', on ? 'border-ok bg-ok-soft' : 'border-line bg-card')}
                      >
                        <Flame size={16} className={on ? 'text-ok' : 'text-ink-3'} fill={on ? 'currentColor' : 'none'} />
                        {h.title}
                        <span className="font-mono text-xs text-ink-3">{currentStreak(h.checkins, today)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {glance.tasks.length > 0 && (
              <button type="button" onClick={() => navigate('harian?tab=tugas')} className="sketch flex w-full items-center gap-3 p-3 text-left">
                <span className="font-display text-2xl font-bold">{glance.tasks.length}</span>
                <span className="flex-1 text-sm">tugas jatuh tempo hari ini / terlambat</span>
                <ArrowRight size={18} />
              </button>
            )}
            {glance.raw > 0 && (
              <button type="button" onClick={() => navigate('rapikan')} className="sketch flex w-full items-center gap-3 p-3 text-left">
                <Inbox size={22} className="shrink-0 text-ink-2" />
                <span className="flex-1 text-sm">
                  <b>{glance.raw} ide mentah</b> menunggu dirapikan
                </span>
                <ArrowRight size={18} />
              </button>
            )}
            {!glance.reviewed && (dow === 0 || dow === 1 || dow === 5 || dow === 6) && (
              <button type="button" onClick={() => navigate('review')} className="sketch flex w-full items-center gap-3 bg-paper-2 p-3 text-left">
                <History size={22} className="shrink-0" />
                <span className="flex-1 text-sm">
                  <b>Review Mingguan</b> belum diisi. 2 menit saja.
                </span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </Section>
      )}

      <PickSheet open={picking} onClose={() => setPicking(false)} picked={picks?.map((p) => p.id) ?? []} />
    </Page>
  )
}

function PickSheet({ open, onClose, picked }: { open: boolean; onClose: () => void; picked: ID[] }) {
  const today = toDateKey()
  const groups = useLiveQuery(async () => {
    if (!open) return []
    const [tasks, habits, ideas, shoots] = await Promise.all([
      db.tasks.filter((t) => !t.done).toArray(),
      db.habits.filter((h) => !h.archived && !h.checkins.includes(today)).toArray(),
      db.ideas.toArray(),
      db.shoots.filter((s) => !!s.date && s.date >= today).toArray(),
    ])
    const g: { title: string; items: { type: EntityType; id: ID; title: string; sub: string }[] }[] = [
      { title: 'Syuting', items: shoots.sort((a, b) => a.date!.localeCompare(b.date!)).map((s) => ({ type: 'shoot', id: s.id, title: s.title, sub: s.date === today ? 'Hari ini' : s.date! })) },
      {
        title: 'Tugas',
        items: tasks.sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9')).map((t) => ({ type: 'task', id: t.id, title: t.title, sub: t.due ? (t.due < today ? 'Terlambat' : t.due === today ? 'Hari ini' : t.due) : 'Tanpa tanggal' })),
      },
      { title: 'Kebiasaan', items: habits.map((h) => ({ type: 'habit', id: h.id, title: h.title, sub: `streak ${currentStreak(h.checkins, today)}` })) },
      {
        title: 'Ide Konten aktif',
        items: ideas.filter((i) => i.kind === 'content' && i.stage !== 'selesai').map((i) => ({ type: 'idea', id: i.id, title: i.title, sub: STAGE_LABEL[i.stage ?? 'ide'] })),
      },
      { title: 'Ide keseharian', items: ideas.filter((i) => i.kind === 'daily').map((i) => ({ type: 'idea', id: i.id, title: i.title, sub: 'Keseharian' })) },
    ]
    return g.filter((x) => x.items.length)
  }, [open, today])
  const full = picked.length >= TODAY_MAX
  return (
    <Sheet open={open} onClose={onClose} title={`Pilih prioritas (${picked.length}/${TODAY_MAX})`}>
      {full && <p className="mb-3 rounded-xl bg-warn-soft p-3 text-sm">Sudah 3. Lepas satu dulu di halaman Hari Ini kalau mau ganti.</p>}
      <div className="space-y-4">
        {groups?.map((g) => (
          <div key={g.title}>
            <div className="kicker mb-1.5">{g.title}</div>
            <div className="space-y-1.5">
              {g.items.slice(0, 12).map((it) => {
                const on = picked.includes(it.id)
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={full && !on}
                    onClick={async () => {
                      const r = await togglePick(it.type, it.id)
                      if (r === 'full') toast('Hari Ini sudah 3 hal')
                    }}
                    className={cx('flex min-h-12 w-full items-center gap-3 rounded-xl border-[1.5px] px-3 py-2 text-left disabled:opacity-40', on ? 'border-ink bg-ink text-paper' : 'border-line bg-card')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.title}</span>
                      <span className={cx('text-xs', on ? 'text-paper/70' : 'text-ink-3')}>{it.sub}</span>
                    </span>
                    {on && <span className="font-mono text-xs">dipilih</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {groups && !groups.length && <p className="py-6 text-center text-sm text-ink-3">Belum ada tugas, kebiasaan, atau ide aktif. Tambah lewat tombol +.</p>}
      </div>
      <Button variant="ink" block size="lg" className="mt-4" onClick={onClose}>
        Selesai
      </Button>
    </Sheet>
  )
}
