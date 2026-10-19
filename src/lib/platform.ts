export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'pinterest'
  | 'vimeo'
  | 'threads'
  | 'file'
  | 'lainnya'

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  x: 'X',
  pinterest: 'Pinterest',
  vimeo: 'Vimeo',
  threads: 'Threads',
  file: 'File video',
  lainnya: 'Lainnya',
}

const HOSTS: [RegExp, Platform][] = [
  [/(^|\.)instagram\.com$|(^|\.)instagr\.am$/, 'instagram'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/, 'youtube'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.watch$|(^|\.)fb\.com$/, 'facebook'],
  [/(^|\.)twitter\.com$|(^|\.)x\.com$/, 'x'],
  [/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, 'pinterest'],
  [/(^|\.)vimeo\.com$/, 'vimeo'],
  [/(^|\.)threads\.net$|(^|\.)threads\.com$/, 'threads'],
]

/** Ambil URL pertama dari teks bebas (mis. teks bagikan dari aplikasi lain). */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i) ?? text.match(/\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}\/[^\s<>"']*/i)
  if (!m) return null
  const raw = m[0].replace(/[),.!?]+$/, '')
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

export function detectPlatform(input: string): Platform {
  const url = extractUrl(input.trim())
  if (!url) return 'lainnya'
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'lainnya'
  }
  host = host.replace(/^(www\.|m\.|vm\.|vt\.)/, '')
  for (const [re, p] of HOSTS) if (re.test(host)) return p
  return 'lainnya'
}

export function looksLikeUrl(text: string): boolean {
  const t = text.trim()
  return /^https?:\/\/\S+$/i.test(t) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\/\S*$/i.test(t)
}
