import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, CalendarHeart, Clapperboard, SkipForward, Trash2 } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, Choice, Empty, Label, PageHeader, SampleBadge } from '../../components/ui'
import { TagPicker, ENERGY_OPTIONS } from '../../components/TagPicker'
import { Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { ensureTags, patch } from '../../db/repo'
import { navigate } from '../../lib/router'
import type { Idea } from '../../db/types'
import { discard, park, toContent, toDaily } from './triage'

/** Rapikan: ide mentah ditampilkan satu per satu, diputuskan dengan satu ketukan. */
export default function TidyScreen() {
  const raw = useLiveQuery(() => db.ideas.where('kind').equals('raw').sortBy('createdAt'), [])
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const [skipped, setSkipped] = useState<string[]>([])
  const [done, setDone] = useState(0)
  const [askCat, setAskCat] = useState<Idea | null>(null)

  if (!raw) return null
  const queue = [...raw.filter((i) => !skipped.includes(i.id)), ...raw.filter((i) => skipped.includes(i.id))]
  const idea = queue[0]
  const total = raw.length + done

  const next = (msg: string) => {
    setDone((d) => d + 1)
    toast(msg)
  }

  return (
    <Page>
      <PageHeader kicker={idea ? `Rapikan · ${done + 1} dari ${total}` : 'Rapikan'} title={idea ? 'Mau dibawa ke mana?' : 'Selesai dirapikan'} backTo="tangkap" />
      {idea && (
        <div className="mx-4 mb-4 h-1.5 overflow-hidden rounded-full bg-paper-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
        </div>
      )}

      {!idea ? (
        <div className="px-4">
          <Empty
            title={done ? `${done} ide sudah punya tempat` : 'Tidak ada ide mentah'}
            text="Ide konten ada di papan Konten, ide keseharian di tab Harian. Tulis ide baru kapan saja lewat tombol +."
            action={
              <div className="flex gap-2">
                <Button variant="ink" onClick={() => navigate('konten')}>
                  Buka Konten
                </Button>
                <Button onClick={() => navigate('tangkap')}>Ke Inbox</Button>
              </div>
            }
          />
        </div>
      ) : (
        <div key={idea.id} className="anim-fade space-y-5 px-4">
          <div className="sketch relative px-4 pt-5 pb-4">
            <span className="tape absolute -top-2.5 left-4 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase">Mentah</span>
            {idea.sample && (
              <div className="absolute top-2 right-3">
                <SampleBadge />
              </div>
            )}
            <AutoField value={idea.title} onSave={(title) => patch(db.ideas, idea.id, { title })} multiline rows={2} className="resize-none border-transparent bg-transparent px-0 font-display text-xl font-bold" />
            <AutoField value={idea.body} onSave={(body) => patch(db.ideas, idea.id, { body })} multiline rows={2} placeholder="Tambah detail (opsional)" className="mt-1" />
          </div>

          <div>
            <Label>Tag</Label>
            <TagPicker
              value={idea.tags}
              onChange={(tags) => {
                ensureTags(tags)
                patch(db.ideas, idea.id, { tags })
              }}
            />
          </div>
          <div>
            <Label>Butuh energi</Label>
            <Choice options={ENERGY_OPTIONS} value={idea.energy} onChange={(energy) => patch(db.ideas, idea.id, { energy })} allowNone />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="primary" size="lg" icon={<Clapperboard size={20} />} onClick={async () => (await toContent(idea), next('Jadi Ide Konten'))}>
              Ide Konten
            </Button>
            <Button variant="ink" size="lg" icon={<CalendarHeart size={20} />} onClick={() => setAskCat(idea)}>
              Keseharian
            </Button>
            <Button size="lg" icon={<Archive size={20} />} onClick={async () => (await park(idea), next('Disimpan dulu'))}>
              Simpan dulu
            </Button>
            <Button variant="danger" size="lg" icon={<Trash2 size={20} />} onClick={async () => (await discard(idea), setDone((d) => d + 1))}>
              Buang
            </Button>
          </div>
          <Button variant="ghost" block icon={<SkipForward size={18} />} onClick={() => setSkipped((s) => [...s.filter((x) => x !== idea.id), idea.id])} disabled={queue.length < 2}>
            Lewati dulu
          </Button>
        </div>
      )}

      <Sheet open={!!askCat} onClose={() => setAskCat(null)} title="Masuk kategori apa?">
        <div className="pb-2">
          <Choice
            options={cats.map((c) => ({ value: c.id, label: c.name }))}
            onChange={async (categoryId) => {
              if (!askCat) return
              await toDaily(askCat, categoryId)
              setAskCat(null)
              next('Jadi Ide Keseharian')
            }}
          />
          <Button
            variant="ghost"
            block
            className="mt-3"
            onClick={async () => {
              if (!askCat) return
              await toDaily(askCat)
              setAskCat(null)
              next('Jadi Ide Keseharian')
            }}
          >
            Tanpa kategori
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
