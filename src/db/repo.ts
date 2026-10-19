import type { Table } from 'dexie'
import { db } from './db'
import { now, uid } from '../lib/id'
import type { EntityType, ID, Link, Media } from './types'
import { toDateKey } from '../lib/dates'

/** Perbarui sebagian field + updatedAt pada tabel apa pun yang punya kolom id. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function patch<T extends { updatedAt?: number }>(table: Table<T, ID, any>, id: ID, changes: Partial<T>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await table.update(id, { ...changes, updatedAt: now() } as any)
}

/* ---------- Tag ---------- */

export async function ensureTags(names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))]
  for (const name of clean) {
    const exists = await db.tags.where('name').equals(name).first()
    if (!exists) await db.tags.add({ id: uid(), name })
  }
}

/* ---------- Tautan ---------- */

export async function link(fromType: EntityType, fromId: ID, toType: EntityType, toId: ID) {
  const existing = await db.links.where('[fromType+fromId]').equals([fromType, fromId]).toArray()
  if (existing.some((l) => l.toType === toType && l.toId === toId)) return
  const back = await db.links.where('[fromType+fromId]').equals([toType, toId]).toArray()
  if (back.some((l) => l.toType === fromType && l.toId === fromId)) return
  await db.links.add({ id: uid(), fromType, fromId, toType, toId, createdAt: now() })
}

export async function linksOf(type: EntityType, id: ID): Promise<{ type: EntityType; id: ID; link: Link }[]> {
  const a = await db.links.where('[fromType+fromId]').equals([type, id]).toArray()
  const b = await db.links.where('[toType+toId]').equals([type, id]).toArray()
  return [...a.map((l) => ({ type: l.toType, id: l.toId, link: l })), ...b.map((l) => ({ type: l.fromType, id: l.fromId, link: l }))]
}

export async function unlink(linkId: ID) {
  await db.links.delete(linkId)
}

export async function removeLinksOf(type: EntityType, id: ID) {
  const ls = await linksOf(type, id)
  await db.links.bulkDelete(ls.map((l) => l.link.id))
}

/* ---------- Hari Ini ---------- */

export const TODAY_MAX = 3

export async function togglePick(type: EntityType, id: ID, date = toDateKey()): Promise<'added' | 'removed' | 'full'> {
  const cur = (await db.today.get(date)) ?? { date, items: [] }
  const has = cur.items.some((i) => i.type === type && i.id === id)
  if (has) {
    cur.items = cur.items.filter((i) => !(i.type === type && i.id === id))
    await db.today.put(cur)
    return 'removed'
  }
  if (cur.items.length >= TODAY_MAX) return 'full'
  cur.items.push({ type, id })
  await db.today.put(cur)
  return 'added'
}

/* ---------- Media ---------- */

export async function saveMedia(kind: Media['kind'], blob: Blob, name: string): Promise<ID> {
  const id = uid()
  await db.media.add({ id, kind, blob, name, mime: blob.type, createdAt: now() })
  return id
}

export async function deleteMedia(id?: ID) {
  if (id) await db.media.delete(id)
}

/* ---------- Pengaturan ---------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key)
  return (s?.value as T) ?? fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

/** Minta browser tidak menghapus data otomatis (penting untuk video yang disimpan di HP). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
