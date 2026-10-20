import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, Check, Minus, Pencil, Play, Plus, Star, Sun, SunDim, Trash2, Clapperboard, Save, PartyPopper } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, CheckRow, IconButton, Label, PageHeader, SampleBadge, Section, Segmented, cx } from '../../components/ui'
import { Thumb, VideoPlayer } from '../../components/Media'
import { Confirm, Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { patch, removeLinksOf } from '../../db/repo'
import { newShot } from '../../db/factories'
import type { CheckItem, ShootSession, ShootShot } from '../../db/types'
import { navigate, queryParam } from '../../lib/router'
import { relativeDay } from '../../lib/dates'
import { downloadBlob } from '../../lib/file'
import { now, uid } from '../../lib/id'
import { shootsToIcs } from './shootOps'
import { BridgeButton } from '../bridge/BridgeButton'

type Tab = 'shot' | 'prep'

/** Menjaga layar tetap menyala selama Mode Lapangan (kalau browser mendukung). */
function useWakeLock(on: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let alive = true
    const req = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (alive) lock.current = l
          else l.release()
        })
        .catch(() => {})
    req()
    const onVis = () => document.visibilityState === 'visible' && req()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVis)
      lock.current?.release().catch(() => {})
      lock.current = null
    }
  }, [on])
}

