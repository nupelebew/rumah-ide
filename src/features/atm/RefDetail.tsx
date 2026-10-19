import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ExternalLink, Film, Lightbulb, Plus, Trash2, X, Share2 } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, CheckRow, Chip, Choice, Empty, IconButton, Label, PageHeader, SampleBadge, Section, Segmented } from '../../components/ui'
import { PlatformBadge, Thumb, VideoPlayer } from '../../components/Media'
import { TagPicker } from '../../components/TagPicker'
import { LinkPanel } from '../../components/LinkPanel'
import { Confirm, Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { deleteMedia, ensureTags, patch, saveMedia } from '../../db/repo'
import { AMATI_FIELDS, MOD_QUESTIONS } from '../../db/factories'
import type { AtmAmati, RefStatus, Reference } from '../../db/types'
import { navigate } from '../../lib/router'
import { pickFiles, shareFiles } from '../../lib/file'
import { frameFromElement } from '../../lib/video'
import { formatTimecode } from '../../lib/dates'
import { now, uid } from '../../lib/id'
import { AMATI_SUGGEST, attachVideo, deleteRef, modsToContent, removeVideo, saveAmati, saveAtmPath } from './refOps'
import { STATUS_LABEL } from './RefLibrary'
import { BridgeButton } from '../bridge/BridgeButton'

type Tab = 'amati' | 'tiru' | 'modif'

export default function RefDetail({ id }: { id: string }) {
  const ref = useLiveQuery(() => db.references.get(id), [id])
  const [tab, setTab] = useState<Tab>('amati')
  const [confirmDel, setConfirmDel] = useState(false)
  if (ref === undefined) return null
  if (!ref)
    return (
      <Page>
        <PageHeader title="Referensi tidak ditemukan" backTo="ref" />
      </Page>
    )
  const set = (c: Partial<Reference>) => patch(db.references, ref.id, c)
  const filled = AMATI_FIELDS.filter((f) => ref.atm.amati[f.key].trim()).length

  return (
    <Page>
      <PageHeader
        kicker="Bedah ATM"
        title={ref.title || 'Referensi tanpa judul'}
        backTo="ref"
        actions={
          <IconButton label="Hapus referensi" onClick={() => setConfirmDel(true)}>
            <Trash2 size={20} />
          </IconButton>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={ref.platform} />
          {ref.sample && <SampleBadge />}
          {ref.url && (
            <a href={ref.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-accent underline-offset-4 active:underline">
              <ExternalLink size={16} /> Buka video asli
            </a>
          )}
        </div>
      </PageHeader>

      <div className="space-y-4 px-4">
        <AutoField value={ref.title} onSave={(title) => set({ title })} placeholder="Judul singkat (mis. “Reveal sepatu whip pan”)" />
        <Choice<RefStatus>
          options={(['belum', 'dibedah', 'dipakai'] as RefStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          value={ref.status}
          onChange={(s) => s && set({ status: s })}
        />
      </div>

      <VideoSection r={ref} />

      <Section title="Pola">
        <PatternPicker value={ref.patternIds} onChange={(patternIds) => set({ patternIds })} />
      </Section>

      <Section>
        <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 bg-paper px-4 py-2">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'amati', label: 'Amati', count: filled },
              { value: 'tiru', label: 'Tiru', count: ref.atm.tiru.length },
              { value: 'modif', label: 'Modifikasi' },
            ]}
          />
        </div>
        <div className="pt-3">
          {tab === 'amati' && <AmatiTab r={ref} />}
          {tab === 'tiru' && <TiruTab r={ref} onGoAmati={() => setTab('amati')} />}
          {tab === 'modif' && <ModifTab r={ref} />}
        </div>
      </Section>

      <Section title="Catatan & tag">
        <div className="space-y-4">
          <AutoField value={ref.notes} onSave={(notes) => set({ notes })} multiline placeholder="Catatan bebas" />
          <TagPicker
            value={ref.tags}
            onChange={(tags) => {
              ensureTags(tags)
              set({ tags })
            }}
          />
          <LinkPanel type="reference" id={ref.id} />
        </div>
      </Section>

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus referensi ini?"
        text="Hasil bedah dan video yang tersimpan ikut terhapus."
        onConfirm={async () => {
          await deleteRef(ref)
          navigate('ref', { replace: true })
        }}
      />
    </Page>
  )
}

function VideoSection({ r }: { r: Reference }) {
  const video = useRef<HTMLVideoElement>(null)
  const [t, setT] = useState(0)
  const [busy, setBusy] = useState(false)
  const frames = r.frameIds ?? []

  const attach = async () => {
    const [f] = await pickFiles('video/*')
    if (!f) return
    setBusy(true)
    try {
      await attachVideo(r, f)
      toast('Video disimpan di HP')
    } catch {
      toast('Gagal menyimpan video')
    } finally {
      setBusy(false)
    }
  }
  const grab = async () => {
    if (!video.current) return
    const blob = await frameFromElement(video.current)
    const fid = await saveMedia('frame', blob, `frame-${formatTimecode(t)}.jpg`)
    await patch(db.references, r.id, { frameIds: [...frames, fid] })
    toast(`Frame ${formatTimecode(t)} disimpan`)
  }
  const share = async () => {
    const ms = await db.media.bulkGet(frames)
    const files = ms.filter(Boolean).map((m, i) => new File([m!.blob], `${(r.title || 'ref').slice(0, 20)}-frame-${i + 1}.jpg`, { type: 'image/jpeg' }))
    if (!(await shareFiles(files, r.title))) toast('HP ini belum bisa bagikan file. Pakai “Paket Remotion” di Papan Racik.')
  }

  if (!r.videoId)
    return (
      <Section>
        <div className="rounded-2xl border-[1.5px] border-dashed border-line p-4">
          <div className="flex items-start gap-3">
            <Film className="mt-0.5 shrink-0 text-ink-3" size={22} />
            <div className="text-sm text-ink-2">
              <b className="text-ink">Lampirkan videonya</b> (yang kamu simpan sendiri) supaya bisa ambil frame, tandai detik, dan dirakit di Remotion. Claude tidak bisa membuka link IG/TikTok.
            </div>
          </div>
          <Button block className="mt-3" onClick={attach} disabled={busy} icon={<Plus size={18} />}>
            {busy ? 'Menyimpan…' : 'Pilih video dari galeri'}
          </Button>
        </div>
      </Section>
    )

  return (
    <Section>
      <VideoPlayer id={r.videoId} ref={video} onTime={setT} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="ink" icon={<Camera size={18} />} onClick={grab}>
          Frame <span className="font-mono text-xs opacity-80">{formatTimecode(t)}</span>
        </Button>
        <Button onClick={attach} disabled={busy}>
          Ganti video
        </Button>
      </div>
      {frames.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="kicker">{frames.length} frame</span>
            <Button size="sm" variant="ghost" icon={<Share2 size={16} />} onClick={share}>
              Bagikan ke Claude
            </Button>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {frames.map((fid, i) => (
              <div key={fid} className="relative">
                <Thumb id={fid} className="h-28 w-20" label={String(i + 1)} />
                <button
                  type="button"
                  aria-label="Hapus frame"
                  onClick={async () => {
                    await deleteMedia(fid)
                    await patch(db.references, r.id, { frameIds: frames.filter((x) => x !== fid) })
                  }}
                  className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-ink text-paper"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={() => removeVideo(r)} className="mt-2 min-h-11 text-xs text-ink-3 underline">
        Hapus video dari HP (hemat memori)
      </button>
    </Section>
  )
}

function AmatiTab({ r }: { r: Reference }) {
  return (
    <div className="space-y-5">
      <BridgeButton input={{ task: 'atm-fill', refId: r.id }} label="Minta Claude bantu amati" block />
      {AMATI_FIELDS.map((f) => (
        <AmatiField key={f.key} r={r} k={f.key} label={f.label} hint={f.hint} />
      ))}
    </div>
  )
}

function AmatiField({ r, k, label, hint }: { r: Reference; k: keyof AtmAmati; label: string; hint: string }) {
  const value = r.atm.amati[k]
  const sugg = AMATI_SUGGEST[k] ?? []
  const add = (s: string) => {
    if (value.toLowerCase().includes(s.toLowerCase())) return
    saveAmati(r, k, value.trim() ? `${value.trim()}, ${s}` : s)
  }
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      {sugg.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4">
          {sugg.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="min-h-10 shrink-0 rounded-full border-[1.5px] border-dashed border-line px-3 text-xs font-medium text-ink-2 active:bg-paper-2"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <AutoField value={value} onSave={(v) => saveAmati(r, k, v)} multiline rows={2} />
    </div>
  )
}

function TiruTab({ r, onGoAmati }: { r: Reference; onGoAmati: () => void }) {
  const filled = AMATI_FIELDS.filter((f) => r.atm.amati[f.key].trim())
  if (!filled.length)
    return <Empty title="Amati dulu" text="Isi minimal satu bagian di tab Amati, lalu centang elemen yang mau ditiru persis di sini." action={<Button onClick={onGoAmati}>Ke Amati</Button>} />
  const toggle = (k: keyof AtmAmati) => {
    const tiru = r.atm.tiru.includes(k) ? r.atm.tiru.filter((x) => x !== k) : [...r.atm.tiru, k]
    saveAtmPath(r.id, 'tiru', tiru)
  }
  return (
    <div>
      <p className="mb-2 text-sm text-ink-2">Centang yang akan ditiru persis. Sisanya bebas kamu modifikasi.</p>
      <div className="divide-y-[1.5px] divide-line">
        {filled.map((f) => (
          <CheckRow key={f.key} checked={r.atm.tiru.includes(f.key)} onToggle={() => toggle(f.key)} sub={r.atm.amati[f.key]}>
            {f.label}
          </CheckRow>
        ))}
      </div>
    </div>
  )
}

function ModifTab({ r }: { r: Reference }) {
  const setMod = (k: keyof Reference['atm']['modifikasi'], v: string) => saveAtmPath(r.id, `modifikasi.${k}`, v)
  const make = async (answer?: string) => {
    const id = await modsToContent(r, answer)
    toast('Ide Konten baru dibuat & tertaut', { label: 'Buka', run: () => navigate(`konten/${id}`) })
  }
  const any = Object.values(r.atm.modifikasi).some((v) => v.trim())
  return (
    <div className="space-y-5">
      <BridgeButton input={{ task: 'atm-mods', refId: r.id }} label="Minta 3 saran modifikasi dari Claude" block />
      {MOD_QUESTIONS.map((m) => (
        <div key={m.key}>
          <Label>
            <span className="flex items-center gap-1.5">
              <Lightbulb size={16} className="text-accent" /> {m.q}
            </span>
          </Label>
          <AutoField value={r.atm.modifikasi[m.key]} onSave={(v) => setMod(m.key, v)} multiline rows={2} />
          {r.atm.modifikasi[m.key].trim() && (
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => make(r.atm.modifikasi[m.key])}>
              + Jadikan ide konten dari jawaban ini
            </Button>
          )}
        </div>
      ))}
      <Button variant="primary" size="lg" block disabled={!any} onClick={() => make()}>
        Gabungkan jadi Ide Konten
      </Button>
    </div>
  )
}

function PatternPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const patterns = useLiveQuery(() => db.patterns.orderBy('name').toArray(), []) ?? []
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const save = async () => {
    if (!name.trim()) return
    const id = uid()
    await db.patterns.add({ id, name: name.trim(), description: desc.trim(), createdAt: now(), updatedAt: now() })
    onChange([...value, id])
    setName('')
    setDesc('')
    setAdding(false)
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {patterns.map((p) => (
          <Chip key={p.id} active={value.includes(p.id)} onClick={() => onChange(value.includes(p.id) ? value.filter((x) => x !== p.id) : [...value, p.id])}>
            {p.name}
          </Chip>
        ))}
        <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-1 rounded-full border-[1.5px] border-dashed border-ink-3 px-3.5 text-sm font-medium text-ink-2">
          <Plus size={16} /> Pola baru
        </button>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Pola baru">
        <div className="space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama pola (mis. “Transisi lempar barang”)" className="field" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Cara kerjanya, singkat" className="field" />
          <Button variant="primary" block size="lg" onClick={save} disabled={!name.trim()}>
            Simpan pola
          </Button>
        </div>
      </Sheet>
    </>
  )
}
