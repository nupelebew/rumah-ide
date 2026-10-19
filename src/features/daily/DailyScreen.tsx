import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, MoreHorizontal, Plus, Scale, Sun, Trash2, Archive } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, CheckRow, Chip, ChipRow, Choice, Empty, IconButton, Label, PageHeader, SampleBadge, Section, Segmented, cx } from '../../components/ui'
import { IdeaSheet } from '../../components/IdeaSheet'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { newIdea, newDecision } from '../../db/factories'
import { patch, removeLinksOf, togglePick } from '../../db/repo'
import type { Category, EntityType, Habit, Task } from '../../db/types'
import { addDays, relativeDay, toDateKey } from '../../lib/dates'
import { currentStreak, lastNDays, longestStreak } from '../../lib/streak'
import { navigate, queryParam } from '../../lib/router'
import { now, uid } from '../../lib/id'

type Tab = 'ide' | 'tugas' | 'kebiasaan' | 'keputusan'

export async function pickToday(type: EntityType, id: string) {
  const r = await togglePick(type, id)
  toast(r === 'full' ? 'Hari Ini sudah 3 hal. Lepas satu dulu.' : r === 'added' ? 'Masuk Hari Ini' : 'Dilepas dari Hari Ini')
}

export async function toggleHabitToday(h: Habit) {
  const today = toDateKey()
  const checkins = h.checkins.includes(today) ? h.checkins.filter((d) => d !== today) : [...h.checkins, today]
  await patch(db.habits, h.id, { checkins })
  if (!h.checkins.includes(today)) {
    const n = currentStreak(checkins, today)
    if (n > 1) toast(`${n} hari berturut-turut`)
  }
}

export async function toggleTask(t: Task) {
  await patch(db.tasks, t.id, { done: !t.done, doneAt: !t.done ? now() : undefined })
}

export default function DailyScreen() {
  const [tab, setTab] = useState<Tab>((queryParam('tab') as Tab) || 'ide')
  const cats = useLiveQuery(() => db.categories.orderBy('name').toArray(), []) ?? []
  return (
    <Page>
      <PageHeader kicker="Mode 4" title="Ide Keseharian">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'ide', label: 'Ide' },
            { value: 'tugas', label: 'Tugas' },
            { value: 'kebiasaan', label: 'Kebiasaan' },
            { value: 'keputusan', label: 'Keputusan' },
          ]}
        />
      </PageHeader>
      {tab === 'ide' && <IdeasTab cats={cats} />}
      {tab === 'tugas' && <TasksTab cats={cats} />}
      {tab === 'kebiasaan' && <HabitsTab cats={cats} />}
      {tab === 'keputusan' && <DecisionsTab cats={cats} />}
    </Page>
  )
}

