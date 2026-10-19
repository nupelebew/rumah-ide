import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, ClipboardCheck, Film, Package, Plus, Scissors, Trash2, Upload, Lightbulb, RotateCcw, Share2 } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, CheckRow, Choice, Empty, IconButton, Label, PageHeader, SampleBadge, Section, cx } from '../../components/ui'
import { Thumb, VideoPlayer } from '../../components/Media'
import { Confirm, Sheet } from '../../components/Sheet'
import { LinkPanel } from '../../components/LinkPanel'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { deleteMedia, link, patch, saveMedia, removeLinksOf } from '../../db/repo'
import { newContentIdea, newSegment } from '../../db/factories'
import type { EditStep, Master, Segment } from '../../db/types'
import { navigate } from '../../lib/router'
import { downloadBlob, pickFiles, shareFiles } from '../../lib/file'
import { formatTimecode, toDateKey, addDays, relativeDay } from '../../lib/dates'
import { formatBytes, labelFrame } from '../../lib/video'
import { basicEditRecipe } from './mixOps'
import { buildRemotionPack } from './remotionPack'
import { createShootFromMaster } from '../shoot/shootOps'
import { BridgeButton } from '../bridge/BridgeButton'
import { ClaudeSteps, HarvestButton } from './ClaudeFlow'

const SLOT_COLOR = ['bg-accent', 'bg-ink', 'bg-ink-3', 'bg-warn', 'bg-ok']

