import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, Clapperboard, Sun, Trash2, CalendarHeart, ArrowRight } from 'lucide-react'
import { Sheet } from './Sheet'
import { AutoField, Button, Choice, Label, SampleBadge } from './ui'
import { TagPicker, ENERGY_OPTIONS } from './TagPicker'
import { LinkPanel } from './LinkPanel'
import { db } from '../db/db'
import { patch, togglePick, ensureTags } from '../db/repo'
import type { ID, Idea } from '../db/types'
import { discard, park, toContent, toDaily } from '../features/capture/triage'
import { navigate } from '../lib/router'
import { toast } from './Toast'
import { convertIdea } from '../features/daily/convert'

const KIND_LABEL: Record<Idea['kind'], string> = {
  raw: 'Mentah',
  content: 'Ide Konten',
  daily: 'Ide Keseharian',
  parked: 'Disimpan dulu',
}

/** Lembar edit ide (mentah / keseharian / disimpan). Ide konten punya layar sendiri. */
export function IdeaSheet({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const idea = useLiveQuery(() => (id ? db.ideas.get(id) : undefined), [id])
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  if (!id) return null
  const set = (c: Partial<Idea>) => idea && patch(db.ideas, idea.id, c)
  const pickToday = async () => {
    if (!idea) return
    const r = await togglePick('idea', idea.id)
    toast(r === 'full' ? 'Hari Ini sudah 3 hal. Lepas satu dulu.' : r === 'added' ? 'Masuk Hari Ini' : 'Dilepas dari Hari Ini')
  }
  return (
    <Sheet open={!!id} onClose={onClose} title={idea ? KIND_LABEL[idea.kind] : ''}>
      {idea && (
        <div className="space-y-5">
          {idea.sample && <SampleBadge />}
          <div>
            <AutoField value={idea.title} onSave={(title) => set({ title })} multiline rows={2} className="resize-none text-lg font-semibold" />
            <AutoField value={idea.body} onSave={(body) => set({ body })} multiline rows={3} placeholder="Detail, konteks, kenapa ide ini menarik…" className="mt-2" />
          </div>
          <div>
            <Label>Tag</Label>
            <TagPicker
              value={idea.tags}
              onChange={(tags) => {
                ensureTags(tags)
                set({ tags })
              }}
            />
          </div>
          <div>
            <Label>Tingkat energi</Label>
            <Choice options={ENERGY_OPTIONS} value={idea.energy} onChange={(energy) => set({ energy })} allowNone />
          </div>
          {idea.kind === 'daily' && (
            <div>
              <Label>Kategori</Label>
              <Choice options={cats.map((c) => ({ value: c.id, label: c.name }))} value={idea.categoryId} onChange={(categoryId) => set({ categoryId })} allowNone />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {idea.kind !== 'content' && (
              <Button
                icon={<Clapperboard size={18} />}
                onClick={async () => {
                  await toContent(idea)
                  onClose()
                  navigate(`konten/${idea.id}`)
                }}
              >
                Jadi Ide Konten
              </Button>
            )}
            {idea.kind !== 'daily' && (
              <Button icon={<CalendarHeart size={18} />} onClick={() => toDaily(idea)}>
                Jadi Keseharian
              </Button>
            )}
            {idea.kind !== 'parked' && (
              <Button icon={<Archive size={18} />} onClick={() => park(idea)}>
                Simpan dulu
              </Button>
            )}
            <Button icon={<Sun size={18} />} onClick={pickToday}>
              Pilih Hari Ini
            </Button>
          </div>

          {idea.kind === 'daily' && <ConvertDaily idea={idea} onDone={onClose} />}

          <LinkPanel type="idea" id={idea.id} />

          <Button
            variant="danger"
            block
            icon={<Trash2 size={18} />}
            onClick={() => {
              discard(idea)
              onClose()
            }}
          >
            Buang ide
          </Button>
        </div>
      )}
    </Sheet>
  )
}

function ConvertDaily({ idea, onDone }: { idea: Idea; onDone: () => void }) {
  if (idea.convertedTo) {
    const where = idea.convertedTo.type === 'decision' ? `keputusan/${idea.convertedTo.id}` : 'harian'
    return (
      <Button variant="soft" block icon={<ArrowRight size={18} />} onClick={() => (onDone(), navigate(where))}>
        Sudah jadi {idea.convertedTo.type === 'task' ? 'Tugas' : idea.convertedTo.type === 'habit' ? 'Kebiasaan' : 'Catatan Keputusan'} — buka
      </Button>
    )
  }
  return (
    <div>
      <Label hint="Ubah ide jadi sesuatu yang bisa dijalankan">Jadikan…</Label>
      <div className="grid grid-cols-3 gap-2">
        <ConvertButton idea={idea} type="task" label="Tugas" onDone={onDone} />
        <ConvertButton idea={idea} type="habit" label="Kebiasaan" onDone={onDone} />
        <ConvertButton idea={idea} type="decision" label="Keputusan" onDone={onDone} />
      </div>
    </div>
  )
}

function ConvertButton({ idea, type, label, onDone }: { idea: Idea; type: 'task' | 'habit' | 'decision'; label: string; onDone: () => void }) {
  return (
    <Button
      variant="ink"
      size="sm"
      onClick={async () => {
        const newId = await convertIdea(idea, type)
        toast(`Jadi ${label}`)
        onDone()
        if (type === 'decision') navigate(`keputusan/${newId}`)
      }}
    >
      {label}
    </Button>
  )
}
