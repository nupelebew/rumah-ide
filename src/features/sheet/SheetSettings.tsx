import { useEffect, useRef, useState } from 'react'
import { Copy, ExternalLink, RefreshCw, Sheet as SheetIcon, Unplug } from 'lucide-react'
import { Button, CheckRow, Label, Section } from '../../components/ui'
import { toast } from '../../components/Toast'
import { setSetting } from '../../db/repo'
import { copyText } from '../../lib/file'
import { queryParam } from '../../lib/router'
import scriptSource from '../../../scripts/google-sheets/Code.gs?raw'
import { connect, disconnect, queueAll, useSheetConfig, useSyncState } from './sync'

/** Sambungan ke Google Sheets (content planner). */
export function SheetSettings() {
  const cfg = useSheetConfig()
  const state = useSyncState()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (queryParam('bagian') === 'spreadsheet') window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), 300)
  }, [])
  if (!cfg) return null

  const doConnect = async () => {
    setBusy(true)
    try {
      const m = await connect(url)
      toast(`Tersambung · ${m.akun.length} akun terbaca`)
      setUrl('')
      const r = await queueAll()
      if (r.sent) toast(`${r.sent} proyek dikirim ke spreadsheet`)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const resend = async () => {
    setBusy(true)
    try {
      const r = await queueAll()
      toast(r.failed ? `${r.failed} gagal dikirim` : `${r.sent} proyek dikirim`)
    } finally {
      setBusy(false)
    }
  }

  const sent = Object.keys(state?.ok ?? {}).length
  const errors = Object.keys(state?.error ?? {}).length

  return (
    <section ref={ref}>
      <Section
        title={
          <span className="flex items-center gap-2">
            <SheetIcon size={20} /> Spreadsheet (content planner)
          </span>
        }
      >
        {cfg.url ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-ok-soft p-3 text-sm">
              <b>Tersambung.</b> {sent} proyek ada di sheet Planner
              {state?.pending.length ? ` · ${state.pending.length} menunggu` : ''}
              {errors ? ` · ${errors} gagal` : ''}.
            </div>
            <CheckRow checked={cfg.auto} onToggle={() => setSetting('sheet.auto', !cfg.auto)} sub="Proyek baru & setiap perubahan langsung dikirim.">
              Kirim otomatis
            </CheckRow>
            <Button block icon={<RefreshCw size={18} />} onClick={resend} disabled={busy}>
              {busy ? 'Mengirim…' : 'Kirim ulang semua proyek'}
            </Button>
            <Button variant="ghost" block icon={<Unplug size={18} />} onClick={() => disconnect()}>
              Putuskan sambungan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">Setiap proyek otomatis jadi satu baris di sheet “Planner”: akun, status, tanggal upload, pillar, jenis, judul, caption, deadline, catatan. Pasang sekali, sekitar 3 menit.</p>
            <ol className="space-y-3 text-sm">
              <li>
                <b>1.</b> Unggah file planner ke Google Drive, buka, lalu <b>File → Simpan sebagai Google Spreadsheet</b>.
              </li>
              <li>
                <b>2.</b> Di spreadsheet itu: <b>Ekstensi → Apps Script</b>. Hapus isinya, tempel skrip ini, lalu Simpan.
                <Button size="sm" className="mt-2" icon={<Copy size={15} />} onClick={async () => (await copyText(scriptSource)) && toast('Skrip disalin')}>
                  Salin skrip
                </Button>
              </li>
              <li>
                <b>3.</b> <b>Terapkan → Deployment baru → Aplikasi web</b>. Jalankan sebagai <i>Saya</i>, akses <i>Siapa saja</i>. Terapkan, izinkan, lalu salin <b>URL aplikasi web</b>.
              </li>
              <li>
                <b>4.</b> Tempel URL-nya di sini:
              </li>
            </ol>
            <div>
              <Label hint="Berakhiran /exec. Jangan dibagikan ke orang lain.">URL aplikasi web</Label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" inputMode="url" className="field font-mono text-xs" />
            </div>
            <Button variant="primary" size="lg" block onClick={doConnect} disabled={busy || !url.trim()}>
              {busy ? 'Menyambungkan…' : 'Sambungkan'}
            </Button>
            <a href="https://drive.google.com/" target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-ink-2">
              <ExternalLink size={15} /> Buka Google Drive
            </a>
          </div>
        )}
      </Section>
    </section>
  )
}
