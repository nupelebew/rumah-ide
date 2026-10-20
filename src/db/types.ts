import type { Platform } from '../lib/platform'

export type ID = string

interface Base {
  id: ID
  createdAt: number
  updatedAt: number
  /** Data contoh bawaan; bisa dihapus sekali ketuk dari Pengaturan. */
  sample?: boolean
}

/* ---------- Ide ---------- */

export type IdeaKind = 'raw' | 'content' | 'daily' | 'parked'
export type Energy = 'kecil' | 'sedang' | 'besar'
export type ContentGoal = 'jualan' | 'branding' | 'edukasi' | 'hiburan'
export type ContentStage = 'ide' | 'dikembangkan' | 'siap' | 'syuting' | 'edit' | 'selesai'

export interface Scene {
  id: ID
  title: string
  durationSec: number
  visual: string
  audio: string
  text: string
}

export interface EditStep {
  id: ID
  segment: string
  steps: string[]
  done?: boolean
}

export interface Idea extends Base {
  kind: IdeaKind
  title: string
  body: string
  tags: string[]
  energy?: Energy
  /** Ide Konten */
  goal?: ContentGoal
  platforms?: Platform[]
  hook?: string
  concept?: string
  shots?: string[]
  needs?: { gear: string; location: string; talent: string }
  stage?: ContentStage
  storyboard?: Scene[]
  masterId?: ID
  /** Proyek: nama klien & target durasi (detik) */
  client?: string
  durationTarget?: number
  /** Kolom content planner (Google Sheets) */
  planner?: PlannerFields
  /** Ide Keseharian */
  categoryId?: ID
  convertedTo?: { type: 'task' | 'habit' | 'decision'; id: ID }
  archived?: boolean
}

export interface PlannerFields {
  akun?: string
  pic?: string
  pillar?: string
  jenis?: string
  /** YYYY-MM-DD */
  uploadDate?: string
  scriptDeadline?: string
  caption?: string
  /** Status manual (On Hold, Reschedule, Selesai di Upload, …). Kosong = otomatis dari langkah. */
  status?: string
}

/* ---------- Referensi & ATM ---------- */

export type RefStatus = 'belum' | 'dibedah' | 'dipakai'

export interface AtmAmati {
  hook: string
  structure: string
  shots: string
  movement: string
  transition: string
  rhythm: string
  onScreenText: string
  sound: string
  color: string
  emotion: string
  why: string
}

export interface Atm {
  amati: AtmAmati
  /** kunci field Amati yang dicentang untuk ditiru persis */
  tiru: (keyof AtmAmati)[]
  modifikasi: { subject: string; flip: string; niche: string }
}

export interface Reference extends Base {
  url: string
  platform: Platform
  title: string
  notes: string
  tags: string[]
  status: RefStatus
  patternIds: ID[]
  atm: Atm
  /** Video yang disimpan di HP (tabel media) */
  videoId?: ID
  durationSec?: number
  thumbId?: ID
  /** Frame penting yang diambil dari video (untuk dikirim ke Claude / moodboard) */
  frameIds?: ID[]
}

export interface Pattern extends Base {
  name: string
  description: string
  builtin?: boolean
}

/* ---------- Papan Racik & Referensi Utama ---------- */

export type TakeElement = 'hook' | 'movement' | 'transition' | 'rhythm' | 'color' | 'text' | 'sound' | 'angle' | 'mood'

export interface MixItem {
  id: ID
  refId: ID
  slotId: ID
  takes: TakeElement[]
  inSec?: number
  outSec?: number
  frameId?: ID
  note: string
}

export interface MixSlot {
  id: ID
  name: string
}

export interface Mix extends Base {
  title: string
  brief: string
  slots: MixSlot[]
  refIds: ID[]
  items: MixItem[]
  status: 'draft' | 'deal'
  masterId?: ID
  /** Proyek (Ide Konten) asal papan ini */
  ideaId?: ID
}

export interface Segment {
  id: ID
  slot: string
  label: string
  durationSec: number
  description: string
  refId?: ID
  inSec?: number
  outSec?: number
  frameId?: ID
  shotType: string
  angle: string
  lens: string
  fps: string
  movement: string
  transition: string
  text: string
  sound: string
  color: string
}

export interface Master extends Base {
  title: string
  mixId?: ID
  ideaId?: ID
  aspect: '9:16' | '16:9' | '1:1' | '4:5'
  summary: string
  segments: Segment[]
  editRecipe: EditStep[]
  /** Hasil render Remotion yang diunggah balik (opsional) */
  videoId?: ID
}

/* ---------- Syuting ---------- */

export interface ShootShot {
  id: ID
  label: string
  description: string
  shotType: string
  angle: string
  lens: string
  fps: string
  movement: string
  durationSec: number
  frameId?: ID
  segmentId?: ID
  done: boolean
  takes: number
  goodTake: boolean
}

export interface CheckItem {
  id: ID
  label: string
  done: boolean
}

export interface ShootSession extends Base {
  title: string
  date?: string
  start?: string
  end?: string
  location: string
  masterId?: ID
  ideaId?: ID
  shots: ShootShot[]
  prep: CheckItem[]
  notes: string
  icsUid?: string
}

export type GearType = 'kamera' | 'lensa' | 'stabilizer' | 'audio' | 'lampu' | 'drone' | 'lain'

export interface Gear extends Base {
  name: string
  type: GearType
  notes: string
}

export interface PrepTemplate extends Base {
  name: string
  items: string[]
}

/* ---------- Keseharian ---------- */

export interface Category extends Base {
  name: string
  builtin?: boolean
}

export interface Task extends Base {
  title: string
  due?: string
  done: boolean
  doneAt?: number
  categoryId?: ID
  ideaId?: ID
  shootId?: ID
}

export interface Habit extends Base {
  title: string
  categoryId?: ID
  checkins: string[]
  ideaId?: ID
  archived?: boolean
}

export interface Decision extends Base {
  title: string
  categoryId?: ID
  optionA: string
  optionB: string
  prosA: string[]
  consA: string[]
  prosB: string[]
  consB: string[]
  final?: 'A' | 'B'
  finalNote: string
  ideaId?: ID
}

/* ---------- Lintas mode ---------- */

export interface Tag {
  id: ID
  name: string
}

export type EntityType = 'idea' | 'reference' | 'master' | 'shoot' | 'task' | 'habit' | 'decision' | 'mix'

export interface Link {
  id: ID
  fromType: EntityType
  fromId: ID
  toType: EntityType
  toId: ID
  createdAt: number
}

export interface TodayPick {
  /** YYYY-MM-DD */
  date: string
  items: { type: EntityType; id: ID }[]
}

export interface Review {
  /** Senin minggu itu, YYYY-MM-DD */
  week: string
  answers: Record<string, string>
  createdAt: number
}

export interface Media {
  id: ID
  kind: 'video' | 'frame'
  name: string
  mime: string
  blob: Blob
  createdAt: number
  sample?: boolean
}

export interface Setting {
  key: string
  value: unknown
}
