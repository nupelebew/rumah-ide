import { useState } from 'react'
import { AlertCircle, CalendarDays, Check, ChevronRight, CloudOff, Loader } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { AutoField, Button, Chip, Choice, Label, cx } from '../../components/ui'
import { db } from '../../db/db'
import { patch } from '../../db/repo'
import type { Idea, PlannerFields } from '../../db/types'
import { formatDate } from '../../lib/dates'
import { navigate } from '../../lib/router'
import { autoStatus, projectRow } from './planner'
import { masterOf, useSheetConfig, useSyncState } from './sync'

const opts = (l: string[]) => l.map((v) => ({ value: v, label: v }))

/** Ringkasan kolom content planner di halaman Proyek. Ketuk untuk mengisi. */
export function PlannerCard({ idea }: { idea: Idea }) {
  const cfg = useSheetConfig()
  const state = useSyncState()
  const [open, setOpen] = useState(false)
  const master = masterOf(cfg)
  const row = projectRow(idea, master)
  const p = idea.planner ?? {}
  const set = (c: Partial<PlannerFields>) => patch(db.ideas, idea.id, { planner: { ...p, ...c } })
  const auto = autoStatus(idea.stage, master.status)

  const sync = !cfg?.url ? 'off' : state?.error[idea.id] ? 'error' : state?.pending.includes(idea.id) ? 'pending' : state?.ok[idea.id] ? 'ok' : 'pending'
  const summary = [row.akun || 'Pilih akun', row.jenis, row.tglUpload && `Upload ${formatDate(row.tglUpload, false)}`].filter(Boolean).join(' · ')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl bg-paper-2 px-3 py-2.5 text-left">
        <CalendarDays size={18} className="shrink-0 text-ink-2" />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-sm font-semibold', !row.akun && 'text-ink-3')}>{summary}</span>
          <span className="block truncate text-xs text-ink-3">{row.status}</span>
        </span>
        <SyncDot status={sync} />
        <ChevronRight size={18} className="shrink-0 text-ink-3" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Planner">
        <div className="space-y-4">
          <SyncLine status={sync} error={state?.error[idea.id]} />
          <div>
            <Label>Akun</Label>
            <Choice options={opts(master.akun)} value={p.akun} onChange={(akun) => set({ akun })} allowNone />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tgl upload</Label>
              <input type="date" value={p.uploadDate ?? ''} onChange={(e) => set({ uploadDate: e.target.value || undefined })} className="field" />
            </div>
            <div>
              <Label>Deadline script</Label>
              <input type="date" value={p.scriptDeadline ?? ''} onChange={(e) => set({ scriptDeadline: e.target.value || undefined })} className="field" />
            </div>
          </div>
          <div>
            <Label hint={!p.jenis && row.jenis ? `Otomatis: ${row.jenis}` : undefined}>Jenis</Label>
            <Choice options={opts(master.jenis)} value={p.jenis} onChange={(jenis) => set({ jenis })} allowNone />
          </div>
          <div>
            <Label hint={!p.pillar && row.pillar ? `Otomatis: ${row.pillar}` : undefined}>Pillar</Label>
            <Choice options={opts(master.pillar)} value={p.pillar} onChange={(pillar) => set({ pillar })} allowNone />
          </div>
          <div>
            <Label>PIC</Label>
            <Choice options={opts(master.pic)} value={p.pic} onChange={(pic) => set({ pic })} allowNone />
          </div>
          <div>
            <Label>Isi copywriting / caption</Label>
            <AutoField value={p.caption ?? ''} onSave={(caption) => set({ caption })} multiline rows={4} placeholder="Caption yang akan diposting" />
          </div>
          <div>
            <Label hint="Kosongkan pilihan = mengikuti langkah proyek">Status postingan</Label>
            <div className="flex flex-wrap gap-2">
              <Chip active={!p.status} onClick={() => set({ status: undefined })}>
                Otomatis · {auto}
              </Chip>
              {master.status.map((s) => (
                <Chip key={s} active={p.status === s} onClick={() => set({ status: p.status === s ? undefined : s })}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  )
}

function SyncDot({ status }: { status: string }) {
  if (status === 'off') return <CloudOff size={16} className="shrink-0 text-ink-3" aria-label="Spreadsheet belum tersambung" />
  if (status === 'error') return <AlertCircle size={16} className="shrink-0 text-accent" aria-label="Gagal kirim ke spreadsheet" />
  if (status === 'pending') return <Loader size={16} className="shrink-0 text-ink-3" aria-label="Menunggu dikirim" />
  return <Check size={16} className="shrink-0 text-ok" aria-label="Tersimpan di spreadsheet" />
}

function SyncLine({ status, error }: { status: string; error?: string }) {
  if (status === 'off')
    return (
      <div className="flex items-center gap-2 rounded-xl bg-paper-2 p-3 text-sm">
        <CloudOff size={18} className="shrink-0" />
        <span className="flex-1">Belum tersambung ke spreadsheet.</span>
        <Button size="sm" onClick={() => navigate('atur?bagian=spreadsheet')}>
          Sambungkan
        </Button>
      </div>
    )
  if (status === 'error') return <p className="rounded-xl bg-accent-soft p-3 text-sm">Gagal kirim: {error}. Dicoba lagi otomatis saat ada perubahan atau koneksi kembali.</p>
  if (status === 'pending') return <p className="rounded-xl bg-paper-2 p-3 text-sm">Menunggu dikirim ke spreadsheet…</p>
  return <p className="rounded-xl bg-ok-soft p-3 text-sm">Tersimpan di spreadsheet. Perubahan di sini ikut terkirim otomatis.</p>
}
