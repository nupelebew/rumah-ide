/**
 * Antarmuka tunggal untuk penyedia AI. Semua fitur memanggil `suggest()`;
 * penyedia bisa diganti tanpa menyentuh layar mana pun.
 */
export interface AiProvider {
  id: string
  label: string
  models: { id: string; label: string }[]
  /** Kirim prompt, kembalikan teks jawaban. Hanya dipanggil dari aksi eksplisit pengguna. */
  suggest(prompt: string, context: AiContext): Promise<string>
}

export interface AiContext {
  apiKey: string
  model: string
  system?: string
  signal?: AbortSignal
}

export class AiError extends Error {
  constructor(
    message: string,
    public kind: 'auth' | 'rate' | 'refusal' | 'network' | 'other' = 'other',
  ) {
    super(message)
  }
}
