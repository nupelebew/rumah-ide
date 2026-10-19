export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'rumah-ide.theme'

/** Preferensi tema disimpan di localStorage agar diterapkan sebelum database siap. */
export function getThemePref(): ThemePref {
  try {
    return (localStorage.getItem(KEY) as ThemePref) || 'system'
  } catch {
    return 'system'
  }
}

export function setThemePref(p: ThemePref) {
  try {
    localStorage.setItem(KEY, p)
  } catch {
    /* mode privat: abaikan */
  }
  applyThemeSetting()
}

export function applyThemeSetting() {
  const p = getThemePref()
  const root = document.documentElement
  if (p === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', p)
  const dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#151412' : '#f3eee4'))
}
