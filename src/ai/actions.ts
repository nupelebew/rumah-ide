/**
 * Format jawaban yang diminta dari Claude (salin-tempel maupun API) dan validatornya.
 * Fungsi di sini murni (tanpa DB) supaya mudah diuji.
 */

export const BLOCK_LANG = 'rumah-ide'

export interface SceneIn {
  title: string
  duration: number
  visual: string
  audio: string
  text: string
}

export interface SegmentIn {
  slot: string
  label: string
  duration: number
  description: string
  refNo?: string
  /** Detik di video sumber (bila Claude tahu) */
  sourceIn?: number
  sourceOut?: number
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

export interface ShotIn {
  label: string
  description: string
  shotType: string
  angle: string
  lens: string
  fps: string
  movement: string
  duration: number
}

export type Action =
  | { type: 'content_idea'; title: string; goal?: string; platforms: string[]; hook: string; concept: string; shots: string[]; storyboard: SceneIn[]; tags: string[]; sourceIdeaId?: string; refId?: string }
  | { type: 'daily_idea'; title: string; category?: string; sourceIdeaId?: string }
  | { type: 'task'; title: string; due?: string; category?: string; sourceIdeaId?: string }
  | { type: 'habit'; title: string; category?: string; sourceIdeaId?: string }
  | { type: 'decision'; title: string; optionA: string; optionB: string; prosA: string[]; consA: string[]; prosB: string[]; consB: string[]; sourceIdeaId?: string }
  | { type: 'group'; name: string; ideaIds: string[] }
  | { type: 'atm_fill'; refId: string; amati: Record<string, string> }
  | { type: 'storyboard'; ideaId: string; scenes: SceneIn[] }
  | { type: 'master'; masterId?: string; mixId?: string; title?: string; summary?: string; segments: SegmentIn[] }
  | { type: 'shoot_checklist'; shootId?: string; masterId?: string; title?: string; date?: string; start?: string; end?: string; location?: string; shots: ShotIn[]; prep: string[] }
  | { type: 'edit_recipe'; masterId: string; steps: { segment: string; steps: string[] }[] }
  | { type: 'review_summary'; week: string; text: string }
  | { type: 'note'; text: string }

export type ActionType = Action['type']

export interface ParseResult {
  actions: Action[]
  /** Teks di luar blok (diskusi/opini Claude) */
  prose: string
  errors: string[]
}

const AMATI_KEYS = ['hook', 'structure', 'shots', 'movement', 'transition', 'rhythm', 'onScreenText', 'sound', 'color', 'emotion', 'why']
const GOALS = ['jualan', 'branding', 'edukasi', 'hiburan']
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'x']

/* ---------- pembantu konversi yang toleran ---------- */

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '')
const strArr = (v: unknown, max = 60): string[] => (Array.isArray(v) ? v.map((x) => str(x, 500)).filter(Boolean).slice(0, max) : typeof v === 'string' && v.trim() ? [v.trim()] : [])
const num = (v: unknown, def: number, min = 0.2, max = 600): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def
}
const optStr = (v: unknown) => str(v) || undefined
const clock = (v: unknown) => (typeof v === 'string' && /^\d{1,2}[:.]\d{2}$/.test(v.trim()) ? v.trim().replace('.', ':').padStart(5, '0') : undefined)
const optNum = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? +n.toFixed(2) : undefined
}
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : undefined)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function scene(v: unknown): SceneIn {
  const o = obj(v)
  return { title: str(o.title, 120) || 'Adegan', duration: num(o.duration ?? o.durationSec, 3), visual: str(o.visual), audio: str(o.audio), text: str(o.text) }
}

