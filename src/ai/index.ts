import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { setSetting } from '../db/repo'
import { anthropicProvider } from './anthropic'
import type { AiProvider } from './provider'

export const PROVIDERS: Record<string, AiProvider> = { [anthropicProvider.id]: anthropicProvider }

export interface AiConfig {
  /** Tampilkan tombol Claude (salin-tempel) di seluruh aplikasi. */
  enabled: boolean
  provider: string
  apiKey: string
  model: string
}

const DEFAULT: AiConfig = { enabled: true, provider: 'anthropic', apiKey: '', model: 'claude-opus-5-5' }

export async function getAiConfig(): Promise<AiConfig> {
  const rows = await db.settings.where('key').startsWith('ai.').toArray()
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(3), r.value]))
  return { ...DEFAULT, ...m } as AiConfig
}

export function useAiConfig(): AiConfig | undefined {
  return useLiveQuery(getAiConfig, [])
}

export async function setAiConfig(c: Partial<AiConfig>) {
  for (const [k, v] of Object.entries(c)) await setSetting(`ai.${k}`, v)
}

/** Satu-satunya pintu keluar ke AI. Selalu dipanggil dari ketukan pengguna, tidak pernah otomatis. */
export async function suggest(prompt: string, opts: { system?: string; signal?: AbortSignal } = {}): Promise<string> {
  const c = await getAiConfig()
  const p = PROVIDERS[c.provider] ?? anthropicProvider
  if (!c.apiKey) throw new Error('Belum ada API key')
  return p.suggest(prompt, { apiKey: c.apiKey, model: c.model, ...opts })
}

export { AiError } from './provider'
