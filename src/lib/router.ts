import { useSyncExternalStore } from 'react'

// Snapshot = hash lengkap (termasuk ?query) supaya perubahan query juga memicu render ulang
function read(): string {
  return window.location.hash
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Router hash sederhana: "#/konten/abc" → ["konten", "abc"]. */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, read, () => '')
  const path = hash.replace(/^#\/?/, '').split('?')[0] || 'hari-ini'
  return path.split('/').filter(Boolean)
}

let depth = 0

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const url = `#/${path.replace(/^\/+/, '')}`
  if (url === window.location.hash) return
  if (!opts.replace) depth++
  if (opts.replace) {
    history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = url
  }
  window.scrollTo({ top: 0 })
}

/** Kembali ke layar sebelumnya di dalam aplikasi; kalau dibuka langsung, ke fallback. */
export function back(fallback: string) {
  if (depth > 0) {
    depth--
    history.back()
  } else navigate(fallback, { replace: true })
}

export function queryParam(name: string): string | null {
  const q = window.location.hash.split('?')[1]
  return q ? new URLSearchParams(q).get(name) : null
}
