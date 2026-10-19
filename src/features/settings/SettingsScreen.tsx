import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Plus, Trash2, Upload, ShieldCheck, Eraser, RotateCcw, BookOpen } from 'lucide-react'
import { navigate } from '../../lib/router'
import { Page } from '../../components/Layout'
import { AutoField, Button, Choice, IconButton, Label, ListEditor, PageHeader, Section } from '../../components/ui'
import { Confirm, Sheet } from '../../components/Sheet'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { patch, requestPersistence, setSetting } from '../../db/repo'
import type { GearType } from '../../db/types'
import { exportData, importData, parseBackup, summarize, type Backup } from '../../db/backup'
import { clearSamples, countSamples, seedSamples } from '../../db/seed'
import { downloadBlob, pickFiles } from '../../lib/file'
import { toDateKey } from '../../lib/dates'
import { formatBytes } from '../../lib/video'
import { now, uid } from '../../lib/id'
import { getThemePref, setThemePref, type ThemePref } from './theme'
import { AiSettings } from '../../ai/AiSettings'

const GEAR_TYPES: { value: GearType; label: string }[] = [
  { value: 'kamera', label: 'Kamera' },
  { value: 'lensa', label: 'Lensa' },
  { value: 'stabilizer', label: 'Gimbal / tripod' },
  { value: 'audio', label: 'Audio' },
  { value: 'lampu', label: 'Lampu' },
  { value: 'drone', label: 'Drone' },
  { value: 'lain', label: 'Lainnya' },
]

export default function SettingsScreen() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref())
  return (
    <Page>
      <PageHeader title="Pengaturan" backTo="hari-ini" />
      <div className="px-4">
        <Button block icon={<BookOpen size={18} />} onClick={() => navigate('panduan')}>
          Panduan pemakaian
        </Button>
      </div>
      <Section title="Tampilan">
        <Choice<ThemePref>
          options={[
            { value: 'system', label: 'Ikuti sistem' },
            { value: 'light', label: 'Terang' },
            { value: 'dark', label: 'Gelap' },
          ]}
          value={theme}
          onChange={(t) => {
            if (!t) return
            setTheme(t)
            setThemePref(t)
          }}
        />
      </Section>
      <GearSection />
      <AiSettings />
      <TemplatesSection />
      <PatternsSection />
      <CategoriesSection />
      <DataSection />
      <Section title="Tentang">
        <p className="text-sm text-ink-2">
          Rumah Ide v{__APP_VERSION__}. Semua data tersimpan di perangkat ini saja (IndexedDB), tidak dikirim ke server mana pun. Fitur Claude hanya mengirim data saat kamu menekan tombolnya sendiri.
        </p>
      </Section>
    </Page>
  )
}

