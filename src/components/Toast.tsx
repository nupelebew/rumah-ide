import { useSyncExternalStore } from 'react'

interface ToastMsg {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

let items: ToastMsg[] = []
const subs = new Set<() => void>()
const emit = () => subs.forEach((s) => s())

export function toast(text: string, action?: ToastMsg['action']) {
  const id = Date.now() + Math.random()
  items = [...items.slice(-1), { id, text, action }]
  emit()
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, action ? 5000 : 2600)
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => items,
  )
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(104px + env(safe-area-inset-bottom))' }}
    >
      {list.map((t) => (
        <div key={t.id} className="anim-fade pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-3 rounded-xl bg-ink px-4 text-sm font-medium text-paper shadow-lg">
          <span className="flex-1 py-3">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="min-h-11 px-2 font-bold text-accent"
              onClick={() => {
                t.action!.run()
                items = items.filter((x) => x.id !== t.id)
                emit()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