export default function MasterScreen({ id }: { id?: string }) {
  const master = useLiveQuery(() => (id ? db.masters.get(id) : undefined), [id])
  const shoots = useLiveQuery(() => (id ? db.shoots.where('masterId').equals(id).toArray() : []), [id]) ?? []
  const [segId, setSegId] = useState<string | null>(null)
  const [shootSheet, setShootSheet] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [packing, setPacking] = useState(false)

  if (master === undefined) return null
  if (!master)
    return (
      <Page>
        <PageHeader title="Referensi Utama tidak ditemukan" backTo="racik" />
      </Page>
    )
  const set = (c: Partial<Master>) => patch(db.masters, master.id, c)
  const total = master.segments.reduce((a, s) => a + s.durationSec, 0)
  const slots = [...new Set(master.segments.map((s) => s.slot))]

  const addSeg = async () => {
    const s = newSegment({ slot: master.segments.at(-1)?.slot ?? 'Isi', label: `Segmen ${master.segments.length + 1}` })
    await set({ segments: [...master.segments, s] })
    setSegId(s.id)
  }
  const pack = async () => {
    setPacking(true)
    try {
      const { blob, name, missing } = await buildRemotionPack(master)
      const file = new File([blob], name, { type: 'application/zip' })
      if (!(await shareFiles([file], name))) downloadBlob(blob, name)
      toast(missing.length ? `Paket ${formatBytes(blob.size)} — ${missing.length} referensi tanpa video` : `Paket ${formatBytes(blob.size)} siap`)
    } catch {
      toast('Gagal membuat paket. Video terlalu besar untuk memori HP?')
    } finally {
      setPacking(false)
    }
  }
  const shareFrames = async () => {
    const files: File[] = []
    for (const [i, seg] of master.segments.entries()) {
      if (!seg.frameId) continue
      const m = await db.media.get(seg.frameId)
      if (!m) continue
      const no = String(i + 1).padStart(2, '0')
      const src = seg.inSec !== undefined ? ` ${formatTimecode(seg.inSec)}–${formatTimecode(seg.outSec ?? seg.inSec + seg.durationSec)}` : ''
      const blob = await labelFrame(m.blob, `S${no} · ${seg.slot}${src}`)
      files.push(new File([blob], `S${no}-${seg.slot}.jpg`, { type: 'image/jpeg' }))
    }
    if (!files.length) return toast('Belum ada frame di segmen')
    if (await shareFiles(files, master.title)) return
    const { zipSync } = await import('fflate')
    const entries = Object.fromEntries(await Promise.all(files.map(async (f) => [f.name, new Uint8Array(await f.arrayBuffer())] as const)))
    downloadBlob(new Blob([zipSync(entries) as BlobPart], { type: 'application/zip' }), `frame-${master.title.slice(0, 30)}.zip`)
    toast(`${files.length} frame diunduh (.zip)`)
  }
  const toIdea = async () => {
    const idea = newContentIdea({
      title: master.title,
      concept: master.summary,
      stage: 'dikembangkan',
      masterId: master.id,
      shots: master.segments.map((s) => `${s.label}${s.shotType ? ` — ${s.shotType}` : ''}`),
    })
    await db.ideas.add(idea)
    await set({ ideaId: idea.id })
    await link('idea', idea.id, 'master', master.id)
    toast('Ide Konten dibuat', { label: 'Buka', run: () => navigate(`konten/${idea.id}`) })
  }
  const uploadRender = async () => {
    const [f] = await pickFiles('video/*')
    if (!f) return
    await deleteMedia(master.videoId)
    const vid = await saveMedia('video', f, f.name)
    await set({ videoId: vid })
    toast('Video referensi utama disimpan')
  }

  return (
    <Page>
      <PageHeader
        kicker="Referensi Utama"
        title={master.title}
        backTo="racik"
        actions={
          <IconButton label="Hapus" onClick={() => setConfirmDel(true)}>
            <Trash2 size={20} />
          </IconButton>
        }
      >
        {master.sample && <SampleBadge />}
      </PageHeader>

      <div className="space-y-3 px-4">
        <AutoField value={master.title} onSave={(title) => set({ title })} />
        <AutoField value={master.summary} onSave={(summary) => set({ summary })} multiline rows={2} placeholder="Ringkasan: video tentang apa, terasa seperti apa" />
        <Choice<Master['aspect']>
          options={(['9:16', '4:5', '1:1', '16:9'] as const).map((v) => ({ value: v, label: v }))}
          value={master.aspect}
          onChange={(aspect) => aspect && set({ aspect })}
        />
      </div>

      {!master.mixId && !master.segments.length && (
        <div className="px-4 pt-3">
          <ClaudeSteps master={master} />
        </div>
      )}

      <Section title="Video contoh">
        {master.videoId ? (
          <div>
            <VideoPlayer id={master.videoId} />
            <Button variant="ghost" block size="sm" className="mt-1" onClick={uploadRender} icon={<RotateCcw size={16} />}>
              Ganti video
            </Button>
          </div>
        ) : (
          <Button block icon={<Upload size={18} />} onClick={uploadRender}>
            Simpan video contoh (hasil Claude / Remotion)
          </Button>
        )}
      </Section>

      <Section title={<span>Alur <span className="font-mono text-sm font-normal text-ink-3">{total.toFixed(1)} dtk</span></span>}>
        {master.segments.length > 0 && (
          <>
            <div className="flex h-9 overflow-hidden rounded-lg border-[1.5px] border-line-strong">
              {master.segments.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSegId(s.id)}
                  style={{ flexGrow: Math.max(s.durationSec, 0.3) }}
                  className={cx('min-w-2 basis-0 border-r-[1.5px] border-paper last:border-r-0', SLOT_COLOR[slots.indexOf(s.slot) % SLOT_COLOR.length])}
                  aria-label={`${s.label}, ${s.durationSec} detik`}
                />
              ))}
            </div>
            <div className="mt-1.5 mb-3 flex flex-wrap gap-x-3 gap-y-1">
              {slots.map((sl, i) => (
                <span key={sl} className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span className={cx('size-2.5 rounded-sm', SLOT_COLOR[i % SLOT_COLOR.length])} />
                  {sl}
                </span>
              ))}
            </div>
          </>
        )}
        <ol className="space-y-2">
          {master.segments.map((s, i) => (
            <li key={s.id}>
              <button type="button" onClick={() => setSegId(s.id)} className="sketch flex w-full gap-3 p-2.5 text-left active:translate-y-px">
                <Thumb id={s.frameId} className="h-20 w-14" label={String(i + 1).padStart(2, '0')} />
                <div className="min-w-0 flex-1">
                  <div className="kicker">
                    {s.slot} · {s.durationSec} dtk
                  </div>
                  <div className="font-semibold break-words">{s.label || 'Tanpa label'}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-ink-2">{[s.shotType, s.angle, s.movement, s.fps && `${s.fps}fps`, s.lens].filter(Boolean).join(' · ') || s.description || 'Ketuk untuk isi detail shot'}</div>
                </div>
              </button>
            </li>
          ))}
        </ol>
        {!master.segments.length && <Empty title="Belum ada segmen" text="Terisi otomatis lewat “Ambil hasil dari Claude”, Deal dari Papan Racik, atau tambah manual." />}
        <Button variant="ghost" block className="mt-2 border-dashed border-line" icon={<Plus size={18} />} onClick={addSeg}>
          Tambah segmen
        </Button>
        {master.segments.some((x) => x.frameId) && (
          <Button variant="ghost" block className="mt-1" icon={<Share2 size={18} />} onClick={shareFrames}>
            Bagikan semua frame (berlabel)
          </Button>
        )}
        <div className="mt-2 space-y-2">
          {master.mixId ? (
            <BridgeButton input={{ task: 'master', masterId: master.id, mixId: master.mixId }} label="Minta Claude (Opus) susun detail shot" block />
          ) : (
            master.segments.length > 0 && <HarvestButton master={master} variant="soft" label="Perbarui dari Claude (segmen + checklist + resep)" />
          )}
        </div>
      </Section>

      {master.mixId && (
        <Section title="Rakit video (opsional)">
          <Button variant="ink" size="lg" block icon={<Package size={20} />} onClick={pack} disabled={packing || !master.segments.length}>
            {packing ? 'Menyusun paket…' : 'Paket Remotion untuk Claude Code'}
          </Button>
          <p className="mt-2 text-xs text-ink-3">Berisi video sumber, titik potong, frame, dan PROMPT.md. Pindahkan ke laptop, ekstrak, buka foldernya di Claude Code, lalu minta: “Kerjakan PROMPT.md”. Hasilnya simpan di “Video contoh”.</p>
        </Section>
      )}

      <Section
        title={
          <span className="flex items-center gap-2">
            <ClipboardCheck size={20} /> Checklist Shoot
          </span>
        }
      >
        <div className="space-y-2">
          {shoots.map((s) => {
            const done = s.shots.filter((x) => x.done).length
            return (
              <button key={s.id} type="button" onClick={() => navigate(`syuting/${s.id}`)} className="sketch flex w-full items-center gap-3 p-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.title}</span>
                  <span className="font-mono text-xs text-ink-3">
                    {s.date ? relativeDay(s.date) : 'Tanpa tanggal'} {s.start ?? ''} · {done}/{s.shots.length} shot
                  </span>
                </span>
              </button>
            )
          })}
          <Button variant="primary" size="lg" block onClick={() => setShootSheet(true)} disabled={!master.segments.length}>
            Buat checklist shoot
          </Button>
          <BridgeButton input={{ task: 'shoot', masterId: master.id }} label="Minta Claude buat checklist detail" block />
        </div>
      </Section>

      <EditRecipe master={master} />

      <Section title="Terkait">
        <div className="space-y-3">
          {!master.ideaId ? (
            <Button block icon={<Lightbulb size={18} />} onClick={toIdea}>
              Jadikan Ide Konten (masuk kanban)
            </Button>
          ) : (
            <Button block icon={<Lightbulb size={18} />} onClick={() => navigate(`konten/${master.ideaId}`)}>
              Buka Ide Konten
            </Button>
          )}
          <LinkPanel type="master" id={master.id} />
        </div>
      </Section>

      <SegmentSheet master={master} segId={segId} onClose={() => setSegId(null)} />
      <ShootCreateSheet open={shootSheet} master={master} onClose={() => setShootSheet(false)} />
      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus Referensi Utama?"
        text="Checklist shoot yang sudah dibuat tetap ada."
        onConfirm={async () => {
          await deleteMedia(master.videoId)
          await removeLinksOf('master', master.id)
          await db.masters.delete(master.id)
          navigate('racik', { replace: true })
        }}
      />
    </Page>
  )
}

