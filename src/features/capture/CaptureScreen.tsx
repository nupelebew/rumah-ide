import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Layers, Merge } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Chip, Empty, PageHeader, SampleBadge, Section, cx } from '../../components/ui'
import { IdeaSheet } from '../../components/IdeaSheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { newIdea } from '../../db/factories'
import { splitBrainDump } from '../../lib/braindump'
import { clusterByKeywords } from '../../lib/cluster'
import { navigate } from '../../lib/router'
import type { Idea } from '../../db/types'
import { mergeIdeas } from './triage'
import { BridgeButton } from '../bridge/BridgeButton'

const ENERGY_DOT: Record<string, string> = { kecil: '●', sedang: '●●', besar: '●●●' }

export default function CaptureScreen() {
  const [text, setText] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showParked, setShowParked] = useState(false)
  const raw = useLiveQuery(() => db.ideas.where('kind').equals('raw').reverse().sortBy('createdAt'), []) ?? []
  const parked = useLiveQuery(() => db.ideas.where('kind').equals('parked').reverse().sortBy('updatedAt'), []) ?? []
  const parts = useMemo(() => splitBrainDump(text), [text])
  const clusters = useMemo(() => clusterByKeywords(raw, (i) => `${i.title} ${i.body}`), [raw])

  const save = async () => {
    if (!parts.length) return
    await db.ideas.bulkAdd(parts.map((title) => newIdea({ title })))
    setText('')
    toast(`${parts.length} ide tersimpan`)
  }

  return (
    <Page>
      <PageHeader kicker="Mode 1 · Brain dump" title="Tangkap Cepat" />

      <div className="px-4">
        <div className="sketch overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'Keluarkan semua dari kepala…\n\n- vlog persiapan wisuda\n- transisi pakai pintu\n- review lensa murah'}
            className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-base leading-relaxed outline-none placeholder:text-ink-3"
          />
          <div className="flex items-center gap-2 border-t-[1.5px] border-dashed border-line px-3 py-2">
            <span className="flex-1 font-mono text-[11px] text-ink-3">{parts.length ? `${parts.length} ide · pisah per baris atau " - "` : 'Satu baris = satu ide'}</span>
            <Button variant="primary" onClick={save} disabled={!parts.length}>
              Simpan
            </Button>
          </div>
        </div>
      </div>

      <Section
        title={
          <span className="flex items-baseline gap-2">
            Inbox <span className="font-mono text-sm font-normal text-ink-3">{raw.length} mentah</span>
          </span>
        }
        action={
          raw.length > 0 && (
            <Button variant="ink" size="sm" onClick={() => navigate('rapikan')} icon={<ArrowRight size={16} />}>
              Rapikan
            </Button>
          )
        }
      >
        {raw.length === 0 ? (
          <Empty title="Inbox bersih" text="Tulis ide di kolom atas atau ketuk tombol + di bawah. Semua ide baru masuk sini sebagai “Mentah”, lalu dirapikan satu per satu." />
        ) : (
          <ul className="space-y-2">
            {raw.map((i) => (
              <IdeaRow key={i.id} idea={i} onOpen={() => setOpenId(i.id)} />
            ))}
          </ul>
        )}
        {raw.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <BridgeButton input={{ task: 'group', ideaIds: raw.map((i) => i.id) }} label="Minta Claude kelompokkan" />
            <BridgeButton input={{ task: 'free', ideaIds: raw.map((i) => i.id) }} label="Kirim ke Claude: eksekusi" />
          </div>
        )}
      </Section>

      {clusters.length > 0 && (
        <Section
          title={
            <span className="flex items-center gap-2">
              <Layers size={19} /> Mirip-mirip
            </span>
          }
        >
          <p className="-mt-1 mb-3 text-sm text-ink-2">Ide yang memakai kata kunci sama. Gabungkan biar tidak tercecer.</p>
          <div className="space-y-2">
            {clusters.slice(0, 5).map((c) => (
              <ClusterCard key={c.label + c.items.length} label={c.label} items={c.items} />
            ))}
          </div>
        </Section>
      )}

      {parked.length > 0 && (
        <Section>
          <button type="button" onClick={() => setShowParked((v) => !v)} className="flex min-h-11 w-full items-center justify-between text-left">
            <span className="text-lg font-bold">Disimpan dulu</span>
            <span className="font-mono text-sm text-ink-3">{showParked ? 'tutup' : `${parked.length} ide`}</span>
          </button>
          {showParked && (
            <ul className="mt-2 space-y-2">
              {parked.map((i) => (
                <IdeaRow key={i.id} idea={i} onOpen={() => setOpenId(i.id)} />
              ))}
            </ul>
          )}
        </Section>
      )}

      <IdeaSheet id={openId} onClose={() => setOpenId(null)} />
    </Page>
  )
}

function IdeaRow({ idea, onOpen }: { idea: Idea; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="sketch flex min-h-14 w-full items-start gap-3 px-3.5 py-3 text-left active:translate-y-px">
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{idea.title}</span>
          {(idea.tags.length > 0 || idea.energy || idea.sample) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
              {idea.sample && <SampleBadge />}
              {idea.energy && <span className="font-mono text-accent">{ENERGY_DOT[idea.energy]}</span>}
              {idea.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

function ClusterCard({ label, items }: { label: string; items: Idea[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border-[1.5px] border-line bg-paper-2 p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-h-11 w-full items-center gap-2 text-left">
        <Chip tone="accent">#{label}</Chip>
        <span className="flex-1 text-sm text-ink-2">{items.length} ide</span>
        <span className="text-sm font-semibold">{open ? 'Tutup' : 'Lihat'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.id} className={cx('rounded-lg bg-card px-3 py-2')}>
                {i.title}
              </li>
            ))}
          </ul>
          <Button
            block
            icon={<Merge size={18} />}
            onClick={async () => {
              await mergeIdeas(items, `Kumpulan: ${label}`)
              toast(`${items.length} ide digabung`)
            }}
          >
            Gabung jadi satu ide
          </Button>
        </div>
      )}
    </div>
  )
}