function GearSection() {
  const gear = useLiveQuery(() => db.gear.toArray(), []) ?? []
  const [name, setName] = useState('')
  const [type, setType] = useState<GearType>('kamera')
  const add = async () => {
    if (!name.trim()) return
    await db.gear.add({ id: uid(), name: name.trim(), type, notes: '', createdAt: now(), updatedAt: now() })
    setName('')
  }
  return (
    <Section title="Peralatan Saya">
      <p className="-mt-1 mb-3 text-sm text-ink-2">Dipakai supaya checklist shoot & saran Claude sesuai alat yang benar-benar kamu punya (mis. FPS maksimal kamera).</p>
      <div className="space-y-1.5">
        {gear.map((g) => (
          <div key={g.id} className="flex min-h-12 items-center gap-2 rounded-xl border-[1.5px] border-line bg-card pl-3">
            <span className="kicker w-20 shrink-0">{GEAR_TYPES.find((t) => t.value === g.type)?.label}</span>
            <div className="min-w-0 flex-1">
              <AutoField value={g.name} onSave={(v) => patch(db.gear, g.id, { name: v })} className="min-h-10 border-transparent bg-transparent px-0 py-1" />
            </div>
            <IconButton label="Hapus" onClick={() => db.gear.delete(g.id)}>
              <Trash2 size={17} />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <Choice options={GEAR_TYPES} value={type} onChange={(t) => t && setType(t)} />
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="mis. Sony ZV-E10 (maks 4K30 / FHD120)" className="field min-w-0 flex-1" />
          <Button variant="primary" onClick={add} disabled={!name.trim()} className="w-12 px-0" aria-label="Tambah alat">
            <Plus size={20} />
          </Button>
        </div>
      </div>
    </Section>
  )
}

function TemplatesSection() {
  const tpls = useLiveQuery(() => db.prepTemplates.toArray(), []) ?? []
  const [open, setOpen] = useState<string | null>(null)
  const t = tpls.find((x) => x.id === open)
  return (
    <Section
      title="Template persiapan syuting"
      action={
        <Button
          size="sm"
          icon={<Plus size={16} />}
          onClick={async () => {
            const id = uid()
            await db.prepTemplates.add({ id, name: 'Template baru', items: [], createdAt: now(), updatedAt: now() })
            setOpen(id)
          }}
        >
          Baru
        </Button>
      }
    >
      <div className="space-y-1.5">
        {tpls.map((x) => (
          <button key={x.id} type="button" onClick={() => setOpen(x.id)} className="flex min-h-12 w-full items-center justify-between rounded-xl border-[1.5px] border-line bg-card px-3 text-left">
            <span className="font-medium">{x.name}</span>
            <span className="font-mono text-xs text-ink-3">{x.items.length} item</span>
          </button>
        ))}
      </div>
      {t && (
        <Sheet open onClose={() => setOpen(null)} title="Template">
          <div className="space-y-3">
            <AutoField value={t.name} onSave={(name) => patch(db.prepTemplates, t.id, { name })} />
            <ListEditor items={t.items} onChange={(items) => patch(db.prepTemplates, t.id, { items })} placeholder="Item persiapan" />
            <Button
              variant="danger"
              block
              disabled={tpls.length < 2}
              onClick={() => {
                db.prepTemplates.delete(t.id)
                setOpen(null)
              }}
            >
              Hapus template
            </Button>
          </div>
        </Sheet>
      )}
    </Section>
  )
}

function PatternsSection() {
  const patterns = useLiveQuery(() => db.patterns.orderBy('name').toArray(), []) ?? []
  const [open, setOpen] = useState<string | null>(null)
  const p = patterns.find((x) => x.id === open)
  return (
    <Section
      title="Pola"
      action={
        <Button
          size="sm"
          icon={<Plus size={16} />}
          onClick={async () => {
            const id = uid()
            await db.patterns.add({ id, name: 'Pola baru', description: '', createdAt: now(), updatedAt: now() })
            setOpen(id)
          }}
        >
          Baru
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {patterns.map((x) => (
          <button key={x.id} type="button" onClick={() => setOpen(x.id)} className="min-h-11 rounded-full border-[1.5px] border-line bg-card px-3.5 text-sm font-medium">
            {x.name}
          </button>
        ))}
      </div>
      {p && (
        <Sheet open onClose={() => setOpen(null)} title="Pola">
          <div className="space-y-3">
            <AutoField value={p.name} onSave={(name) => patch(db.patterns, p.id, { name })} />
            <AutoField value={p.description} onSave={(description) => patch(db.patterns, p.id, { description })} multiline rows={3} placeholder="Cara kerjanya" />
            <Button
              variant="danger"
              block
              onClick={() => {
                db.patterns.delete(p.id)
                setOpen(null)
              }}
            >
              Hapus pola
            </Button>
          </div>
        </Sheet>
      )}
    </Section>
  )
}

function CategoriesSection() {
  const cats = useLiveQuery(() => db.categories.orderBy('name').toArray(), []) ?? []
  const [name, setName] = useState('')
  return (
    <Section title="Kategori keseharian">
      <div className="space-y-1.5">
        {cats.map((c) => (
          <div key={c.id} className="flex min-h-12 items-center gap-2 rounded-xl border-[1.5px] border-line bg-card pl-3">
            <div className="min-w-0 flex-1">
              <AutoField value={c.name} onSave={(v) => patch(db.categories, c.id, { name: v })} className="min-h-10 border-transparent bg-transparent px-0 py-1" />
            </div>
            <IconButton label="Hapus kategori" onClick={() => db.categories.delete(c.id)}>
              <Trash2 size={17} />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kategori baru" className="field min-w-0 flex-1" />
        <Button
          variant="primary"
          disabled={!name.trim()}
          className="w-12 px-0"
          aria-label="Tambah kategori"
          onClick={async () => {
            await db.categories.add({ id: uid(), name: name.trim(), createdAt: now(), updatedAt: now() })
            setName('')
          }}
        >
          <Plus size={20} />
        </Button>
      </div>
    </Section>
  )
}

function DataSection() {
  const [media, setMedia] = useState<'none' | 'frames' | 'all'>('frames')
  const [pending, setPending] = useState<Backup | null>(null)
  const [busy, setBusy] = useState(false)
  const [usage, setUsage] = useState<{ used: number; quota: number; persisted: boolean } | null>(null)
  const [confirmSamples, setConfirmSamples] = useState(false)
  const samples = useLiveQuery(() => countSamples(), []) ?? 0
  const mediaSize = useLiveQuery(async () => (await db.media.toArray()).reduce((a, m) => a + m.blob.size, 0), []) ?? 0

  useEffect(() => {
    ;(async () => {
      const est = await navigator.storage?.estimate?.()
      const persisted = (await navigator.storage?.persisted?.()) ?? false
      setUsage({ used: est?.usage ?? 0, quota: est?.quota ?? 0, persisted })
    })()
  }, [])

  const doExport = async () => {
    setBusy(true)
    try {
      const blob = await exportData({ media })
      downloadBlob(blob, `rumah-ide-cadangan-${toDateKey()}.json`)
      await setSetting('lastBackup', Date.now())
      toast(`Cadangan ${formatBytes(blob.size)} disimpan`)
    } finally {
      setBusy(false)
    }
  }
  const doPick = async () => {
    const [f] = await pickFiles('application/json,.json')
    if (!f) return
    try {
      setPending(parseBackup(await f.text()))
    } catch (e) {
      toast((e as Error).message)
    }
  }
  const doImport = async (mode: 'replace' | 'merge') => {
    if (!pending) return
    setBusy(true)
    try {
      await importData(pending, mode)
      toast('Data berhasil dipulihkan')
      setPending(null)
    } catch {
      toast('Gagal mengimpor. File rusak?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Data & cadangan">
      <div className="space-y-4">
        {usage && (
          <div className="rounded-xl bg-paper-2 p-3 text-sm">
            <div className="flex justify-between">
              <span>Terpakai</span>
              <span className="font-mono">
                {formatBytes(usage.used)} {usage.quota ? `/ ${formatBytes(usage.quota)}` : ''}
              </span>
            </div>
            <div className="flex justify-between text-ink-2">
              <span>Video & frame</span>
              <span className="font-mono">{formatBytes(mediaSize)}</span>
            </div>
            {!usage.persisted && (
              <Button
                size="sm"
                variant="ghost"
                icon={<ShieldCheck size={16} />}
                className="mt-2"
                onClick={async () => {
                  const ok = await requestPersistence()
                  setUsage((u) => (u ? { ...u, persisted: ok } : u))
                  toast(ok ? 'Data dilindungi dari pembersihan otomatis' : 'Browser menolak. Pasang ke layar utama dulu, lalu coba lagi.')
                }}
              >
                Lindungi data dari dihapus otomatis
              </Button>
            )}
          </div>
        )}
        <div>
          <Label hint="Video bisa sangat besar. Simpan video aslinya di galeri juga.">Ekspor cadangan (.json)</Label>
          <Choice
            options={[
              { value: 'none', label: 'Data saja' },
              { value: 'frames', label: '+ frame' },
              { value: 'all', label: '+ frame & video' },
            ]}
            value={media}
            onChange={(v) => v && setMedia(v)}
          />
          <Button variant="ink" size="lg" block className="mt-2" icon={<Download size={20} />} onClick={doExport} disabled={busy}>
            {busy ? 'Menyiapkan…' : 'Ekspor sekarang'}
          </Button>
        </div>
        <Button block icon={<Upload size={18} />} onClick={doPick} disabled={busy}>
          Impor dari file cadangan
        </Button>
        <div className="rounded-xl border-[1.5px] border-dashed border-line p-3">
          <div className="text-sm font-semibold">Data contoh</div>
          <p className="text-xs text-ink-3">{samples ? `${samples} item bertanda “Contoh”.` : 'Tidak ada data contoh.'}</p>
          {samples > 0 ? (
            <Button variant="danger" block className="mt-2" icon={<Eraser size={18} />} onClick={() => setConfirmSamples(true)}>
              Hapus semua contoh
            </Button>
          ) : (
            <Button
              variant="ghost"
              block
              className="mt-2"
              icon={<RotateCcw size={18} />}
              onClick={async () => {
                await setSetting('samples.seeded', false)
                await seedSamples()
                toast('Contoh dimuat lagi')
              }}
            >
              Muat contoh lagi
            </Button>
          )}
        </div>
      </div>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Pulihkan cadangan?">
        {pending && (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">Dibuat {new Date(pending.exportedAt).toLocaleString('id-ID')}. Isinya:</p>
            <ul className="grid grid-cols-2 gap-1 text-sm">
              {summarize(pending).map((s) => (
                <li key={s.label} className="rounded-lg bg-paper-2 px-2 py-1">
                  <b>{s.n}</b> {s.label}
                </li>
              ))}
            </ul>
            <Button variant="primary" size="lg" block onClick={() => doImport('merge')} disabled={busy}>
              Gabungkan dengan data sekarang
            </Button>
            <Button variant="danger" block onClick={() => doImport('replace')} disabled={busy}>
              Ganti semua data sekarang
            </Button>
          </div>
        )}
      </Sheet>
      <Confirm open={confirmSamples} onClose={() => setConfirmSamples(false)} title="Hapus semua data contoh?" text="Data milikmu tidak ikut terhapus." onConfirm={() => clearSamples().then(() => toast('Contoh dihapus'))} />
    </Section>
  )
}
