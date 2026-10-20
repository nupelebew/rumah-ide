import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, ClipboardCheck, Flame, Inbox, Plus, X, History, CircleHelp } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, CheckRow, IconButton, PageHeader, Section, cx } from '../../components/ui'
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
import { NewProjectSheet, ProjectCard, loadProjects } from '../project/ProjectList'
import { STEPS, stepOf } from '../project/projectOps'

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
    const [raw, tasks, habits, shoots, review, projects] = await Promise.all([
      db.ideas.where('kind').equals('raw').count(),
      db.tasks.filter((t) => !t.done && !!t.due && t.due <= today).toArray(),
      db.habits.filter((h) => !h.archived).toArray(),
      db.shoots.where('date').equals(today).toArray(),
      db.reviews.get(weekStart(today)),
      loadProjects(),
    ])
    const active = projects.filter((r) => stepOf(r.idea.stage) < STEPS.length)
    // syuting hari ini dulu, lalu yang terakhir disentuh
    active.sort((a, b) => Number(b.shoot?.date === today) - Number(a.shoot?.date === today))
    const projectShootIds = new Set(active.map((r) => r.shoot?.id))
    return {
      raw,
      tasks,
      habits,
      shoots: shoots.filter((x) => !projectShootIds.has(x.id)),
      reviewed: !!review,
      projects: active.slice(0, 3),
      moreProjects: Math.max(0, active.length - 3),
    }
  }, [today])
  const [picking, setPicking] = useState(false)
  const [newProject, setNewProject] = useState(false)
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
      <PageHeader
        kicker={formatDate(today)}
        title="Hari Ini"
        actions={
          <IconButton label="Panduan" onClick={() => navigate('panduan')}>
            <CircleHelp size={22} />
          </IconButton>
        }
      />
      <GuideBanner />

      {glance && (
        <Section
          title="Lanjutkan"
          action={
            glance.moreProjects > 0 && (
              <button type="button" onClick={() => navigate('konten')} className="min-h-11 text-sm font-semibold text-ink-2">
                +{glance.moreProjects} lagi →
              </button>
            )
          }
        >
          {glance.projects.length ? (
            <ul className="space-y-2">
              {glance.projects.map((r) => (
                <ProjectCard key={r.idea.id} row={r} />
              ))}
            </ul>
          ) : (
            <Button variant="primary" size="lg" block icon={<Plus size={20} />} onClick={() => setNewProject(true)}>
              Mulai proyek video
            </Button>
          )}
          {glance.shoots.map((s) => (
            <button key={s.id} type="button" onClick={() => navigate(`syuting/${s.id}`)} className="sketch mt-2 flex w-full items-center gap-3 border-accent p-3 text-left">
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
        </Section>
      )}

      <Section title={<span>Prioritas {picks?.length ? <span className="font-mono text-sm font-normal text-ink-3">{doneCount}/{picks.length}</span> : null}</span>}>
        <ol className="space-y-2">
          {(picks ?? []).map((p, i) => (
            <li key={p.type + p.id} className={cx('sketch flex min-h-16 items-center gap-3 px-3 py-2', p.done && 'opacity-70')}>
              <span className={cx('font-display text-2xl leading-none font-bold', p.done ? 'text-ok' : 'text-accent')}>{i + 1}</span>
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
              <button type="button" aria-label="Lepas dari Hari Ini" onClick={() => togglePick(p.type, p.id)} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-3 active:bg-paper-2">
                <X size={19} />
              </button>
            </li>
          ))}
        </ol>
        {(picks?.length ?? 0) < TODAY_MAX && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-ink-3 px-3 text-left text-sm font-medium text-ink-2 active:bg-paper-2"
          >
            <Plus size={18} /> {picks?.length ? 'Tambah prioritas' : 'Pilih sampai 3 hal terpenting hari ini'}
          </button>
        )}
      </Section>

      {glance && (glance.tasks.length > 0 || glance.habits.length > 0) && (
        <Section
          title="Tugas & kebiasaan"
          action={
            <button type="button" onClick={() => navigate('harian')} className="min-h-11 text-sm font-semibold text-ink-2">
              Semua →
            </button>
          }
        >
          {glance.tasks.length > 0 && (
            <div className="sketch divide-y-[1.5px] divide-line px-3">
              {glance.tasks.slice(0, 5).map((t) => (
                <CheckRow key={t.id} checked={t.done} onToggle={() => toggleTask(t)} sub={t.due && t.due < today ? 'Terlambat' : undefined}>
                  {t.title}
                </CheckRow>
              ))}
            </div>
          )}
          {glance.habits.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
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
          )}
        </Section>
      )}

      {glance && (
        <Section>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => navigate(glance.raw ? 'rapikan' : 'tangkap')} className="sketch flex min-h-16 flex-col justify-center p-3 text-left">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Inbox size={17} /> Inbox
              </span>
              <span className="text-xs text-ink-3">{glance.raw ? `${glance.raw} ide perlu dirapikan` : 'Kosong'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('review')}
              className={cx('sketch flex min-h-16 flex-col justify-center p-3 text-left', !glance.reviewed && (dow === 0 || dow === 6) && 'border-accent')}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <History size={17} /> Review
              </span>
              <span className="text-xs text-ink-3">{glance.reviewed ? 'Minggu ini sudah' : 'Minggu ini belum'}</span>
            </button>
          </div>
        </Section>
      )}

      <NewProjectSheet open={newProject} onClose={() => setNewProject(false)} />
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
        title: 'Proyek aktif',
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

const GUIDE_KEY = 'rumah-ide.guideSeen'

/** Sapaan sekali untuk pengguna baru; bisa ditutup. */
function GuideBanner() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  if (hidden) return null
  const close = () => {
    try {
      localStorage.setItem(GUIDE_KEY, '1')
    } catch {
      /* abaikan */
    }
    setHidden(true)
  }
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-[14px] bg-ink p-3 text-paper">
      <CircleHelp size={22} className="shrink-0" />
      <button type="button" onClick={() => (close(), navigate('panduan'))} className="flex-1 text-left text-sm">
        <b>Baru di sini?</b> Baca panduan 3 menit, termasuk alur referensi → syuting pakai Claude.
      </button>
      <button type="button" onClick={close} aria-label="Tutup" className="flex size-10 shrink-0 items-center justify-center rounded-lg">
        <X size={18} />
      </button>
    </div>
  )
}
