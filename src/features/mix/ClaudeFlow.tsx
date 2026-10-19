import { useState } from 'react'
import { Copy, Download, ExternalLink, Sparkles } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button, Choice, Label, MultiChoice, cx } from '../../components/ui'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { newMaster } from '../../db/factories'
import { patch } from '../../db/repo'
import type { Master } from '../../db/types'
import { copyText } from '../../lib/file'
import { navigate } from '../../lib/router'
import { addDays, relativeDay, toDateKey } from '../../lib/dates'
import { mergeStartPrompt, type MergeBrief } from '../../ai/prompts'
import { BridgeSheet } from '../bridge/BridgeSheet'
import type { BridgeInput } from '../bridge/types'

const MOODS = ['Energik', 'Sinematik', 'Santai', 'Lucu', 'Mewah', 'Dramatis', 'Hangat'].map((v) => ({ value: v, label: v }))

/**
 * Cara cepat: Claude (claude.ai) yang menggabungkan video referensi jadi satu video contoh.
 * Langkah 1 di sini: isi brief → salin prompt pembuka. Referensi Utama kosong dibuat untuk menampung hasilnya.
 */
export function MergeStartSheet({ open, onClose, master }: { open: boolean; onClose: () => void; master?: Master }) {
  const [b, setB] = useState<MergeBrief>({ title: master?.title ?? '', brief: master?.summary ?? '', refCount: 7, duration: 20, aspect: master?.aspect ?? '9:16', mood: [], sound: 'ref' })
  const set = (c: Partial<MergeBrief>) => setB((x) => ({ ...x, ...c }))

  const go = async () => {
    const ok = await copyText(mergeStartPrompt(b))
    let id = master?.id
    if (!id) {
      const m = newMaster(b.title.trim() || 'Video gabungan Claude', { summary: b.brief, aspect: b.aspect as Master['aspect'] })
      await db.masters.add(m)
      id = m.id
    } else await patch(db.masters, id, { summary: b.brief || master!.summary, aspect: b.aspect as Master['aspect'] })
    toast(ok ? 'Prompt disalin. Tempel di Claude + lampirkan videonya.' : 'Gagal menyalin, coba lagi')
    onClose()
    navigate(`utama/${id}`)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Gabungkan referensi di Claude"
      footer={
        <Button variant="primary" size="lg" block icon={<Copy size={20} />} onClick={go}>
          Salin prompt & lanjut
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-2">Claude di claude.ai bisa memotong & menggabungkan video kirimanmu jadi satu video contoh lengkap dengan sound. Isi singkat di bawah, lalu tempel promptnya di Claude bersama videonya.</p>
        <div>
          <Label>Judul</Label>
          <input value={b.title} onChange={(e) => set({ title: e.target.value })} placeholder="mis. Reel tenis 75" className="field" />
        </div>
        <div>
          <Label>Brief</Label>
          <textarea value={b.brief} onChange={(e) => set({ brief: e.target.value })} rows={2} placeholder="mis. untuk klien klub tenis, tunjukkan energi main sore" className="field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jumlah video</Label>
            <div className="flex items-center gap-1">
              {[3, 5, 7].map((n) => (
                <button key={n} type="button" onClick={() => set({ refCount: n })} className={cx('min-h-11 flex-1 rounded-xl border-[1.5px] font-mono text-sm font-bold', b.refCount === n ? 'border-ink bg-ink text-paper' : 'border-line bg-card')}>
                  {n}
                </button>
              ))}
              <input type="number" inputMode="numeric" min={1} max={20} value={b.refCount} onChange={(e) => set({ refCount: Math.max(1, +e.target.value || 1) })} className="field min-h-11 w-14 px-2 text-center" aria-label="Jumlah video" />
            </div>
          </div>
          <div>
            <Label>Rasio</Label>
            <Choice options={['9:16', '4:5', '16:9'].map((v) => ({ value: v, label: v }))} value={b.aspect} onChange={(aspect) => aspect && set({ aspect })} />
          </div>
        </div>
        <div>
          <Label>Durasi</Label>
          <Choice options={[15, 20, 30, 45, 60].map((d) => ({ value: String(d), label: `${d} dtk` }))} value={String(b.duration)} onChange={(d) => d && set({ duration: +d })} />
        </div>
        <div>
          <Label>Nuansa</Label>
          <MultiChoice options={MOODS} value={b.mood} onChange={(mood) => set({ mood })} />
        </div>
        <div>
          <Label>Sound</Label>
          <Choice
            options={[
              { value: 'ref', label: 'Dari referensi' },
              { value: 'claude', label: 'Biar Claude pilih' },
              { value: 'none', label: 'Tanpa sound' },
            ]}
            value={b.sound}
            onChange={(sound) => sound && set({ sound })}
          />
        </div>
      </div>
    </Sheet>
  )
}

/** Langkah terakhir: minta Claude (di chat yang sama) mengirim segmen + checklist + resep edit sekaligus. */
export function HarvestButton({ master, variant = 'primary', label = 'Ambil hasil dari Claude' }: { master: Master; variant?: 'primary' | 'soft'; label?: string }) {
  const today = toDateKey()
  const [asking, setAsking] = useState(false)
  const [input, setInput] = useState<BridgeInput | null>(null)
  const [date, setDate] = useState<string | undefined>(today)
  const [start, setStart] = useState('16:00')
  const [end, setEnd] = useState('18:00')
  const [location, setLocation] = useState('')
  return (
    <>
      <Button variant={variant} size="lg" block icon={<Sparkles size={20} />} onClick={() => setAsking(true)}>
        {label}
      </Button>
      <Sheet
        open={asking}
        onClose={() => setAsking(false)}
        title="Kapan syutingnya?"
        footer={
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => {
              setAsking(false)
              setInput({ task: 'harvest', masterId: master.id, shootPlan: { date, start: date ? start : undefined, end: date ? end : undefined, location: location || undefined } })
            }}
          >
            Lanjut ke prompt
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-2">Dipakai Claude untuk mengurutkan shot sesuai cahaya. Prompt berikutnya <b>tempel di chat Claude yang sama</b> dengan tempat video gabungan dibuat.</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2].map((d) => {
              const k = addDays(today, d)
              return (
                <button key={d} type="button" onClick={() => setDate(k)} className={cx('min-h-11 rounded-xl border-[1.5px] text-sm font-semibold', date === k ? 'border-ink bg-ink text-paper' : 'border-line bg-card')}>
                  {relativeDay(k)}
                </button>
              )
            })}
            <button type="button" onClick={() => setDate(undefined)} className={cx('min-h-11 rounded-xl border-[1.5px] text-xs font-semibold', !date ? 'border-ink bg-ink text-paper' : 'border-line bg-card')}>
              Belum tahu
            </button>
          </div>
          {date && (
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="field" aria-label="Jam mulai" />
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="field" aria-label="Jam selesai" />
            </div>
          )}
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokasi (opsional), mis. Lapangan tenis kampus" className="field" />
        </div>
      </Sheet>
      {input && <BridgeSheet input={input} onClose={() => setInput(null)} />}
    </>
  )
}

