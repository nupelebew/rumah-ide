import type Anthropic from '@anthropic-ai/sdk'
import { AiError, type AiProvider } from './provider'

// Model yang mendukung server-side fallback mode "default" (dipakai saat permintaan ditolak filter keamanan)
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5'])

export const anthropicProvider: AiProvider = {
  id: 'anthropic',
  label: 'Claude (Anthropic)',
  models: [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — paling cerdas' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — cepat, lebih hemat' },
    { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — paling hemat' },
  ],
  async suggest(prompt, { apiKey, model, system, signal }) {
    // SDK dimuat saat dipakai saja supaya aplikasi tetap ringan bagi yang tidak memakai API.
    const { default: SDK } = await import('@anthropic-ai/sdk')
    // Key milik pengguna, disimpan hanya di perangkat ini; permintaan langsung dari browser ke Anthropic.
    const client = new SDK({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
    try {
      const useFallback = FALLBACK_MODELS.has(model)
      const response = await client.beta.messages.create(
        {
          model,
          max_tokens: 16000,
          output_config: { effort: 'medium' },
          ...(system ? { system } : {}),
          messages: [{ role: 'user', content: prompt }],
          ...(useFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        },
        { signal },
      )
      if (response.stop_reason === 'refusal') {
        throw new AiError('Claude menolak permintaan ini. Coba ubah kata-katanya atau pakai jalur salin-tempel.', 'refusal')
      }
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
      if (response.stop_reason === 'max_tokens' && !text.includes('```')) {
        throw new AiError('Jawaban terpotong karena terlalu panjang. Coba pilih lebih sedikit item.', 'other')
      }
      return text
    } catch (e) {
      if (e instanceof AiError) throw e
      if (e instanceof SDK.AuthenticationError) throw new AiError('API key ditolak. Cek lagi di Pengaturan.', 'auth')
      if (e instanceof SDK.PermissionDeniedError) throw new AiError('API key tidak punya akses ke model ini.', 'auth')
      if (e instanceof SDK.RateLimitError) throw new AiError('Terlalu banyak permintaan / kuota habis. Tunggu sebentar.', 'rate')
      if (e instanceof SDK.APIConnectionError) throw new AiError('Tidak ada koneksi internet.', 'network')
      if (e instanceof SDK.APIError) throw new AiError(`Gagal (${e.status ?? '?'}): ${e.message}`, 'other')
      throw new AiError((e as Error).message || 'Gagal menghubungi Claude')
    }
  },
}
