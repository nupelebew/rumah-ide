import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, Flag, FlagOff, Package, Plus, Trash2, Play, ArrowRight, Pencil } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, Choice, IconButton, Label, MultiChoice, PageHeader, Section, cx } from '../../components/ui'
import { Thumb, VideoPlayer } from '../../components/Media'
import { Confirm, Sheet } from '../../components/Sheet'
import { LinkPicker } from '../../components/LinkPanel'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { deleteMedia, patch, saveMedia } from '../../db/repo'
import type { Mix, MixItem, Reference } from '../../db/types'
import { uid } from '../../lib/id'
import { navigate } from '../../lib/router'
import { formatTimecode } from '../../lib/dates'
import { frameFromElement } from '../../lib/video'
import { TAKE_LABEL, TAKE_OPTIONS, dealToMaster, refNo } from './mixOps'
import { BridgeButton } from '../bridge/BridgeButton'

export default function MixBoard({ id }: { id: string }) {
  const mix = useLiveQuery(() => db.mixes.get(id), [id])
  const refs = useLiveQuery(async () => {
    const m = await db.mixes.get(id)
    return m ? ((await db.references.bulkGet(m.refIds)).filter(Boolean) as Reference[]) : []
  }, [id])
  const [addingRef, setAddingRef] = useState(false)
  const [assignRef, setAssignRef] = useState<Reference | null>(null)
  const [editItem, setEditItem] = useState<string | null>(null)
  const [slotEdit, setSlotEdit] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  if (mix === undefined || refs === undefined) return null
  if (!mix)
    return (
      <Page>
        <PageHeader title="Papan tidak ditemukan" backTo="racik" />
      </Page>
    )
  const set = (c: Partial<Mix>) => patch(db.mixes, mix.id, c)
  const refById = new Map(refs.map((r) => [r.id, r]))

  const addItem = async (refId: string, slotId: string) => {
    const item: MixItem = { id: uid(), refId, slotId, takes: [], note: '' }
    await set({ items: [...mix.items, item] })
    setAssignRef(null)
    setEditItem(item.id)
  }
  const deal = async () => {
    if (!mix.items.length) return toast('Masukkan minimal satu referensi ke slot dulu')
    const mid = await dealToMaster(mix)
    toast('Referensi Utama siap')
    navigate(`utama/${mid}`)
  }

  return (
    <Page>
      <PageHeader
        kicker={`Papan Racik · ${mix.status === 'deal' ? 'Deal' : 'Draf'}`}
        title={mix.title}
        backTo="racik"
        actions={
          <IconButton label="Hapus papan" onClick={() => setConfirmDel(true)}>
            <Trash2 size={20} />
          </IconButton>
        }
      />
      <div className="space-y-2 px-4">
        <AutoField value={mix.title} onSave={(title) => set({ title })} placeholder="Judul racikan" />
        <AutoField value={mix.brief} onSave={(brief) => set({ brief })} multiline rows={2} placeholder="Video seperti apa yang mau dibuat? (mis. reel 20 dtk tenis sore, energik)" />
      </div>

      <Section title={<span>Referensi di papan <span className="font-mono text-sm font-normal text-ink-3">{refs.length}</span></span>}>
        <p className="-mt-1 mb-2 text-sm text-ink-2">Ketuk referensi untuk memasukkannya ke slot.</p>
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
          {refs.map((r) => {
            const used = mix.items.filter((i) => i.refId === r.id).length
            return (
              <button key={r.id} type="button" onClick={() => setAssignRef(r)} className="w-24 shrink-0 text-left">
                <Thumb id={r.thumbId} platform={r.platform} label={refNo(mix, r.id)} className={cx('h-32 w-24', used > 0 && 'ring-2 ring-accent')} />
                <div className="mt-1 line-clamp-2 text-xs font-medium">{r.title || r.url || 'Tanpa judul'}</div>
                {used > 0 && <div className="font-mono text-[10px] text-accent">dipakai {used}×</div>}
              </button>
            )
          })}
          <button type="button" onClick={() => setAddingRef(true)} className="flex h-32 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-ink-3 text-sm font-medium text-ink-2">
            <Plus size={22} /> Tambah
          </button>
        </div>
      </Section>

      <Section title="Alur video">
        <div className="space-y-3">
          {mix.slots.map((slot, si) => {
            const items = mix.items.filter((i) => i.slotId === slot.id)
            const dur = items.reduce((a, i) => a + (i.inSec !== undefined && i.outSec !== undefined ? i.outSec - i.inSec : 0), 0)
            return (
              <div key={slot.id} className="sketch overflow-hidden">
                <div className="flex items-center gap-2 border-b-[1.5px] border-dashed border-line px-3.5 py-2">
                  <span className="font-mono text-[11px] text-ink-3">{String(si + 1).padStart(2, '0')}</span>
                  <h3 className="flex-1 text-lg font-bold">{slot.name}</h3>
                  {dur > 0 && <span className="font-mono text-xs text-ink-3">{dur.toFixed(1)} dtk</span>}
                  <IconButton label={`Atur slot ${slot.name}`} onClick={() => setSlotEdit(slot.id)}>
                    <Pencil size={17} />
                  </IconButton>
                </div>
                <div className="space-y-2 p-2.5">
                  {items.map((it) => {
                    const r = refById.get(it.refId)
                    return (
                      <button key={it.id} type="button" onClick={() => setEditItem(it.id)} className="flex w-full items-center gap-3 rounded-xl bg-paper-2 p-2 text-left active:brightness-95">
                        <Thumb id={it.frameId ?? r?.thumbId} platform={r?.platform} label={refNo(mix, it.refId)} className="h-16 w-12" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{r?.title || r?.url || 'Referensi'}</div>
                          {it.takes.length > 0 && <div className="truncate text-xs text-ink-2">Ambil: {it.takes.map((t) => TAKE_LABEL[t]).join(', ')}</div>}
                          {it.inSec !== undefined && (
                            <div className="font-mono text-[11px] text-accent">
                              {formatTimecode(it.inSec)} → {it.outSec !== undefined ? formatTimecode(it.outSec) : '…'}
                            </div>
                          )}
                          {it.note && <div className="truncate text-xs text-ink-3">{it.note}</div>}
                        </div>
                      </button>
                    )
                  })}
                  {!items.length && <p className="px-1 py-2 text-sm text-ink-3">Kosong. Ketuk referensi di atas untuk mengisi.</p>}
                </div>
              </div>
            )
          })}
          <Button variant="ghost" block icon={<Plus size={18} />} className="border-dashed border-line" onClick={() => set({ slots: [...mix.slots, { id: uid(), name: `Bagian ${mix.slots.length + 1}` }] })}>
            Tambah slot
          </Button>
        </div>
      </Section>

      <Section title="Sudah sreg?">
        <div className="space-y-2">
          <BridgeButton input={{ task: 'mix-opinion', mixId: mix.id }} label="Minta pendapat Claude dulu" block />
          <Button variant="primary" size="lg" block icon={<Flag size={20} />} onClick={deal}>
            {mix.masterId ? 'Deal ulang → perbarui Referensi Utama' : 'Deal → buat Referensi Utama'}
          </Button>
          {mix.masterId && (
            <Button block icon={<ArrowRight size={18} />} onClick={() => navigate(`utama/${mix.masterId}`)}>
              Buka Referensi Utama
            </Button>
          )}
          {mix.status === 'deal' && (
            <Button variant="ghost" block icon={<FlagOff size={18} />} onClick={() => set({ status: 'draft' })}>
              Kembali ke draf
            </Button>
          )}
          <p className="pt-1 text-xs text-ink-3">
            <Package size={13} className="mr-1 inline" />
            Paket Remotion (video + titik potong + prompt untuk Claude Code) ada di layar Referensi Utama.
          </p>
        </div>
      </Section>

      <LinkPicker
        open={addingRef}
        onClose={() => setAddingRef(false)}
        types={['reference']}
        exclude={undefined}
        onPick={async (e) => {
          if (!mix.refIds.includes(e.id)) await set({ refIds: [...mix.refIds, e.id] })
          setAddingRef(false)
        }}
      />

      <Sheet open={!!assignRef} onClose={() => setAssignRef(null)} title={assignRef ? `${refNo(mix, assignRef.id)} dipakai untuk…` : ''}>
        {assignRef && (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">{assignRef.title || assignRef.url}</p>
            <div className="grid grid-cols-2 gap-2">
              {mix.slots.map((s) => (
                <Button key={s.id} size="lg" variant="ink" onClick={() => addItem(assignRef.id, s.id)}>
                  {s.name}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button block onClick={() => navigate(`ref/${assignRef.id}`)}>
                Lihat bedah ATM
              </Button>
              <Button
                block
                variant="danger"
                onClick={async () => {
                  await set({ refIds: mix.refIds.filter((x) => x !== assignRef.id), items: mix.items.filter((i) => i.refId !== assignRef.id) })
                  setAssignRef(null)
                }}
              >
                Keluarkan
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <ItemSheet mix={mix} itemId={editItem} refById={refById} onClose={() => setEditItem(null)} />
      <SlotSheet mix={mix} slotId={slotEdit} onClose={() => setSlotEdit(null)} />

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus papan racik?"
        text="Referensi dan Referensi Utama tidak ikut terhapus."
        onConfirm={async () => {
          await db.mixes.delete(mix.id)
          navigate('racik', { replace: true })
        }}
      />
    </Page>
  )
}

function ItemSheet({ mix, itemId, refById, onClose }: { mix: Mix; itemId: string | null; refById: Map<string, Reference>; onClose: () => void }) {
  const item = mix.items.find((i) => i.id === itemId)
  const ref = item ? refById.get(item.refId) : undefined
  const video = useRef<HTMLVideoElement>(null)
  const [t, setT] = useState(0)
  if (!item) return <Sheet open={false} onClose={onClose} children={null} />

  const update = (c: Partial<MixItem>) => patch(db.mixes, mix.id, { items: mix.items.map((i) => (i.id === item.id ? { ...i, ...c } : i)) })
  const markIn = async () => {
    const v = video.current
    if (!v) return
    const blob = await frameFromElement(v)
    await deleteMedia(item.frameId)
    const frameId = await saveMedia('frame', blob, `racik-${refNo(mix, item.refId)}-${formatTimecode(v.currentTime)}.jpg`)
    update({ inSec: +v.currentTime.toFixed(2), frameId, outSec: item.outSec !== undefined && item.outSec <= v.currentTime ? undefined : item.outSec })
  }
  const markOut = () => {
    const v = video.current
    if (!v) return
    if (item.inSec !== undefined && v.currentTime <= item.inSec) return toast('Titik selesai harus setelah titik mulai')
    update({ outSec: +v.currentTime.toFixed(2) })
  }
  const nudge = (which: 'inSec' | 'outSec', d: number) => {
    const cur = item[which]
    if (cur === undefined) return
    const nv = Math.max(0, +(cur + d).toFixed(2))
    update({ [which]: nv })
    if (video.current) video.current.currentTime = nv
  }
  const preview = () => {
    const v = video.current
    if (!v || item.inSec === undefined) return
    v.currentTime = item.inSec
    v.play()
    const stopAt = item.outSec ?? item.inSec + 2
    const check = () => {
      if (v.currentTime >= stopAt) v.pause()
      else if (!v.paused) requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  }

  return (
    <Sheet open={!!item} onClose={onClose} title={`${refNo(mix, item.refId)} · ${ref?.title || 'Potongan'}`}>
      <div className="space-y-5">
        {ref?.videoId ? (
          <div>
            <VideoPlayer id={ref.videoId} ref={video} onTime={setT} className="max-h-[40dvh]" />
            <div className="mt-1 text-center font-mono text-sm">{formatTimecode(t)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="ink" onClick={markIn}>
                Tandai mulai
              </Button>
              <Button variant="ink" onClick={markOut} disabled={item.inSec === undefined}>
                Tandai selesai
              </Button>
            </div>
            {item.inSec !== undefined && (
              <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-paper-2 p-2">
                <div className="space-y-1 font-mono text-sm">
                  <TimeNudge label="Mulai" value={item.inSec} onNudge={(d) => nudge('inSec', d)} />
                  {item.outSec !== undefined && <TimeNudge label="Selesai" value={item.outSec} onNudge={(d) => nudge('outSec', d)} />}
                </div>
                <Button size="sm" icon={<Play size={16} />} onClick={preview}>
                  Putar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border-[1.5px] border-dashed border-line p-3 text-sm text-ink-2">
            Referensi ini belum punya video, jadi tidak bisa ditandai detiknya. Lampirkan video di halaman bedah ATM-nya.
          </div>
        )}

        <div>
          <Label hint="Pilih semua yang berlaku">Yang diambil dari referensi ini</Label>
          <MultiChoice options={TAKE_OPTIONS} value={item.takes} onChange={(takes) => update({ takes })} />
        </div>
        <div>
          <Label>Masuk slot</Label>
          <Choice options={mix.slots.map((s) => ({ value: s.id, label: s.name }))} value={item.slotId} onChange={(slotId) => slotId && update({ slotId })} />
        </div>
        <div>
          <Label>Catatan</Label>
          <AutoField value={item.note} onSave={(note) => update({ note })} multiline rows={2} placeholder="mis. ambil gerakan orbit-nya saja, subjek diganti raket" />
        </div>
        <Button
          variant="danger"
          block
          icon={<Trash2 size={18} />}
          onClick={async () => {
            await deleteMedia(item.frameId)
            await patch(db.mixes, mix.id, { items: mix.items.filter((i) => i.id !== item.id) })
            onClose()
          }}
        >
          Hapus potongan ini
        </Button>
      </div>
    </Sheet>
  )
}

function TimeNudge({ label, value, onNudge }: { label: string; value: number; onNudge: (d: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-14 text-xs text-ink-3">{label}</span>
      <button type="button" className="min-h-10 min-w-10 rounded-lg bg-card text-xs font-bold" onClick={() => onNudge(-0.1)} aria-label={`${label} mundur 0,1 detik`}>
        −.1
      </button>
      <span className="w-16 text-center">{formatTimecode(value)}</span>
      <button type="button" className="min-h-10 min-w-10 rounded-lg bg-card text-xs font-bold" onClick={() => onNudge(0.1)} aria-label={`${label} maju 0,1 detik`}>
        +.1
      </button>
    </div>
  )
}

function SlotSheet({ mix, slotId, onClose }: { mix: Mix; slotId: string | null; onClose: () => void }) {
  const idx = mix.slots.findIndex((s) => s.id === slotId)
  const slot = mix.slots[idx]
  if (!slot) return <Sheet open={false} onClose={onClose} children={null} />
  const save = (slots: Mix['slots'], items = mix.items) => patch(db.mixes, mix.id, { slots, items })
  const move = (d: number) => {
    const s = [...mix.slots]
    const j = idx + d
    if (j < 0 || j >= s.length) return
    ;[s[idx], s[j]] = [s[j], s[idx]]
    save(s)
  }
  return (
    <Sheet open onClose={onClose} title="Atur slot">
      <div className="space-y-3">
        <AutoField value={slot.name} onSave={(name) => save(mix.slots.map((s) => (s.id === slot.id ? { ...s, name } : s)))} />
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<ArrowUp size={18} />} disabled={idx === 0} onClick={() => move(-1)}>
            Naik
          </Button>
          <Button icon={<ArrowDown size={18} />} disabled={idx === mix.slots.length - 1} onClick={() => move(1)}>
            Turun
          </Button>
        </div>
        <Button
          variant="danger"
          block
          disabled={mix.slots.length < 2}
          onClick={() => {
            const other = mix.slots.find((s) => s.id !== slot.id)!
            save(
              mix.slots.filter((s) => s.id !== slot.id),
              mix.items.map((i) => (i.slotId === slot.id ? { ...i, slotId: other.id } : i)),
            )
            onClose()
          }}
        >
          Hapus slot (isinya pindah ke {mix.slots.find((s) => s.id !== slot.id)?.name})
        </Button>
      </div>
    </Sheet>
  )
}
