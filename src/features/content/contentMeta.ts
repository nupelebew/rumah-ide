import type { ContentGoal, ContentStage } from '../../db/types'
import type { Platform } from '../../lib/platform'

export const STAGES: { value: ContentStage; label: string }[] = [
  { value: 'ide', label: 'Konsep' },
  { value: 'dikembangkan', label: 'Referensi' },
  { value: 'siap', label: 'Video contoh' },
  { value: 'syuting', label: 'Syuting' },
  { value: 'edit', label: 'Edit' },
  { value: 'selesai', label: 'Selesai' },
]

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.value, s.label])) as Record<ContentStage, string>

export const GOALS: { value: ContentGoal; label: string }[] = [
  { value: 'jualan', label: 'Jualan' },
  { value: 'branding', label: 'Branding' },
  { value: 'edukasi', label: 'Edukasi' },
  { value: 'hiburan', label: 'Hiburan' },
]

export const TARGET_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X' },
]

export function nextStage(s: ContentStage | undefined): ContentStage | null {
  const i = STAGES.findIndex((x) => x.value === (s ?? 'ide'))
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1].value : null
}
