import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { getSetting, setSetting } from '../../db/repo'
import type { ID, Idea } from '../../db/types'
import { DEFAULT_MASTER, projectRow, type MasterLists } from './planner'

/**
 * Sinkron satu arah: proyek (Ide Konten) → sheet Planner lewat Google Apps Script milik pengguna.
 * Data hanya dikirim ke URL yang pengguna tempel sendiri di Pengaturan.
 */

export interface SheetConfig {
  url: string
  auto: boolean
  master?: MasterLists
}

export interface SyncState {
  /** waktu terakhir berhasil per proyek */
  ok: Record<ID, number>
  /** error terakhir per proyek */
  error: Record<ID, string>
  pending: ID[]
  deleted: ID[]
}

const EMPTY_STATE: SyncState = { ok: {}, error: {}, pending: [], deleted: [] }

export async function getSheetConfig(): Promise<SheetConfig> {
  return { url: await getSetting('sheet.url', ''), auto: await getSetting('sheet.auto', true), master: await getSetting<MasterLists | undefined>('sheet.master', undefined) }
}

export function useSheetConfig() {
  return useLiveQuery(getSheetConfig, [])
}

export function useSyncState() {
  return useLiveQuery(() => getSetting<SyncState>('sheet.state', EMPTY_STATE), [])
}

async function updateState(fn: (s: SyncState) => void) {
  const s = structuredClone(await getSetting<SyncState>('sheet.state', EMPTY_STATE))
  fn(s)
  await setSetting('sheet.state', s)
}

export function masterOf(c?: SheetConfig): MasterLists {
  return c?.master ?? DEFAULT_MASTER
}

/** Apps Script: request "simple" (text/plain) supaya tidak kena preflight CORS. */
async function call(url: string, body?: unknown): Promise<{ ok: boolean; error?: string; master?: MasterLists | null }> {
  const res = await fetch(url, body ? { method: 'POST', body: JSON.stringify(body) } : { method: 'GET' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json().catch(() => {
    throw new Error('Jawaban bukan JSON — pastikan aksesnya "Siapa saja" dan URL berakhiran /exec')
  })
  return data
}

/** Tes sambungan + ambil daftar Akun/PIC/Pillar/Jenis/Status dari sheet Master. */
export async function connect(url: string): Promise<MasterLists> {
  const clean = url.trim()
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(clean)) throw new Error('URL harus dari Apps Script dan berakhiran /exec')
  const r = await call(clean)
  if (!r.ok) throw new Error(r.error || 'Skrip menolak')
  const master = r.master ?? DEFAULT_MASTER
  await setSetting('sheet.url', clean)
  await setSetting('sheet.master', master)
  return master
}

export async function disconnect() {
  await setSetting('sheet.url', '')
}

let running = false

/** Kirim semua proyek di antrean (dan hapus baris proyek yang dihapus). */
export async function flush(): Promise<{ sent: number; failed: number }> {
  const cfg = await getSheetConfig()
  if (!cfg.url || running) return { sent: 0, failed: 0 }
  running = true
  try {
    const state = await getSetting<SyncState>('sheet.state', EMPTY_STATE)
    const ideas = (await db.ideas.bulkGet(state.pending)).filter((i): i is Idea => !!i && i.kind === 'content')
    let sent = 0
    let failed = 0
    if (ideas.length) {
      try {
        const r = await call(cfg.url, { action: 'upsert', rows: ideas.map((i) => projectRow(i, masterOf(cfg))) })
        if (!r.ok) throw new Error(r.error || 'Skrip menolak')
        if (r.master) await setSetting('sheet.master', r.master)
        const t = Date.now()
        // proyek yang diubah lagi selama pengiriman tetap di antrean supaya versi terbarunya ikut terkirim
        const now = await db.ideas.bulkGet(ideas.map((i) => i.id))
        const settled = ideas.filter((i, k) => now[k]?.updatedAt === i.updatedAt).map((i) => i.id)
        await updateState((s) => {
          for (const i of ideas) {
            s.ok[i.id] = t
            delete s.error[i.id]
          }
          s.pending = s.pending.filter((id) => !settled.includes(id))
        })
        if (settled.length < ideas.length) window.setTimeout(() => void flush(), 1500)
        sent = ideas.length
      } catch (e) {
        failed = ideas.length
        await updateState((s) => {
          for (const i of ideas) s.error[i.id] = (e as Error).message || 'Gagal'
        })
      }
    }
    // id di antrean yang ternyata bukan proyek lagi → buang (yang baru masuk selama kirim tetap aman)
    const stale = state.pending.filter((id) => !ideas.some((i) => i.id === id))
    if (stale.length) await updateState((s) => (s.pending = s.pending.filter((id) => !stale.includes(id))))
    if (state.deleted.length) {
      try {
        const r = await call(cfg.url, { action: 'delete', rows: state.deleted.map((id) => ({ id })) })
        if (r.ok) await updateState((s) => (s.deleted = s.deleted.filter((id) => !state.deleted.includes(id))))
      } catch {
        /* coba lagi nanti */
      }
    }
    return { sent, failed }
  } finally {
    running = false
  }
}

let timer: number | undefined

/** Tandai proyek perlu dikirim; dikirim setelah jeda singkat supaya ketikan beruntun jadi satu kiriman. */
export async function queue(id: ID) {
  await updateState((s) => {
    if (!s.pending.includes(id)) s.pending.push(id)
  })
  const cfg = await getSheetConfig()
  if (!cfg.url || !cfg.auto) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void flush(), 2500)
}

export async function queueAll() {
  const ids = await db.ideas.where('kind').equals('content').primaryKeys()
  await updateState((s) => {
    s.pending = [...new Set([...s.pending, ...ids])]
  })
  return flush()
}

/** Proyek dihapus di aplikasi → barisnya dikosongkan di sheet (kalau pernah terkirim). */
async function onDeleted(id: ID) {
  await updateState((s) => {
    s.pending = s.pending.filter((x) => x !== id)
    if (s.ok[id] && !s.deleted.includes(id)) s.deleted.push(id)
  })
  const c = await getSheetConfig()
  if (c.url && c.auto) await flush()
}

/** Pasang pemantau perubahan proyek. Dipanggil sekali saat aplikasi mulai. */
export function startSheetSync() {
  db.ideas.hook('creating', (_key, obj) => {
    if (obj.kind === 'content') setTimeout(() => void queue(obj.id), 0)
  })
  db.ideas.hook('updating', (mods, key, obj) => {
    const kind = (mods as Partial<Idea>).kind ?? obj.kind
    if (kind === 'content') setTimeout(() => void queue(key as ID), 0)
  })
  db.ideas.hook('deleting', (key, obj) => {
    if (obj?.kind === 'content') setTimeout(() => void onDeleted(key as ID), 0)
  })
  window.addEventListener('online', () => void flush())
  void flush()
}