function CategoryFilter({ cats, value, onChange }: { cats: Category[]; value?: string; onChange: (v?: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const add = async () => {
    if (name.trim()) await db.categories.add({ id: uid(), name: name.trim(), createdAt: now(), updatedAt: now() })
    setName('')
    setAdding(false)
  }
  return (
    <ChipRow className="px-4">
      <Chip active={!value} onClick={() => onChange(undefined)}>
        Semua
      </Chip>
      {cats.map((c) => (
        <Chip key={c.id} active={value === c.id} onClick={() => onChange(value === c.id ? undefined : c.id)}>
          {c.name}
        </Chip>
      ))}
      {adding ? (
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={add} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Kategori" className="field min-h-11 w-32 shrink-0 rounded-full py-1.5" />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border-[1.5px] border-dashed border-ink-3 px-3.5 text-sm text-ink-2">
          <Plus size={16} /> Kategori
        </button>
      )}
    </ChipRow>
  )
}

function IdeasTab({ cats }: { cats: Category[] }) {
  const [cat, setCat] = useState<string>()
  const [text, setText] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const ideas = useLiveQuery(() => db.ideas.where('kind').equals('daily').reverse().sortBy('updatedAt'), []) ?? []
  const list = ideas.filter((i) => !cat || i.categoryId === cat)
  const catName = (id?: string) => cats.find((c) => c.id === id)?.name
  const add = async () => {
    if (!text.trim()) return
    await db.ideas.add(newIdea({ kind: 'daily', title: text.trim(), categoryId: cat }))
    setText('')
  }
  return (
    <>
      <CategoryFilter cats={cats} value={cat} onChange={setCat} />
      <div className="mt-2 flex gap-2 px-4">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={`Ide keseharian${cat ? ` (${catName(cat)})` : ''}…`} className="field min-w-0 flex-1" />
        <Button variant="primary" onClick={add} disabled={!text.trim()} aria-label="Tambah" className="w-12 px-0">
          <Plus size={20} />
        </Button>
      </div>
      <Section>
        {!list.length ? (
          <Empty title="Belum ada ide keseharian" text="Tulis di atas, atau rapikan Inbox. Tiap ide bisa diubah jadi Tugas, Kebiasaan, atau Catatan Keputusan." />
        ) : (
          <ul className="space-y-2">
            {list.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setOpen(i.id)} className="sketch flex w-full items-start gap-3 p-3.5 text-left active:translate-y-px">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{i.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                      {i.sample && <SampleBadge />}
                      {catName(i.categoryId) && <span>{catName(i.categoryId)}</span>}
                      {i.convertedTo && <Chip tone="ok">→ {i.convertedTo.type === 'task' ? 'Tugas' : i.convertedTo.type === 'habit' ? 'Kebiasaan' : 'Keputusan'}</Chip>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <IdeaSheet id={open} onClose={() => setOpen(null)} />
    </>
  )
}

function TasksTab({ cats }: { cats: Category[] }) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const [text, setText] = useState('')
  const [due, setDue] = useState<string | undefined>(toDateKey())
  const [showDone, setShowDone] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const today = toDateKey()
  const groups = useMemo(() => {
    const open = tasks.filter((t) => !t.done)
    return [
      { key: 'late', title: 'Terlambat', items: open.filter((t) => t.due && t.due < today) },
      { key: 'today', title: 'Hari ini', items: open.filter((t) => t.due === today) },
      { key: 'soon', title: 'Mendatang', items: open.filter((t) => t.due && t.due > today).sort((a, b) => a.due!.localeCompare(b.due!)) },
      { key: 'none', title: 'Kapan-kapan', items: open.filter((t) => !t.due) },
    ].filter((g) => g.items.length)
  }, [tasks, today])
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const add = async () => {
    if (!text.trim()) return
    await db.tasks.add({ id: uid(), title: text.trim(), due, done: false, createdAt: now(), updatedAt: now() })
    setText('')
  }
  return (
    <>
      <div className="space-y-2 px-4">
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Tugas baru…" className="field min-w-0 flex-1" />
          <Button variant="primary" onClick={add} disabled={!text.trim()} aria-label="Tambah" className="w-12 px-0">
            <Plus size={20} />
          </Button>
        </div>
        <Choice
          options={[
            { value: today, label: 'Hari ini' },
            { value: addDays(today, 1), label: 'Besok' },
            { value: addDays(today, 7), label: 'Minggu depan' },
          ]}
          value={due}
          onChange={setDue}
          allowNone
        />
      </div>
      {!tasks.length && (
        <Section>
          <Empty title="Belum ada tugas" text="Tambah di atas, atau ubah Ide Keseharian jadi Tugas. Tanggal opsional." />
        </Section>
      )}
      {groups.map((g) => (
        <Section key={g.key} title={<span className={cx(g.key === 'late' && 'text-accent')}>{g.title}</span>}>
          <div className="sketch divide-y-[1.5px] divide-line px-3">
            {g.items.map((t) => (
              <TaskRow key={t.id} t={t} onMore={() => setEdit(t.id)} />
            ))}
          </div>
        </Section>
      ))}
      {done.length > 0 && (
        <Section>
          <button type="button" onClick={() => setShowDone((v) => !v)} className="flex min-h-11 w-full items-center justify-between">
            <span className="font-bold">Selesai</span>
            <span className="font-mono text-sm text-ink-3">{showDone ? 'tutup' : done.length}</span>
          </button>
          {showDone && (
            <div className="divide-y-[1.5px] divide-line px-3">
              {done.slice(0, 30).map((t) => (
                <TaskRow key={t.id} t={t} onMore={() => setEdit(t.id)} />
              ))}
            </div>
          )}
        </Section>
      )}
      <TaskSheet id={edit} cats={cats} onClose={() => setEdit(null)} />
    </>
  )
}

function TaskRow({ t, onMore }: { t: Task; onMore: () => void }) {
  return (
    <CheckRow
      checked={t.done}
      onToggle={() => toggleTask(t)}
      sub={
        <>
          {t.sample && <SampleBadge />} {t.due && !t.done ? relativeDay(t.due) : ''}
        </>
      }
      right={
        <IconButton label="Lainnya" onClick={onMore}>
          <MoreHorizontal size={19} />
        </IconButton>
      }
    >
      {t.title}
    </CheckRow>
  )
}

function TaskSheet({ id, cats, onClose }: { id: string | null; cats: Category[]; onClose: () => void }) {
  const t = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id])
  if (!id || !t) return null
  const set = (c: Partial<Task>) => patch(db.tasks, t.id, c)
  return (
    <Sheet open onClose={onClose} title="Tugas">
      <div className="space-y-4">
        <AutoField value={t.title} onSave={(title) => set({ title })} multiline rows={2} className="resize-none" />
        <div>
          <Label>Tanggal</Label>
          <input type="date" value={t.due ?? ''} onChange={(e) => set({ due: e.target.value || undefined })} className="field" />
        </div>
        <div>
          <Label>Kategori</Label>
          <Choice options={cats.map((c) => ({ value: c.id, label: c.name }))} value={t.categoryId} onChange={(categoryId) => set({ categoryId })} allowNone />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<Sun size={18} />} onClick={() => pickToday('task', t.id)}>
            Pilih Hari Ini
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={18} />}
            onClick={async () => {
              await removeLinksOf('task', t.id)
              await db.tasks.delete(t.id)
              onClose()
            }}
          >
            Hapus
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function HabitsTab({ cats }: { cats: Category[] }) {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), []) ?? []
  const [text, setText] = useState('')
  const [edit, setEdit] = useState<string | null>(null)
  const today = toDateKey()
  const add = async () => {
    if (!text.trim()) return
    await db.habits.add({ id: uid(), title: text.trim(), checkins: [], createdAt: now(), updatedAt: now() })
    setText('')
  }
  return (
    <>
      <div className="flex gap-2 px-4">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Kebiasaan baru (mis. latihan edit 15 menit)" className="field min-w-0 flex-1" />
        <Button variant="primary" onClick={add} disabled={!text.trim()} aria-label="Tambah" className="w-12 px-0">
          <Plus size={20} />
        </Button>
      </div>
      <Section>
        {!habits.length ? (
          <Empty title="Belum ada kebiasaan" text="Tambah satu yang kecil dan bisa dicentang tiap hari. Streak dihitung otomatis." />
        ) : (
          <ul className="space-y-2">
            {habits.map((h) => {
              const doneToday = h.checkins.includes(today)
              const streak = currentStreak(h.checkins, today)
              return (
                <li key={h.id} className="sketch p-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleHabitToday(h)}
                      aria-pressed={doneToday}
                      aria-label={doneToday ? `Batal centang ${h.title}` : `Centang ${h.title} hari ini`}
                      className={cx('flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 transition', doneToday ? 'border-ok bg-ok text-paper anim-pop' : 'border-ink-3 bg-card text-ink-3')}
                    >
                      <Flame size={22} fill={doneToday ? 'currentColor' : 'none'} />
                      <span className="font-mono text-[11px] leading-none font-bold">{streak}</span>
                    </button>
                    <button type="button" onClick={() => setEdit(h.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2 font-semibold break-words">
                        {h.title} {h.sample && <SampleBadge />}
                      </div>
                      <div className="mt-1.5 flex gap-1">
                        {lastNDays(h.checkins, 7, today).map((d) => (
                          <span key={d.key} className={cx('h-2 flex-1 rounded-full', d.done ? 'bg-ok' : 'bg-paper-2')} title={d.key} />
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-ink-3">{streak > 0 ? `${streak} hari berturut-turut` : 'Mulai hari ini'}</div>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>
      <HabitSheet id={edit} cats={cats} onClose={() => setEdit(null)} />
    </>
  )
}

function HabitSheet({ id, cats, onClose }: { id: string | null; cats: Category[]; onClose: () => void }) {
  const h = useLiveQuery(() => (id ? db.habits.get(id) : undefined), [id])
  if (!id || !h) return null
  const set = (c: Partial<Habit>) => patch(db.habits, h.id, c)
  const yesterday = addDays(toDateKey(), -1)
  return (
    <Sheet open onClose={onClose} title="Kebiasaan">
      <div className="space-y-4">
        <AutoField value={h.title} onSave={(title) => set({ title })} />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="sketch p-2">
            <div className="font-display text-2xl font-bold">{currentStreak(h.checkins)}</div>
            <div className="text-xs text-ink-2">streak</div>
          </div>
          <div className="sketch p-2">
            <div className="font-display text-2xl font-bold">{longestStreak(h.checkins)}</div>
            <div className="text-xs text-ink-2">terpanjang</div>
          </div>
          <div className="sketch p-2">
            <div className="font-display text-2xl font-bold">{h.checkins.length}</div>
            <div className="text-xs text-ink-2">total hari</div>
          </div>
        </div>
        <Button block onClick={() => set({ checkins: h.checkins.includes(yesterday) ? h.checkins.filter((d) => d !== yesterday) : [...h.checkins, yesterday] })}>
          {h.checkins.includes(yesterday) ? 'Batal centang kemarin' : 'Lupa centang kemarin? Centang'}
        </Button>
        <div>
          <Label>Kategori</Label>
          <Choice options={cats.map((c) => ({ value: c.id, label: c.name }))} value={h.categoryId} onChange={(categoryId) => set({ categoryId })} allowNone />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" icon={<Sun size={16} />} onClick={() => pickToday('habit', h.id)}>
            Hari Ini
          </Button>
          <Button
            size="sm"
            icon={<Archive size={16} />}
            onClick={() => {
              set({ archived: true })
              onClose()
            }}
          >
            Arsipkan
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={async () => {
              await removeLinksOf('habit', h.id)
              await db.habits.delete(h.id)
              onClose()
            }}
          >
            Hapus
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function DecisionsTab({ cats }: { cats: Category[] }) {
  const ds = useLiveQuery(() => db.decisions.orderBy('createdAt').reverse().toArray(), []) ?? []
  const create = async () => {
    const keputusan = cats.find((c) => c.name === 'Keputusan')
    const d = newDecision('Keputusan baru', { categoryId: keputusan?.id })
    await db.decisions.add(d)
    navigate(`keputusan/${d.id}`)
  }
  return (
    <Section>
      <Button variant="primary" size="lg" block icon={<Scale size={20} />} onClick={create}>
        Timbang keputusan baru
      </Button>
      <div className="mt-3">
        {!ds.length ? (
          <Empty title="Belum ada catatan keputusan" text="Bingung pilih A atau B? Tulis dua opsi, tambah pro & kontra, lalu putuskan. Catatannya tersimpan untuk dilihat lagi." />
        ) : (
          <ul className="space-y-2">
            {ds.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => navigate(`keputusan/${d.id}`)} className="sketch w-full p-3.5 text-left">
                  <div className="font-semibold">{d.title}</div>
                  <div className="mt-0.5 text-sm text-ink-2">
                    {d.optionA || 'A'} <span className="text-ink-3">vs</span> {d.optionB || 'B'}
                  </div>
                  <div className="mt-1">{d.final ? <Chip tone="ok">Dipilih: {d.final === 'A' ? d.optionA || 'A' : d.optionB || 'B'}</Chip> : <Chip tone="warn">Belum diputuskan</Chip>}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}