function segment(v: unknown): SegmentIn {
  const o = obj(v)
  return {
    slot: str(o.slot, 60) || 'Isi',
    label: str(o.label, 120),
    duration: num(o.duration ?? o.durationSec, 2),
    description: str(o.description),
    refNo: optStr(o.refNo ?? o.ref),
    sourceIn: optNum(o.sourceIn),
    sourceOut: optNum(o.sourceOut),
    shotType: str(o.shotType, 120),
    angle: str(o.angle, 120),
    lens: str(o.lens, 60),
    fps: str(o.fps, 20),
    movement: str(o.movement, 160),
    transition: str(o.transition, 160),
    text: str(o.text, 300),
    sound: str(o.sound, 300),
    color: str(o.color, 200),
  }
}

function shot(v: unknown): ShotIn {
  const o = obj(v)
  return {
    label: str(o.label, 120) || 'Shot',
    description: str(o.description),
    shotType: str(o.shotType, 120),
    angle: str(o.angle, 120),
    lens: str(o.lens, 60),
    fps: str(o.fps, 20),
    movement: str(o.movement, 160),
    duration: num(o.duration ?? o.durationSec, 3),
  }
}

/** Ubah satu objek mentah menjadi Action yang valid, atau kembalikan pesan error. */
export function normalizeAction(raw: unknown): Action | string {
  const o = obj(raw)
  const type = str(o.type ?? o.tipe)
  switch (type) {
    case 'content_idea': {
      const title = str(o.title, 140)
      if (!title) return 'content_idea tanpa judul'
      const goal = str(o.goal).toLowerCase()
      return {
        type,
        title,
        goal: GOALS.includes(goal) ? goal : undefined,
        platforms: strArr(o.platforms).map((p) => p.toLowerCase()).filter((p) => PLATFORMS.includes(p)),
        hook: str(o.hook),
        concept: str(o.concept),
        shots: strArr(o.shots),
        storyboard: Array.isArray(o.storyboard) ? o.storyboard.slice(0, 30).map(scene) : [],
        tags: strArr(o.tags, 10).map((t) => t.toLowerCase().replace(/^#/, '')),
        sourceIdeaId: optStr(o.sourceIdeaId),
        refId: optStr(o.refId),
      }
    }
    case 'daily_idea':
    case 'task':
    case 'habit': {
      const title = str(o.title, 200)
      if (!title) return `${type} tanpa judul`
      const base = { title, category: optStr(o.category), sourceIdeaId: optStr(o.sourceIdeaId) }
      if (type === 'task') return { type, ...base, due: date(o.due) }
      return { type, ...base }
    }
    case 'decision': {
      const title = str(o.title, 200)
      if (!title) return 'decision tanpa judul'
      return {
        type,
        title,
        optionA: str(o.optionA, 200),
        optionB: str(o.optionB, 200),
        prosA: strArr(o.prosA),
        consA: strArr(o.consA),
        prosB: strArr(o.prosB),
        consB: strArr(o.consB),
        sourceIdeaId: optStr(o.sourceIdeaId),
      }
    }
    case 'group': {
      const name = str(o.name, 60)
      const ideaIds = strArr(o.ideaIds, 200)
      if (!name || ideaIds.length < 1) return 'group butuh name dan ideaIds'
      return { type, name, ideaIds }
    }
    case 'atm_fill': {
      const refId = str(o.refId)
      const a = obj(o.amati)
      const amati = Object.fromEntries(AMATI_KEYS.map((k) => [k, str(a[k])]).filter(([, v]) => v))
      if (!refId || !Object.keys(amati).length) return 'atm_fill butuh refId dan isian amati'
      return { type, refId, amati }
    }
    case 'storyboard': {
      const ideaId = str(o.ideaId)
      const scenes = Array.isArray(o.scenes) ? o.scenes.slice(0, 30).map(scene) : []
      if (!ideaId || !scenes.length) return 'storyboard butuh ideaId dan scenes'
      return { type, ideaId, scenes }
    }
    case 'master': {
      const segments = Array.isArray(o.segments) ? o.segments.slice(0, 40).map(segment) : []
      if (!segments.length) return 'master tanpa segments'
      return { type, masterId: optStr(o.masterId), mixId: optStr(o.mixId), title: optStr(o.title), summary: optStr(o.summary), segments }
    }
    case 'shoot_checklist': {
      const shots = Array.isArray(o.shots) ? o.shots.slice(0, 60).map(shot) : []
      if (!shots.length) return 'shoot_checklist tanpa shots'
      return {
        type,
        shootId: optStr(o.shootId),
        masterId: optStr(o.masterId),
        title: optStr(o.title),
        date: date(o.date),
        start: clock(o.start),
        end: clock(o.end),
        location: optStr(o.location),
        shots,
        prep: strArr(o.prep, 40),
      }
    }
    case 'edit_recipe': {
      const masterId = str(o.masterId)
      const steps = (Array.isArray(o.steps) ? o.steps : [])
        .map((s) => ({ segment: str(obj(s).segment, 120) || 'Langkah', steps: strArr(obj(s).steps, 20) }))
        .filter((s) => s.steps.length)
        .slice(0, 40)
      if (!masterId || !steps.length) return 'edit_recipe butuh masterId dan steps'
      return { type, masterId, steps }
    }
    case 'review_summary': {
      const text = str(o.text, 4000)
      const week = date(o.week)
      if (!text || !week) return 'review_summary butuh week dan text'
      return { type, week, text }
    }
    case 'note': {
      const text = str(o.text, 4000)
      return text ? { type, text } : 'note kosong'
    }
    default:
      return type ? `tipe aksi tidak dikenal: ${type}` : 'aksi tanpa type'
  }
}

/** Perbaiki JSON yang sedikit rusak: kutip miring, koma menggantung, komentar. */
export function lenientJson(text: string): unknown {
  const cleaned = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
  return JSON.parse(cleaned)
}

function extractJson(text: string): { json: string; prose: string } | null {
  const fence = /```[ \t]*([\w-]*)[^\n]*\n([\s\S]*?)```/g
  const blocks = [...text.matchAll(fence)]
  const pick = blocks.find((m) => m[1].toLowerCase() === BLOCK_LANG) ?? blocks.find((m) => m[1].toLowerCase() === 'json') ?? blocks.find((m) => m[2].trim().startsWith('{'))
  if (pick) return { json: pick[2], prose: text.replace(pick[0], '').trim() }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return { json: text.slice(start, end + 1), prose: text.slice(0, start).trim() }
  return null
}

/** Ambil blok ```rumah-ide dari jawaban Claude (teks bebas di sekitarnya diabaikan). */
export function parseResponse(text: string): ParseResult {
  const found = extractJson(text)
  if (!found) return { actions: [], prose: text.trim(), errors: ['Tidak menemukan blok ```rumah-ide di jawaban.'] }
  let data: unknown
  try {
    data = lenientJson(found.json)
  } catch {
    return { actions: [], prose: found.prose, errors: ['Blok jawaban bukan JSON yang valid (mungkin terpotong).'] }
  }
  const root = obj(data)
  const list = Array.isArray(data) ? data : Array.isArray(root.aksi) ? root.aksi : Array.isArray(root.actions) ? root.actions : null
  if (!list) return { actions: [], prose: found.prose, errors: ['Format tidak dikenali: butuh daftar "aksi".'] }
  const actions: Action[] = []
  const errors: string[] = []
  for (const raw of list.slice(0, 100)) {
    const a = normalizeAction(raw)
    if (typeof a === 'string') errors.push(a)
    else actions.push(a)
  }
  return { actions, prose: found.prose, errors }
}

/** Apakah teks terlihat seperti jawaban Claude untuk aplikasi ini (dipakai saat menempel di Tangkap Cepat). */
export function looksLikeBridgeResponse(text: string): boolean {
  return new RegExp('```[ \\t]*' + BLOCK_LANG).test(text) || /"aksi"\s*:\s*\[/.test(text)
}
