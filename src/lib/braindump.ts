/**
 * Pecah teks brain dump jadi daftar ide.
 * Aturan: tiap baris = satu ide; tanda "-", "*", "•", atau "1." di awal baris dibuang;
 * " - " di tengah baris juga dipakai sebagai pemisah. Baris kosong & duplikat dibuang.
 */
export function splitBrainDump(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    for (const part of line.split(/\s+-\s+/)) {
      const clean = part
        .replace(/^\s*(?:[-*•–—]+|\d+[.)])\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!clean) continue
      const key = clean.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(clean)
    }
  }
  return out
}
