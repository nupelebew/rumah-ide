import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, Clapperboard, ClipboardCheck, Plus, Sun, Trash2, Wand2 } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, Choice, IconButton, Label, ListEditor, MultiChoice, PageHeader, SampleBadge, Section } from '../../components/ui'
import { TagPicker } from '../../components/TagPicker'
import { LinkPanel } from '../../components/LinkPanel'
import { Confirm, Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { ensureTags, link, patch, removeLinksOf, togglePick } from '../../db/repo'
import { newMaster, newScene, newSegment, storyboardTemplate } from '../../db/factories'
import type { Idea, Scene } from '../../db/types'
import { navigate } from '../../lib/router'
import { relativeDay } from '../../lib/dates'
import { GOALS, STAGES, TARGET_PLATFORMS } from './contentMeta'
import { BridgeButton } from '../bridge/BridgeButton'

export default function ContentDetail({ id }: { id: string }) {
  const idea = useLiveQuery(() => db.ideas.get(id), [id])
  const shoots = useLiveQuery(() => db.shoots.where('ideaId').equals(id).toArray(), [id]) ?? []
  const [confirmDel, setConfirmDel] = useState(false)
  if (idea === undefined) return null
  if (!idea)
    return (
      <Page>
        <PageHeader title="Ide tidak ditemukan" backTo="konten" />
      </Page>
    )
  const set = (c: Partial<Idea>) => patch(db.ideas, idea.id, c)
  const needs = idea.needs ?? { gear: '', location: '', talent: '' }

  /** Storyboard → Referensi Utama, supaya bisa diturunkan jadi checklist shoot & resep edit. */
  const toMaster = async () => {
    if (idea.masterId) return navigate(`utama/${idea.masterId}`)
    const scenes = idea.storyboard ?? []
    const m = newMaster(idea.title, {
      ideaId: idea.id,
      summary: idea.concept ?? '',
      segments: scenes.map((s) => newSegment({ slot: s.title, label: s.title, durationSec: s.durationSec, description: s.visual, sound: s.audio, text: s.text })),
    })
    await db.masters.add(m)
    await set({ masterId: m.id })
    await link('idea', idea.id, 'master', m.id)
    navigate(`utama/${m.id}`)
  }

  return (
    <Page>
      <PageHeader
        kicker="Ide Konten"
        title={idea.title}
        backTo="konten"
        actions={
          <>
            <IconButton
              label="Pilih untuk Hari Ini"
              onClick={async () => {
                const r = await togglePick('idea', idea.id)
                toast(r === 'full' ? 'Hari Ini sudah 3 hal. Lepas satu dulu.' : r === 'added' ? 'Masuk Hari Ini' : 'Dilepas dari Hari Ini')
              }}
            >
              <Sun size={20} />
            </IconButton>
            <IconButton label="Hapus ide" onClick={() => setConfirmDel(true)}>
              <Trash2 size={20} />
            </IconButton>
          </>
        }
      >
        {idea.sample && <SampleBadge />}
      </PageHeader>

      <div className="space-y-5 px-4">
        <AutoField value={idea.title} onSave={(title) => set({ title })} multiline rows={2} className="resize-none font-semibold" />
        <div>
          <Label>Status</Label>
          <Choice options={STAGES} value={idea.stage ?? 'ide'} onChange={(stage) => stage && set({ stage })} />
        </div>
        <div>
          <Label>Tujuan</Label>
          <Choice options={GOALS} value={idea.goal} onChange={(goal) => set({ goal })} allowNone />
        </div>
        <div>
          <Label>Platform tujuan</Label>
          <MultiChoice options={TARGET_PLATFORMS} value={idea.platforms ?? []} onChange={(platforms) => set({ platforms })} />
        </div>
        <div>
          <Label hint="3 detik pertama yang bikin berhenti scroll">Hook</Label>
          <AutoField value={idea.hook ?? ''} onSave={(hook) => set({ hook })} multiline rows={2} />
        </div>
        <div>
          <Label>Konsep singkat</Label>
          <AutoField value={idea.concept ?? ''} onSave={(concept) => set({ concept })} multiline rows={3} />
        </div>
        <div>
          <Label>Daftar shot</Label>
          <ListEditor items={idea.shots ?? []} onChange={(shots) => set({ shots })} placeholder="mis. close-up tangan pegang raket" />
        </div>
        <div className="space-y-2">
          <Label>Kebutuhan</Label>
          <AutoField value={needs.gear} onSave={(gear) => set({ needs: { ...needs, gear } })} placeholder="Alat (kamera, lensa, gimbal…)" />
          <AutoField value={needs.location} onSave={(location) => set({ needs: { ...needs, location } })} placeholder="Lokasi" />
          <AutoField value={needs.talent} onSave={(talent) => set({ needs: { ...needs, talent } })} placeholder="Talent / model" />
        </div>
      </div>

      <Storyboard idea={idea} />

      <Section title="Jalankan">
        <div className="space-y-2">
          <Button variant="ink" size="lg" block icon={<Clapperboard size={20} />} onClick={toMaster}>
            {idea.masterId ? 'Buka Referensi Utama' : 'Jadikan Referensi Utama'}
          </Button>
          <p className="text-xs text-ink-3">Dari Referensi Utama kamu bisa buat Checklist Shoot, Resep Edit CapCut, dan Paket Remotion.</p>
          {shoots.map((s) => (
            <button key={s.id} type="button" onClick={() => navigate(`syuting/${s.id}`)} className="sketch flex w-full items-center gap-3 p-3 text-left">
              <ClipboardCheck size={20} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.title}</span>
                <span className="font-mono text-xs text-ink-3">
                  {s.date ? relativeDay(s.date) : 'Tanpa tanggal'} · {s.shots.filter((x) => x.done).length}/{s.shots.length} shot
                </span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tag & tautan">
        <div className="space-y-4">
          <TagPicker
            value={idea.tags}
            onChange={(tags) => {
              ensureTags(tags)
              set({ tags })
            }}
          />
          <LinkPanel type="idea" id={idea.id} />
        </div>
      </Section>

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus ide konten ini?"
        onConfirm={async () => {
          await removeLinksOf('idea', idea.id)
          await db.ideas.delete(idea.id)
          navigate('konten', { replace: true })
        }}
      />
    </Page>
  )
}

export function Storyboard({ idea }: { idea: Idea }) {
  const scenes = idea.storyboard ?? []
  const [editing, setEditing] = useState<string | null>(null)
  const save = (storyboard: Scene[]) => patch(db.ideas, idea.id, { storyboard })
  const total = scenes.reduce((a, s) => a + s.durationSec, 0)

  return (
    <Section title={<span>Storyboard {scenes.length > 0 && <span className="font-mono text-sm font-normal text-ink-3">{total} dtk</span>}</span>}>
      {scenes.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-2">Kembangkan ide jadi daftar adegan berdurasi, biar jelas apa yang disyuting.</p>
          <Button
            variant="primary"
            size="lg"
            block
            icon={<Wand2 size={20} />}
            onClick={async () => {
              await save(storyboardTemplate(idea))
              if ((idea.stage ?? 'ide') === 'ide') await patch(db.ideas, idea.id, { stage: 'dikembangkan' })
            }}
          >
            Kembangkan Ide (template)
          </Button>
          <BridgeButton input={{ task: 'storyboard', ideaIds: [idea.id] }} label="Kembangkan dengan Claude" block />
        </div>
      ) : (
        <>
          <ol className="space-y-2">
            {scenes.map((s, i) => (
              <li key={s.id}>
                <button type="button" onClick={() => setEditing(s.id)} className="sketch flex w-full gap-3 p-3 text-left active:translate-y-px">
                  <span className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-paper-2 py-1.5">
                    <span className="font-mono text-[10px] text-ink-3">SC</span>
                    <span className="font-display text-lg leading-none font-bold">{String(i + 1).padStart(2, '0')}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{s.title || 'Adegan'}</span>
                      <span className="font-mono text-xs text-ink-3">{s.durationSec} dtk</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-2">{s.visual}</span>
                    {(s.audio || s.text) && <span className="mt-0.5 block text-xs text-ink-3">{[s.audio && `Audio: ${s.audio}`, s.text && `Teks: ${s.text}`].filter(Boolean).join(' · ')}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" icon={<Plus size={18} />} className="flex-1 border-dashed border-line" onClick={() => save([...scenes, newScene({ title: `Adegan ${scenes.length + 1}` })])}>
              Adegan
            </Button>
            <BridgeButton input={{ task: 'storyboard', ideaIds: [idea.id] }} label="Perbaiki pakai Claude" variant="ghost" />
          </div>
        </>
      )}
      <SceneSheet scenes={scenes} id={editing} onSave={save} onClose={() => setEditing(null)} />
    </Section>
  )
}

function SceneSheet({ scenes, id, onSave, onClose }: { scenes: Scene[]; id: string | null; onSave: (s: Scene[]) => void; onClose: () => void }) {
  const idx = scenes.findIndex((s) => s.id === id)
  const s = scenes[idx]
  if (!s) return <Sheet open={false} onClose={onClose} children={null} />
  const up = (c: Partial<Scene>) => onSave(scenes.map((x) => (x.id === s.id ? { ...x, ...c } : x)))
  const move = (d: number) => {
    const a = [...scenes]
    const j = idx + d
    if (j < 0 || j >= a.length) return
    ;[a[idx], a[j]] = [a[j], a[idx]]
    onSave(a)
  }
  return (
    <Sheet open onClose={onClose} title={`Adegan ${idx + 1}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <Label>Judul</Label>
            <AutoField value={s.title} onSave={(title) => up({ title })} />
          </div>
          <div>
            <Label>Durasi</Label>
            <AutoField value={String(s.durationSec)} inputMode="decimal" onSave={(v) => up({ durationSec: Math.max(0.5, parseFloat(v.replace(',', '.')) || 1) })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 5, 8].map((d) => (
            <button key={d} type="button" onClick={() => up({ durationSec: d })} className="min-h-10 rounded-full bg-paper-2 px-3 font-mono text-xs">
              {d} dtk
            </button>
          ))}
        </div>
        <div>
          <Label>Visual</Label>
          <AutoField value={s.visual} onSave={(visual) => up({ visual })} multiline rows={2} />
        </div>
        <div>
          <Label>Audio</Label>
          <AutoField value={s.audio} onSave={(audio) => up({ audio })} placeholder="Musik, VO, SFX" />
        </div>
        <div>
          <Label>Teks di layar</Label>
          <AutoField value={s.text} onSave={(text) => up({ text })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button icon={<ArrowUp size={18} />} disabled={idx === 0} onClick={() => move(-1)}>
            Naik
          </Button>
          <Button icon={<ArrowDown size={18} />} disabled={idx === scenes.length - 1} onClick={() => move(1)}>
            Turun
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={18} />}
            onClick={() => {
              onSave(scenes.filter((x) => x.id !== s.id))
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
