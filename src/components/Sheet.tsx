import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './ui'

/** Lembar bawah (bottom sheet) — semua dialog muncul dari bawah, di zona jempol. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" onClick={onClose} className="anim-fade absolute inset-0 bg-black/45" />
      <div className="anim-sheet relative mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl border-t-[1.5px] border-line bg-paper">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line" />
        {title !== undefined && (
          <div className="flex items-center gap-2 px-4 pt-2 pb-1">
            <h2 className="min-w-0 flex-1 text-xl font-bold">{title}</h2>
            <IconButton label="Tutup" onClick={onClose} className="-mr-2">
              <X size={22} />
            </IconButton>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-4 pt-2 pb-4">{children}</div>
        {footer && <div className="safe-b border-t-[1.5px] border-line bg-paper px-4 pt-3 pb-3">{footer}</div>}
        {!footer && <div className="safe-b" />}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({
  open,
  title,
  text,
  confirmLabel = 'Ya, hapus',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text?: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {text && <p className="mb-4 text-ink-2">{text}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="min-h-12 rounded-xl border-[1.5px] border-line bg-card font-semibold">
          Batal
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="min-h-12 rounded-xl border-[1.5px] border-accent bg-accent font-semibold text-accent-ink"
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
