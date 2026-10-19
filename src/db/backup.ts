import { db, DATA_TABLES, type DataTable } from './db'
import type { Media } from './types'

export const BACKUP_APP = 'rumah-ide'
export const BACKUP_VERSION = 1

/** Kunci pengaturan yang tidak pernah ikut diekspor (rahasia milik perangkat ini). */
const PRIVATE_SETTINGS = ['ai.apiKey']

interface MediaJson extends Omit<Media, 'blob'> {
  data: string
}

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  schema: number
  exportedAt: string
  tables: Partial<Record<DataTable, unknown[]>>
  media?: MediaJson[]
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}

function base64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function exportData(opts: { media: 'none' | 'frames' | 'all' }): Promise<Blob> {
  const tables: Backup['tables'] = {}
  for (const t of DATA_TABLES) {
    let rows = await db.table(t).toArray()
    if (t === 'settings') rows = rows.filter((s: { key: string }) => !PRIVATE_SETTINGS.includes(s.key))
    tables[t] = rows
  }
  const out: Backup = { app: BACKUP_APP, version: BACKUP_VERSION, schema: db.verno, exportedAt: new Date().toISOString(), tables }
  if (opts.media !== 'none') {
    const rows = opts.media === 'all' ? await db.media.toArray() : await db.media.where('kind').equals('frame').toArray()
    out.media = []
    for (const { blob, ...m } of rows) out.media.push({ ...m, data: await blobToBase64(blob) })
  }
  return new Blob([JSON.stringify(out)], { type: 'application/json' })
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File bukan JSON yang valid.')
  }
  const b = data as Backup
  if (!b || b.app !== BACKUP_APP || typeof b.tables !== 'object') throw new Error('Ini bukan file cadangan Rumah Ide.')
  if (b.version > BACKUP_VERSION) throw new Error('File dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi dulu.')
  return b
}

export function summarize(b: Backup): { label: string; n: number }[] {
  const L: Partial<Record<DataTable, string>> = { ideas: 'Ide', references: 'Referensi', masters: 'Referensi Utama', shoots: 'Sesi syuting', tasks: 'Tugas', habits: 'Kebiasaan', decisions: 'Keputusan', mixes: 'Papan racik' }
  const s = Object.entries(L).map(([k, label]) => ({ label: label!, n: b.tables[k as DataTable]?.length ?? 0 }))
  if (b.media?.length) s.push({ label: 'File media', n: b.media.length })
  return s.filter((x) => x.n)
}

/** replace = kosongkan dulu lalu isi; merge = timpa yang id-nya sama, sisanya tetap. */
export async function importData(b: Backup, mode: 'replace' | 'merge') {
  const tables = [...DATA_TABLES.map((t) => db.table(t)), db.media]
  await db.transaction('rw', tables, async () => {
    for (const t of DATA_TABLES) {
      const rows = b.tables[t]
      if (mode === 'replace') {
        if (t === 'settings') {
          const keep = await db.settings.where('key').anyOf(PRIVATE_SETTINGS).toArray()
          await db.settings.clear()
          await db.settings.bulkPut(keep)
        } else await db.table(t).clear()
      }
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows)
    }
    if (mode === 'replace' && b.media) await db.media.clear()
    if (b.media?.length) await db.media.bulkPut(b.media.map(({ data, ...m }) => ({ ...m, blob: base64ToBlob(data, m.mime) })))
  })
}
