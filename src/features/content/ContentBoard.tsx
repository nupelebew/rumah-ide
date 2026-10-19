import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Plus } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Chip, PageHeader, SampleBadge, Segmented, cx } from '../../components/ui'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { patch } from '../../db/repo'
import { newContentIdea } from '../../db/factories'
import type { Idea } from '../../db/types'
import { navigate } from '../../lib/router'
import { PLATFORM_LABEL } from '../../lib/platform'
import { GOALS, STAGES, STAGE_LABEL, nextStage } from './contentMeta'

export function ContentTabs({ value }: { value: 'konten' | 'syuting' | 'acak' }) {
  return (
    <Segmented
      value={value}
      onChange={(v) => navigate(v)}
      options={[
        { value: 'konten', label: 'Papan' },
        { value: 'syuting', label: 'Syuting' },
        { value: 'acak', label: 'Acak Kombinasi' },
      ]}
    />
  )
}

export default function ContentBoard() {
  const ideas = useLiveQuery(() => db.ideas.where('kind').equals('content').reverse().sortBy('updatedAt'), [])
  const cols = useRef<HTMLDivElement>(null)

  const create = async () => {
    const i = newContentIdea({ title: 'Ide konten baru' })
    await db.ideas.add(i)
    navigate(`konten/${i.id}`)
  }
  const jump = (i: number) => {
    const el = cols.current?.children[i] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }
  const all = ideas ?? []
  const jumped = useRef(false)
  useEffect(() => {
    // buka di kolom pertama yang ada isinya, supaya tidak mendarat di kolom kosong
    if (jumped.current || !ideas?.length) return
    jumped.current = true
    const first = STAGES.findIndex((s) => ideas.some((x) => (x.stage ?? 'ide') === s.value))
    const el = cols.current?.children[first] as HTMLElement | undefined
    if (first > 0 && el && cols.current) cols.current.scrollLeft = el.offsetLeft - 16
  }, [ideas])

  return (
    <Page>
      <PageHeader
        kicker="Mode 3"
        title="Ide Konten"
        actions={
          <Button size="sm" variant="ink" icon={<Plus size={16} />} onClick={create}>
            Baru
          </Button>
        }
      >
        <ContentTabs value="konten" />
      </PageHeader>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2">
        {STAGES.map((s, i) => {
          const n = all.filter((x) => (x.stage ?? 'ide') === s.value).length
          return (
            <button key={s.value} type="button" onClick={() => jump(i)} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-paper-2 px-3 text-xs font-semibold text-ink-2">
              {s.label}
              <span className={cx('font-mono', n ? 'text-accent' : 'text-ink-3')}>{n}</span>
            </button>
          )
        })}
      </div>

      <div ref={cols} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4">
        {STAGES.map((s) => {
          const items = all.filter((x) => (x.stage ?? 'ide') === s.value)
          return (
            <section key={s.value} className="w-[82%] max-w-sm shrink-0 snap-start">
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-lg font-bold">{s.label}</h2>
                <span className="font-mono text-xs text-ink-3">{items.length}</span>
              </div>
              <div className="min-h-[50dvh] space-y-2 rounded-2xl border-[1.5px] border-dashed border-line p-2">
                {items.map((i) => (
                  <ContentCard key={i.id} idea={i} />
                ))}
                {!items.length && (
                  <p className="px-2 py-6 text-center text-sm text-ink-3">
                    {s.value === 'ide' ? 'Kosong. Rapikan Inbox atau ketuk “Baru”.' : `Belum ada yang di tahap ${s.label}.`}
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Page>
  )
}

function ContentCard({ idea }: { idea: Idea }) {
  const next = nextStage(idea.stage)
  const goal = GOALS.find((g) => g.value === idea.goal)?.label
  return (
    <div className="sketch overflow-hidden">
      <button type="button" onClick={() => navigate(`konten/${idea.id}`)} className="block w-full px-3 pt-3 pb-2 text-left">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {idea.sample && <SampleBadge />}
          {goal && <Chip tone="accent">{goal}</Chip>}
          {idea.platforms?.map((p) => (
            <span key={p} className="font-mono text-[10px] text-ink-3 uppercase">
              {PLATFORM_LABEL[p]}
            </span>
          ))}
        </div>
        <div className="font-semibold break-words">{idea.title}</div>
        {idea.hook && <div className="mt-1 line-clamp-2 text-xs text-ink-2">Hook: {idea.hook}</div>}
        <div className="mt-1.5 flex gap-2 font-mono text-[10px] text-ink-3">
          {!!idea.storyboard?.length && <span>{idea.storyboard.length} adegan</span>}
          {idea.masterId && <span>Ref. utama</span>}
        </div>
      </button>
      {next && (
        <button
          type="button"
          onClick={async () => {
            await patch(db.ideas, idea.id, { stage: next })
            toast(`Pindah ke ${STAGE_LABEL[next]}`, { label: 'Urungkan', run: () => void patch(db.ideas, idea.id, { stage: idea.stage }) })
          }}
          className="flex min-h-11 w-full items-center justify-end gap-1 border-t-[1.5px] border-dashed border-line px-3 text-xs font-semibold text-ink-2 active:bg-paper-2"
        >
          Geser ke {STAGE_LABEL[next]} <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
