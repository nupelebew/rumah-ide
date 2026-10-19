/** Simpan file ke perangkat (unduhan lokal yang dibuat aplikasi sendiri). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Bagikan file lewat menu Bagikan HP (kalau didukung). Mengembalikan false jika tidak didukung. */
export async function shareFiles(files: File[], title: string): Promise<boolean> {
  try {
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title })
      return true
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return true
  }
  return false
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // cadangan untuk browser lama
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = () => resolve([...(input.files ?? [])])
    input.click()
  })
}

export function readText(file: File): Promise<string> {
  return file.text()
}
