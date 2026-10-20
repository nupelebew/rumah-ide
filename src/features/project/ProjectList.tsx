import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Columns3, Dices, Plus } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Choice, Empty, IconButton, Label, MultiChoice, PageHeader, SampleBadge, Section, cx } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { db } from '../../db/db'
import type { Idea, ShootSession } from '../../db/types'
import type { Platform } from '../../lib/platform'
import { navigate } from '../../lib/router'
import { relativeDay, toDateKey } from '../../lib/dates'
import { GOALS, TARGET_PLATFORMS } from '../content/contentMeta'
import { STEPS, createProject, nextHint, projectShoot, stepOf } from './projectOps'

interface Row {
  idea: Idea
  shoot?: ShootSession
}

export async function loadProjects(): Promise<Row[]> {
  const ideas = await db.ideas.where('kind').equals('content').toArray()
  const rows = await Promise.all(ideas.map(async (idea) => ({ idea, shoot: await projectShoot(idea) })))
  return rows.sort((a, b) => b.idea.updatedAt - a.idea.updatedAt)
}

export default function ProjectList() {
  const rows = useLiveQuery(loadProjects, [])
  const [creating, setCreating] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const active = rows?.filter((r) => stepOf(r.idea.stage) < STEPS.length) ?? []
  const done = rows?.filter((r) => stepOf(r.idea.stage) >= STEPS.length) ?? []

  return (
    <Page>
      <PageHeader
        kicker="Video"
        title="Proyek"
        actions={
          <>
            <IconButton label="Jadwal syuting" onClick={() => navigate('syuting')}>
              <CalendarDays size={21} />
            </IconButton>
            <IconButton label="Tampilan papan" onClick={() => navigate('papan')}>
              <Columns3 size={21} />
            </IconButton>
          </>
        }
      />
      <div className="px-4">
        <Button variant="primary" size="lg" block icon={<Plus size={22} />} onClick={() => setCreating(true)}>
          Proyek baru
        </Button>
      </div>

      <Section title={active.length ? `Berjalan · ${active.length}` : undefined}>
        {rows && !active.length ? (
          <Empty title="Belum ada proyek" text="Satu proyek = satu video. Aplikasi menuntun 5 langkah: Konsep → Referensi → Video contoh → Syuting → Edit." />
        ) : (
          <ul className="space-y-2">
            {active.map((r) => (
              <ProjectCard key={r.idea.id} row={r} />
            ))}
          </ul>
        )}
        <button type="button" onClick={() => navigate('acak')} className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2">
          <Dices size={18} /> Butuh ide? Acak kombinasi
        </button>
      </Section>

      {done.length > 0 && (
        <Section>
          <button type="button" onClick={() => setShowDone((v) => !v)} className="flex min-h-11 w-full items-center justify-between">
            <span className="font-bold">Selesai</span>
            <span className="font-mono text-sm text-ink-3">{showDone ? 'tutup' : done.length}</span>
          </button>
          {showDone && (
            <ul className="mt-2 space-y-2 opacity-80">
              {done.map((r) => (
                <ProjectCard key={r.idea.id} row={r} />
              ))}
            </ul>
          )}
        </Section>
      )}

      <NewProjectSheet open={creating} onClose={() => setCreating(false)} />
    </Page>
  )
}

export function ProjectCard({ row, compact }: { row: Row; compact?: boolean }) {
  const { idea, shoot } = row
  const step = stepOf(idea.stage)
  const today = shoot?.date === toDateKey()
  return (
    <li>
      <button type="button" onClick={() => navigate(`konten/${idea.id}`)} className={cx('sketch block w-full p-3.5 text-left active:translate-y-px', today && 'border-accent')}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold">{idea.title}</span>
          {idea.sample && <SampleBadge />}
        </div>
        {idea.client && <div className="text-xs text-ink-3">{idea.client}</div>}
        <div className="mt-2 flex gap-1">
          {STEPS.map((s, i) => (
            <span key={s.key} className={cx('h-1.5 flex-1 rounded-full', i < step ? 'bg-ok' : i === step ? 'bg-accent' : 'bg-paper-2')} />
          ))}
        </div>
        {!compact && (
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-2">{step < STEPS.length ? `${step + 1}. ${STEPS[step].label}` : 'Selesai'}</span>
            <span className={cx('font-mono', today ? 'font-bold text-accent' : 'text-ink-3')}>
              {shoot?.date && step <= 3 ? `Syuting ${relativeDay(shoot.date)}${shoot.start ? ` ${shoot.start}` : ''}` : nextHint(idea, shoot)}
            </span>
          </div>
        )}
      </button>
    </li>
  )
}

export function NewProjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [goal, setGoal] = useState<Idea['goal']>()
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram'])
  const [duration, setDuration] = useState<string | undefined>('30')
  const create = async () => {
    const idea = await createProject({ title: title.trim() || 'Proyek baru', client: client.trim() || undefined, goal, platforms, durationTarget: duration ? +duration : undefined })
    setTitle('')
    setClient('')
    onClose()
    navigate(`konten/${idea.id}`)
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Proyek baru"
      footer={
        <Button variant="primary" size="lg" block onClick={create}>
          Buat & mulai
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Nama proyek</Label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Reel tenis 75" className="field" />
        </div>
        <div>
          <Label hint="Kosongkan kalau proyek pribadi">Klien</Label>
          <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="mis. Klub Tenis 75" className="field" />
        </div>
        <div>
          <Label>Tujuan</Label>
          <Choice options={GOALS} value={goal} onChange={setGoal} allowNone />
        </div>
        <div>
          <Label>Platform</Label>
          <MultiChoice options={TARGET_PLATFORMS.slice(0, 3)} value={platforms} onChange={setPlatforms} />
        </div>
        <div>
          <Label>Durasi</Label>
          <Choice options={[15, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} dtk` }))} value={duration} onChange={setDuration} allowNone />
        </div>
      </div>
    </Sheet>
  )
}