export default function ShootScreen({ id }: { id: string }) {
  const s = useLiveQuery(() => db.shoots.get(id), [id])
  const master = useLiveQuery(async () => {
    const sh = await db.shoots.get(id)
    return sh?.masterId ? await db.masters.get(sh.masterId) : undefined
  }, [id])
  const [example, setExample] = useState<{ from: number; to?: number } | null>(null)
  const [tab, setTab] = useState<Tab>('shot')
  const [field, setField] = useState(() => queryParam('lapangan') === '1')
  const [editShot, setEditShot] = useState<string | null>(null)
  const [editInfo, setEditInfo] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  useWakeLock(field)

  if (s === undefined) return null
  if (!s)
    return (
      <Page>
        <PageHeader title="Sesi tidak ditemukan" backTo="syuting" />
      </Page>
    )
  const set = (c: Partial<ShootSession>) => patch(db.shoots, s.id, c)
  const setShot = (sid: string, c: Partial<ShootShot>) => set({ shots: s.shots.map((x) => (x.id === sid ? { ...x, ...c } : x)) })
  const doneShots = s.shots.filter((x) => x.done).length
  const donePrep = s.prep.filter((x) => x.done).length
  const allDone = s.shots.length > 0 && doneShots === s.shots.length

  /** Posisi segmen di video contoh = jumlah durasi segmen sebelumnya. */
  const exampleRange = (segmentId?: string) => {
    if (!master?.videoId || !segmentId) return null
    let t = 0
    for (const seg of master.segments) {
      if (seg.id === segmentId) return { from: t, to: t + seg.durationSec }
      t += seg.durationSec
    }
    return null
  }
  const next = s.shots.find((x) => !x.done)
  const nextIdx = next ? s.shots.indexOf(next) : -1

  const finish = async () => {
    if (s.ideaId) await patch(db.ideas, s.ideaId, { stage: 'edit' })
    toast('Mantap! Lanjut ke edit.')
    if (s.masterId) navigate(`utama/${s.masterId}`)
  }

  return (
    <div className={cx(field && 'field-mode min-h-dvh bg-paper')}>
      <Page>
        <PageHeader
          kicker={field ? 'Mode Lapangan' : 'Checklist Shoot'}
          title={s.title}
          backTo="syuting"
          actions={
            !field && (
              <>
                <IconButton label="Ubah info" onClick={() => setEditInfo(true)}>
                  <Pencil size={19} />
                </IconButton>
                <IconButton label="Hapus sesi" onClick={() => setConfirmDel(true)}>
                  <Trash2 size={19} />
                </IconButton>
              </>
            )
          }
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-2">
            {s.sample && <SampleBadge />}
            <span>{s.date ? relativeDay(s.date) : 'Tanpa tanggal'}</span>
            {s.start && (
              <span>
                {s.start}
                {s.end ? `–${s.end}` : ''}
              </span>
            )}
            {s.location && <span>{s.location}</span>}
          </div>
        </PageHeader>

        <div className="px-4">
          <div className="grid grid-cols-2 gap-2">
            <Progress label="Shot" done={doneShots} total={s.shots.length} />
            <Progress label="Persiapan" done={donePrep} total={s.prep.length} />
          </div>
          <Button variant={field ? 'ink' : 'soft'} block size="lg" className="mt-2" icon={field ? <SunDim size={20} /> : <Sun size={20} />} onClick={() => setField((f) => !f)}>
            {field ? 'Keluar Mode Lapangan' : 'Mode Lapangan (kontras tinggi, layar tetap nyala)'}
          </Button>
          {master?.videoId && (
            <Button block className="mt-2" icon={<Play size={18} />} onClick={() => setExample({ from: 0 })}>
              Tonton video contoh
            </Button>
          )}
        </div>

        <div className="px-4 pt-4">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'shot', label: 'Shot list', count: s.shots.length - doneShots },
              { value: 'prep', label: 'Persiapan', count: s.prep.length - donePrep },
            ]}
          />
        </div>

        {tab === 'shot' ? (
          <Section>
            {field && next && (
              <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 mb-3 border-b-2 border-ink bg-paper px-4 py-3">
                <div className="kicker">Berikutnya · {nextIdx + 1}/{s.shots.length}</div>
                <div className="font-display text-2xl leading-tight font-bold">{next.label}</div>
                <div className="mt-1 text-base">{[next.shotType, next.angle, next.lens, next.fps && `${next.fps} fps`, next.movement].filter(Boolean).join(' · ')}</div>
                <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                  <Button variant="ink" size="lg" icon={<Check size={22} />} onClick={() => setShot(next.id, { done: true, goodTake: true })}>
                    Dapat!
                  </Button>
                  <Button size="lg" onClick={() => setShot(next.id, { takes: next.takes + 1 })} aria-label="Tambah take">
                    +Take <span className="font-mono">{next.takes}</span>
                  </Button>
                  {exampleRange(next.segmentId) && (
                    <Button size="lg" onClick={() => setExample(exampleRange(next.segmentId))} aria-label="Lihat contoh" className="w-14 px-0">
                      <Play size={22} />
                    </Button>
                  )}
                </div>
              </div>
            )}
            <ol className="space-y-2">
              {s.shots.map((sh, i) => (
                <ShotCard
                  key={sh.id}
                  shot={sh}
                  n={i + 1}
                  field={field}
                  onChange={(c) => setShot(sh.id, c)}
                  onEdit={() => setEditShot(sh.id)}
                  onExample={exampleRange(sh.segmentId) ? () => setExample(exampleRange(sh.segmentId)) : undefined}
                />
              ))}
            </ol>
            {!s.shots.length && <p className="py-4 text-sm text-ink-3">Belum ada shot. Tambah manual atau buat dari Referensi Utama.</p>}
            {!field && (
              <div className="mt-2 space-y-2">
                <Button
                  variant="ghost"
                  block
                  icon={<Plus size={18} />}
                  className="border-dashed border-line"
                  onClick={async () => {
                    const sh = newShot({ label: `Shot ${s.shots.length + 1}` })
                    await set({ shots: [...s.shots, sh] })
                    setEditShot(sh.id)
                  }}
                >
                  Tambah shot
                </Button>
                {s.masterId && <BridgeButton input={{ task: 'shoot', masterId: s.masterId, shootId: s.id }} label="Minta Claude lengkapi checklist" block />}
              </div>
            )}
            {allDone && (
              <div className="sketch mt-4 border-ok bg-ok-soft p-4">
                <div className="flex items-center gap-2 font-display text-lg font-bold">
                  <PartyPopper size={22} /> Semua shot beres
                </div>
                <p className="mt-1 text-sm text-ink-2">Cek ulang file di kartu memori sebelum pulang, lalu lanjut ke Resep Edit.</p>
                <Button variant="ink" block className="mt-3" onClick={finish} icon={<Clapperboard size={18} />}>
                  Lanjut ke edit
                </Button>
              </div>
            )}
          </Section>
        ) : (
          <PrepList s={s} field={field} />
        )}

        {!field && (
          <Section title="Catatan lapangan">
            <AutoField value={s.notes} onSave={(notes) => set({ notes })} multiline rows={3} placeholder="Setting kamera, kendala, ide tambahan…" />
            <Button
              block
              className="mt-3"
              icon={<CalendarPlus size={18} />}
              disabled={!s.date}
              onClick={() => downloadBlob(new Blob([shootsToIcs([s])], { type: 'text/calendar' }), `${s.title.slice(0, 30)}.ics`)}
            >
              Masukkan ke kalender / Ritme (.ics)
            </Button>
            {s.masterId && (
              <Button variant="ghost" block className="mt-2" onClick={() => navigate(`utama/${s.masterId}`)}>
                Buka Referensi Utama
              </Button>
            )}
          </Section>
        )}
      </Page>

      {example && master?.videoId && <ExampleSheet videoId={master.videoId} range={example} onClose={() => setExample(null)} />}
      <ShotSheet s={s} shotId={editShot} onClose={() => setEditShot(null)} />
      <InfoSheet s={s} open={editInfo} onClose={() => setEditInfo(false)} />
      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus sesi syuting?"
        onConfirm={async () => {
          await removeLinksOf('shoot', s.id)
          await db.shoots.delete(s.id)
          navigate('syuting', { replace: true })
        }}
      />
    </div>
  )
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0
  return (
    <div className="sketch px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-ink-2">{label}</span>
        <span className="font-display text-xl font-bold">
          {done}
          <span className="text-sm text-ink-3">/{total}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2">
        <div className={cx('h-full rounded-full transition-all', pct === 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ShotCard({
  shot,
  n,
  field,
  onChange,
  onEdit,
  onExample,
}: {
  shot: ShootShot
  n: number
  field: boolean
  onChange: (c: Partial<ShootShot>) => void
  onEdit: () => void
  onExample?: () => void
}) {
  const [zoom, setZoom] = useState(false)
  const meta = [shot.shotType, shot.angle, shot.lens, shot.fps && `${shot.fps} fps`, shot.movement, shot.durationSec && `${shot.durationSec} dtk`].filter(Boolean)
  return (
    <li className={cx('sketch overflow-hidden', shot.done && 'opacity-70')}>
      <div className="flex gap-3 p-3">
        {shot.frameId && (
          <button type="button" onClick={() => setZoom(true)} aria-label="Perbesar frame contoh">
            <Thumb id={shot.frameId} className={field ? 'h-28 w-20' : 'h-20 w-14'} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <CheckRow big={field} checked={shot.done} onToggle={() => onChange({ done: !shot.done })}>
            <span className="font-mono text-xs text-ink-3">{String(n).padStart(2, '0')} </span>
            {shot.label}
          </CheckRow>
          {meta.length > 0 && <div className={cx('mt-1 flex flex-wrap gap-1', field ? 'text-sm' : 'text-xs')}>{meta.map((m) => <span key={String(m)} className="rounded-md bg-paper-2 px-1.5 py-0.5 font-medium">{m}</span>)}</div>}
          {shot.description && <p className={cx('mt-1.5 text-ink-2', field ? 'text-base' : 'text-sm')}>{shot.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 border-t-[1.5px] border-dashed border-line px-2 py-1">
        <span className="pl-1 text-xs text-ink-3">Take</span>
        <IconButton label="Kurangi take" onClick={() => onChange({ takes: Math.max(0, shot.takes - 1) })} disabled={!shot.takes}>
          <Minus size={18} />
        </IconButton>
        <span className="w-6 text-center font-mono font-bold">{shot.takes}</span>
        <IconButton label="Tambah take" onClick={() => onChange({ takes: shot.takes + 1 })}>
          <Plus size={18} />
        </IconButton>
        <IconButton label={shot.goodTake ? 'Batal tandai take bagus' : 'Tandai sudah dapat take bagus'} active={shot.goodTake} onClick={() => onChange({ goodTake: !shot.goodTake, done: !shot.goodTake ? true : shot.done })}>
          <Star size={20} fill={shot.goodTake ? 'currentColor' : 'none'} />
        </IconButton>
        <div className="flex-1" />
        {onExample && (
          <IconButton label="Lihat contoh shot ini" onClick={onExample}>
            <Play size={19} />
          </IconButton>
        )}
        {!field && (
          <IconButton label="Ubah shot" onClick={onEdit}>
            <Pencil size={17} />
          </IconButton>
        )}
      </div>
      {zoom && (
        <Sheet open onClose={() => setZoom(false)} title={shot.label}>
          <Thumb id={shot.frameId} className="mx-auto h-[60dvh] w-auto max-w-full" />
        </Sheet>
      )}
    </li>
  )
}

function PrepList({ s, field }: { s: ShootSession; field: boolean }) {
  const [draft, setDraft] = useState('')
  const set = (prep: CheckItem[]) => patch(db.shoots, s.id, { prep })
  const add = () => {
    if (!draft.trim()) return
    set([...s.prep, { id: uid(), label: draft.trim(), done: false }])
    setDraft('')
  }
  const saveTemplate = async () => {
    await db.prepTemplates.add({ id: uid(), name: `Template ${s.title}`.slice(0, 40), items: s.prep.map((p) => p.label), createdAt: now(), updatedAt: now() })
    toast('Disimpan sebagai template persiapan')
  }
  return (
    <Section>
      <div className="divide-y-[1.5px] divide-line">
        {s.prep.map((p) => (
          <CheckRow
            key={p.id}
            big={field}
            checked={p.done}
            onToggle={() => set(s.prep.map((x) => (x.id === p.id ? { ...x, done: !x.done } : x)))}
            right={
              !field && (
                <IconButton label="Hapus item" onClick={() => set(s.prep.filter((x) => x.id !== p.id))}>
                  <Trash2 size={16} />
                </IconButton>
              )
            }
          >
            {p.label}
          </CheckRow>
        ))}
      </div>
      {!field && (
        <>
          <div className="mt-3 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Tambah item persiapan" className="field min-w-0 flex-1" />
            <Button onClick={add} aria-label="Tambah" className="w-12 px-0">
              <Plus size={20} />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-2" icon={<Save size={16} />} onClick={saveTemplate} disabled={!s.prep.length}>
            Simpan daftar ini sebagai template
          </Button>
        </>
      )}
    </Section>
  )
}

const SHOT_FIELDS: { key: keyof ShootShot; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: 'label', label: 'Nama shot', wide: true },
  { key: 'shotType', label: 'Jenis shot', placeholder: 'Close-up…' },
  { key: 'angle', label: 'Sudut', placeholder: 'Low angle…' },
  { key: 'lens', label: 'Lensa', placeholder: '50mm' },
  { key: 'fps', label: 'FPS', placeholder: '120' },
  { key: 'movement', label: 'Gerakan', placeholder: 'Orbit…', wide: true },
]

function ShotSheet({ s, shotId, onClose }: { s: ShootSession; shotId: string | null; onClose: () => void }) {
  const shot = s.shots.find((x) => x.id === shotId)
  if (!shot) return <Sheet open={false} onClose={onClose} children={null} />
  const up = (c: Partial<ShootShot>) => patch(db.shoots, s.id, { shots: s.shots.map((x) => (x.id === shot.id ? { ...x, ...c } : x)) })
  return (
    <Sheet open onClose={onClose} title="Ubah shot">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {SHOT_FIELDS.map((f) => (
            <div key={f.key} className={f.wide ? 'col-span-2' : ''}>
              <Label>{f.label}</Label>
              <AutoField value={String(shot[f.key] ?? '')} onSave={(v) => up({ [f.key]: v })} placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <Label>Durasi (dtk)</Label>
            <AutoField value={String(shot.durationSec)} inputMode="decimal" onSave={(v) => up({ durationSec: parseFloat(v.replace(',', '.')) || 0 })} />
          </div>
        </div>
        <div>
          <Label>Deskripsi</Label>
          <AutoField value={shot.description} onSave={(description) => up({ description })} multiline rows={2} />
        </div>
        <Button
          variant="danger"
          block
          icon={<Trash2 size={18} />}
          onClick={() => {
            patch(db.shoots, s.id, { shots: s.shots.filter((x) => x.id !== shot.id) })
            onClose()
          }}
        >
          Hapus shot
        </Button>
      </div>
    </Sheet>
  )
}

function InfoSheet({ s, open, onClose }: { s: ShootSession; open: boolean; onClose: () => void }) {
  const set = (c: Partial<ShootSession>) => patch(db.shoots, s.id, c)
  return (
    <Sheet open={open} onClose={onClose} title="Info sesi">
      <div className="space-y-3">
        <div>
          <Label>Judul</Label>
          <AutoField value={s.title} onSave={(title) => set({ title })} />
        </div>
        <div>
          <Label>Tanggal</Label>
          <input type="date" value={s.date ?? ''} onChange={(e) => set({ date: e.target.value || undefined })} className="field" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Mulai</Label>
            <input type="time" value={s.start ?? ''} onChange={(e) => set({ start: e.target.value || undefined })} className="field" />
          </div>
          <div>
            <Label>Selesai</Label>
            <input type="time" value={s.end ?? ''} onChange={(e) => set({ end: e.target.value || undefined })} className="field" />
          </div>
        </div>
        <div>
          <Label>Lokasi</Label>
          <AutoField value={s.location} onSave={(location) => set({ location })} />
        </div>
      </div>
    </Sheet>
  )
}

/** Putar video contoh dari detik tertentu; bila ada batas akhir, diulang di potongan itu saja. */
function ExampleSheet({ videoId, range, onClose }: { videoId: string; range: { from: number; to?: number }; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    let started = false
    // timer biasa (bukan requestAnimationFrame) supaya tetap jalan walau tab sedang tidak terlihat
    const t = window.setInterval(() => {
      const el = ref.current
      if (!el || el.readyState < 1) return
      if (!started) {
        started = true
        el.currentTime = range.from
        el.play().catch(() => {})
      } else if (range.to !== undefined && el.currentTime >= range.to) el.currentTime = range.from
    }, 80)
    return () => window.clearInterval(t)
  }, [range])
  return (
    <Sheet open onClose={onClose} title={range.to !== undefined ? 'Contoh shot ini' : 'Video contoh'}>
      <VideoPlayer id={videoId} ref={ref} />
      {range.to !== undefined && <p className="mt-2 text-center text-xs text-ink-3">Diulang di potongan ini saja</p>}
    </Sheet>
  )
}
