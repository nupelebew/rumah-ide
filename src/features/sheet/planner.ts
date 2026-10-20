import type { Idea } from '../../db/types'

/** Daftar pilihan dari sheet Master. Bawaan = isi planner/Content_Planner_Rumah_Ide.xlsx. */
export interface MasterLists {
  status: string[]
  pillar: string[]
  jenis: string[]
  pic: string[]
  akun: string[]
}

export const DEFAULT_MASTER: MasterLists = {
  status: ['Konsep', 'Referensi', 'Video Contoh', 'Syuting', 'Editing', 'Siap Upload', 'Sudah Upload', 'On Hold', 'Reschedule', 'Revisi'],
  pillar: ['Engagement', 'Education', 'Social Proof', 'Brand Knowledge', 'Promotion', 'Story Telling', 'Personal Branding', 'Katalog', 'KOL Brief', 'Produk', 'Pengumuman', 'Behind The Scene'],
  jenis: ['Instagram Reels', 'Instagram Story', 'Instagram Carousel Feed', 'Instagram Single Feed', 'TikTok Video', 'TikTok Story', 'TikTok Ads', 'YouTube Video', 'YouTube Shorts'],
  pic: ['PIC 1', 'PIC 2', 'PIC 3', 'PIC 4', 'PIC 5'],
  akun: ['Akun 1', 'Akun 2', 'Akun 3', 'Akun 4', 'Akun 5'],
}

/** Satu baris sheet Planner. Skrip menaruh tiap nilai di kolom yang judulnya cocok. */
export interface PlannerRow {
  id: string
  akun: string
  status: string
  pic: string
  tglUpload: string
  pillar: string
  jenis: string
  judul: string
  copywriting: string
  deadlineScript: string
  catatan: string
  klien: string
}

type StageKey = NonNullable<Idea['stage']> | 'uploaded'

/**
 * Nama status yang dicari per langkah. Nama pertama untuk planner baru, nama kedua untuk planner lama
 * (Content_Planner_Multi_Akun.xlsx). Kalau tidak ada yang cocok, pakai urutan di Master.
 */
const STATUS_NAMES: Record<StageKey, { names: string[]; index: number }> = {
  ide: { names: ['Konsep', 'Proses Writing'], index: 0 },
  dikembangkan: { names: ['Referensi', 'Proses Design'], index: 1 },
  siap: { names: ['Video Contoh', 'Proses Design'], index: 2 },
  syuting: { names: ['Syuting', 'Proses Design'], index: 3 },
  edit: { names: ['Editing', 'Proses Revisi'], index: 4 },
  selesai: { names: ['Siap Upload'], index: 5 },
  uploaded: { names: ['Sudah Upload', 'Selesai di Upload'], index: 6 },
}

function statusFor(key: StageKey, status: string[]): string {
  const { names, index } = STATUS_NAMES[key]
  for (const n of names) {
    const hit = status.find((s) => s.toLowerCase() === n.toLowerCase())
    if (hit) return hit
  }
  return status[Math.min(index, status.length - 1)] ?? ''
}

export function autoStatus(stage: Idea['stage'], status: string[]): string {
  return statusFor(stage ?? 'ide', status)
}

export function uploadedStatus(status: string[]): string {
  return statusFor('uploaded', status)
}

const GOAL_PILLAR: Record<string, string> = { jualan: 'Promotion', branding: 'Personal Branding', edukasi: 'Education', hiburan: 'Engagement' }
const PLATFORM_JENIS: Record<string, string> = { instagram: 'Instagram Reels', tiktok: 'TikTok Video', youtube: 'YouTube Video' }

/** Pilihan yang cocok dari daftar Master (abaikan besar-kecil huruf), atau kosong. */
function pick(list: string[], want?: string): string {
  if (!want) return ''
  return list.find((v) => v.toLowerCase() === want.toLowerCase()) ?? ''
}

export function projectRow(idea: Idea, master: MasterLists = DEFAULT_MASTER): PlannerRow {
  const p = idea.planner ?? {}
  const notes = [idea.hook && `Hook: ${idea.hook}`, idea.concept, idea.storyboard?.length && `${idea.storyboard.length} adegan`].filter(Boolean).join('\n')
  return {
    id: idea.id,
    akun: p.akun ?? '',
    status: p.status || autoStatus(idea.stage, master.status),
    pic: p.pic ?? '',
    tglUpload: p.uploadDate ?? '',
    pillar: p.pillar || pick(master.pillar, GOAL_PILLAR[idea.goal ?? '']),
    jenis: p.jenis || pick(master.jenis, PLATFORM_JENIS[idea.platforms?.[0] ?? '']),
    judul: idea.title,
    copywriting: p.caption ?? '',
    deadlineScript: p.scriptDeadline ?? '',
    catatan: notes,
    klien: idea.client ?? '',
  }
}