/** Panel langkah demi langkah di Referensi Utama yang masih kosong. */
export function ClaudeSteps({ master }: { master: Master }) {
  const [restart, setRestart] = useState(false)
  const hasVideo = !!master.videoId
  const steps = [
    { done: true, text: 'Prompt pembuka disalin' },
    { done: false, text: 'Di Claude: tempel prompt + lampirkan semua video referensi (urut R1, R2, …). Tunggu videonya jadi.' },
    { done: hasVideo, text: 'Unduh video hasil Claude, lalu simpan di bagian “Video contoh” di bawah.' },
    { done: master.segments.length > 0, text: 'Ketuk “Ambil hasil dari Claude” → tempel di chat yang sama → tempel balik jawabannya.' },
  ]
  return (
    <div className="sketch space-y-3 border-accent p-4">
      <div className="kicker text-accent">Cara cepat · pakai Claude</div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold', s.done ? 'bg-ok text-paper' : 'bg-paper-2 text-ink-2')}>{s.done ? '✓' : i + 1}</span>
            <span className={cx(s.done && 'text-ink-3')}>{s.text}</span>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <a href="https://claude.ai/new" target="_blank" rel="noreferrer noopener" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-line bg-card text-sm font-semibold">
          <ExternalLink size={17} /> Buka Claude
        </a>
        <Button icon={<Download size={17} />} onClick={() => setRestart(true)}>
          Salin ulang prompt
        </Button>
      </div>
      <HarvestButton master={master} />
      <MergeStartSheet open={restart} onClose={() => setRestart(false)} master={master} />
    </div>
  )
}
