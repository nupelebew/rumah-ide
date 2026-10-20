import { useState } from 'react'
import { ExternalLink, FolderPlus, PackageCheck } from 'lucide-react'
import { AutoField, Button, Label } from '../../components/ui'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { patch } from '../../db/repo'
import type { Idea, PlannerFields } from '../../db/types'
import { createDriveFolder, useSheetConfig } from './sync'

const isUrl = (s?: string) => !!s && /^https?:\/\//i.test(s.trim())

/** Kumpulan hasil proyek: catatan hasil, folder/file di Google Drive, link postingan. Ikut terkirim ke spreadsheet. */
export function HasilCard({ idea }: { idea: Idea }) {
  const cfg = useSheetConfig()
  const [busy, setBusy] = useState(false)
  const p = idea.planner ?? {}
  const set = (c: Partial<PlannerFields>) => patch(db.ideas, idea.id, { planner: { ...idea.planner, ...c } })

  const makeFolder = async () => {
    setBusy(true)
    try {
      const url = await createDriveFolder(idea)
      await set({ driveUrl: url })
      toast('Folder Drive siap. Unggah hasil ke sana.', { label: 'Buka', run: () => window.open(url, '_blank', 'noopener') })
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sketch space-y-4 p-4">
      <div className="flex items-center gap-2 font-display text-lg font-bold">
        <PackageCheck size={20} /> Hasil
      </div>
      <div>
        <Label hint="Mis. Final v2 · 30 dtk · 9:16">Catatan hasil</Label>
        <AutoField value={p.result ?? ''} onSave={(result) => set({ result })} placeholder="Versi akhir, durasi, catatan revisi…" />
      </div>
      <div>
        <Label hint="Tempat file hasil disimpan (folder atau file)">Link Google Drive</Label>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <AutoField value={p.driveUrl ?? ''} onSave={(driveUrl) => set({ driveUrl: driveUrl.trim() })} inputMode="url" placeholder="https://drive.google.com/…" />
          </div>
          {isUrl(p.driveUrl) && (
            <a href={p.driveUrl} target="_blank" rel="noreferrer noopener" aria-label="Buka di Google Drive" className="flex size-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-line bg-card">
              <ExternalLink size={18} />
            </a>
          )}
        </div>
        {!p.driveUrl && cfg?.url && (
          <Button size="sm" className="mt-2" icon={<FolderPlus size={16} />} onClick={makeFolder} disabled={busy}>
            {busy ? 'Membuat folder…' : 'Buat folder Drive otomatis'}
          </Button>
        )}
      </div>
      <div>
        <Label hint="Isi setelah diposting">Link postingan</Label>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <AutoField value={p.postUrl ?? ''} onSave={(postUrl) => set({ postUrl: postUrl.trim() })} inputMode="url" placeholder="https://instagram.com/reel/…" />
          </div>
          {isUrl(p.postUrl) && (
            <a href={p.postUrl} target="_blank" rel="noreferrer noopener" aria-label="Buka postingan" className="flex size-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-line bg-card">
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      </div>
      {cfg?.url && <p className="text-xs text-ink-3">Ketiganya ikut tercatat di spreadsheet (kolom Hasil, Link Google Drive, Link Postingan).</p>}
    </div>
  )
}