const SEG_FIELDS: { key: keyof Segment; label: string; placeholder: string }[] = [
  { key: 'shotType', label: 'Jenis shot', placeholder: 'Close-up, wide, POV…' },
  { key: 'angle', label: 'Sudut', placeholder: 'Low angle, eye level…' },
  { key: 'lens', label: 'Lensa / focal', placeholder: '35mm, 50mm, wide…' },
  { key: 'fps', label: 'FPS', placeholder: '24, 60, 120' },
  { key: 'movement', label: 'Gerakan kamera', placeholder: 'Push in, orbit, statis…' },
  { key: 'transition', label: 'Transisi ke berikutnya', placeholder: 'Hard cut, whip…' },
  { key: 'text', label: 'Teks di layar', placeholder: '' },
  { key: 'sound', label: 'Sound', placeholder: '' },
  { key: 'color', label: 'Warna', placeholder: '' },
]

function SegmentSheet({ master, segId, onClose }: { master: Master; segId: string | null; onClose: () => void }) {
  const idx = master.segments.findIndex((s) => s.id === segId)
  const s = master.segments[idx]
  if (!s) return <Sheet open={false} onClose={onClose} children={null} />
  const update = (c: Partial<Segment>) => patch(db.masters, master.id, { segments: master.segments.map((x) => (x.id === s.id ? { ...x, ...c } : x)) })
  const move = (d: number) => {
    const arr = [...master.segments]
    const j = idx + d
    if (j < 0 || j >= arr.length) return
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    patch(db.masters, master.id, { segments: arr })
  }
  return (
    <Sheet open onClose={onClose} title={`Segmen ${idx + 1}`}>
      <div className="space-y-4">
        {s.frameId && <Thumb id={s.frameId} className="mx-auto h-48 w-28" />}
        {s.inSec !== undefined && (
          <div className="text-center font-mono text-xs text-ink-3">
            sumber {formatTimecode(s.inSec)} → {formatTimecode(s.outSec ?? s.inSec + s.durationSec)}
          </div>
        )}
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <Label>Slot</Label>
            <AutoField value={s.slot} onSave={(slot) => update({ slot })} />
          </div>
          <div>
            <Label>Durasi (dtk)</Label>
            <AutoField value={String(s.durationSec)} inputMode="decimal" onSave={(v) => update({ durationSec: Math.max(0.2, parseFloat(v.replace(',', '.')) || 1) })} />
          </div>
        </div>
        <div>
          <Label>Label</Label>
          <AutoField value={s.label} onSave={(label) => update({ label })} />
        </div>
        <div>
          <Label>Apa yang terjadi</Label>
          <AutoField value={s.description} onSave={(description) => update({ description })} multiline rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {SEG_FIELDS.map((f) => (
            <div key={f.key} className={f.key === 'transition' || f.key === 'text' || f.key === 'sound' ? 'col-span-2' : ''}>
              <Label>{f.label}</Label>
              <AutoField value={String(s[f.key] ?? '')} onSave={(v) => update({ [f.key]: v })} placeholder={f.placeholder} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button icon={<ArrowUp size={18} />} disabled={idx === 0} onClick={() => move(-1)}>
            Naik
          </Button>
          <Button icon={<ArrowDown size={18} />} disabled={idx === master.segments.length - 1} onClick={() => move(1)}>
            Turun
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={18} />}
            onClick={() => {
              patch(db.masters, master.id, { segments: master.segments.filter((x) => x.id !== s.id) })
              onClose()
            }}
          >
            Hapus
          </Button>
        </div>
        {s.refId && (
          <Button variant="ghost" block icon={<Film size={18} />} onClick={() => navigate(`ref/${s.refId}`)}>
            Buka referensi asal
          </Button>
        )}
      </div>
    </Sheet>
  )
}

function ShootCreateSheet({ open, master, onClose }: { open: boolean; master: Master; onClose: () => void }) {
  const templates = useLiveQuery(() => db.prepTemplates.toArray(), []) ?? []
  const [date, setDate] = useState(addDays(toDateKey(), 1))
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [tpl, setTpl] = useState<string>()
  const create = async () => {
    const sid = await createShootFromMaster(master, { date: date || undefined, start: start || undefined, end: end || undefined, location, templateId: tpl })
    onClose()
    navigate(`syuting/${sid}`)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Checklist shoot baru">
      <div className="space-y-4">
        <div>
          <Label>Kapan</Label>
          <div className="mb-2 flex gap-2">
            {[0, 1, 2].map((d) => {
              const k = addDays(toDateKey(), d)
              return (
                <button key={d} type="button" onClick={() => setDate(k)} className={cx('min-h-11 flex-1 rounded-xl border-[1.5px] text-sm font-semibold', date === k ? 'border-ink bg-ink text-paper' : 'border-line bg-card')}>
                  {relativeDay(k)}
                </button>
              )
            })}
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="field" aria-label="Jam mulai" />
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="field" aria-label="Jam selesai" />
          </div>
        </div>
        <div>
          <Label>Lokasi</Label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="mis. Lapangan tenis kampus" className="field" />
        </div>
        {templates.length > 1 && (
          <div>
            <Label>Template persiapan</Label>
            <Choice options={templates.map((t) => ({ value: t.id, label: t.name }))} value={tpl ?? templates[0]?.id} onChange={setTpl} />
          </div>
        )}
        <p className="text-xs text-ink-3">Daftar shot diambil dari {master.segments.length} segmen Referensi Utama. Persiapan disesuaikan dengan FPS, gerakan, lensa, dan Peralatan Saya.</p>
        <Button variant="primary" size="lg" block onClick={create}>
          Buat checklist
        </Button>
      </div>
    </Sheet>
  )
}

function EditRecipe({ master }: { master: Master }) {
  const steps = master.editRecipe
  const set = (editRecipe: EditStep[]) => patch(db.masters, master.id, { editRecipe })
  const done = steps.filter((s) => s.done).length
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Scissors size={20} /> Resep Edit CapCut
        </span>
      }
      action={steps.length > 0 && <span className="font-mono text-xs text-ink-3">{done}/{steps.length}</span>}
    >
      {steps.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-2">Langkah edit per segmen supaya hasilnya mirip referensi utama.</p>
          <Button block onClick={() => set(basicEditRecipe(master))} disabled={!master.segments.length}>
            Buat resep dasar (tanpa AI)
          </Button>
          <BridgeButton input={{ task: 'edit', masterId: master.id }} label="Minta Claude tulis resep CapCut detail" block />
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((st) => (
            <div key={st.id} className="sketch px-3 py-1">
              <CheckRow checked={!!st.done} onToggle={() => set(steps.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))}>
                <span className="font-semibold">{st.segment}</span>
              </CheckRow>
              <ol className={cx('mb-2 ml-11 list-decimal space-y-1 pl-4 text-sm', st.done ? 'text-ink-3' : 'text-ink-2')}>
                {st.steps.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => set(basicEditRecipe(master))}>
              Susun ulang
            </Button>
            <BridgeButton input={{ task: 'edit', masterId: master.id }} label="Perbaiki pakai Claude" variant="ghost" />
          </div>
        </div>
      )}
    </Section>
  )
}
