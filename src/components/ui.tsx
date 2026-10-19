import { type ButtonHTMLAttributes, type ReactNode, forwardRef, useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, X, Plus } from 'lucide-react'
import { back } from '../lib/router'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'ink' | 'ghost' | 'soft' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink border-accent active:brightness-95',
  ink: 'bg-ink text-paper border-ink active:opacity-90',
  ghost: 'bg-transparent text-ink border-transparent active:bg-paper-2',
  soft: 'bg-card text-ink border-line active:bg-paper-2',
  danger: 'bg-card text-accent border-line active:bg-accent-soft',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode; size?: 'md' | 'lg' | 'sm'; block?: boolean }
>(function Button({ variant = 'soft', icon, size = 'md', block, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] font-semibold transition select-none disabled:opacity-40 disabled:pointer-events-none',
        size === 'lg' && 'min-h-14 px-5 text-base',
        size === 'md' && 'min-h-12 px-4 text-sm',
        size === 'sm' && 'min-h-11 px-3 text-xs',
        block && 'w-full',
        VARIANT[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
})

export function IconButton({
  label,
  children,
  className,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition active:bg-paper-2 disabled:opacity-40',
        active ? 'text-accent' : 'text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Chip({
  children,
  active,
  onClick,
  className,
  tone,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  tone?: 'accent' | 'ok' | 'warn'
}) {
  const base = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-medium transition select-none'
  const look = active
    ? 'bg-ink text-paper border-ink'
    : tone === 'accent'
      ? 'bg-accent-soft text-ink border-transparent'
      : tone === 'ok'
        ? 'bg-ok-soft text-ink border-transparent'
        : tone === 'warn'
          ? 'bg-warn-soft text-ink border-transparent'
          : 'bg-card text-ink-2 border-line'
  if (!onClick) return <span className={cx(base, 'min-h-8 px-2.5 text-xs', look, className)}>{children}</span>
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx(base, look, 'active:scale-[0.97]', className)}>
      {active && <Check size={15} strokeWidth={2.5} />}
      {children}
    </button>
  )
}

export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1', className)}>{children}</div>
}

/** Pilihan tunggal dari beberapa opsi, berupa chip. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  allowNone,
}: {
  options: { value: T; label: string }[]
  value?: T
  onChange: (v: T | undefined) => void
  allowNone?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.value} active={value === o.value} onClick={() => onChange(allowNone && value === o.value ? undefined : o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  )
}

export function MultiChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <Chip key={o.value} active={on} onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
            {o.label}
          </Chip>
        )
      })}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border-[1.5px] border-line bg-paper-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition',
            value === o.value ? 'bg-card text-ink shadow-sketch' : 'text-ink-2',
          )}
        >
          {o.label}
          {o.count !== undefined && o.count > 0 && (
            <span className={cx('font-mono text-[11px]', value === o.value ? 'text-accent' : 'text-ink-3')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({
  kicker,
  title,
  backTo,
  actions,
  children,
}: {
  kicker?: string
  title: ReactNode
  backTo?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="px-4 pt-3 pb-3">
      <div className="flex items-start gap-1">
        {backTo && (
          <IconButton label="Kembali" onClick={() => back(backTo)} className="-ml-2.5">
            <ChevronLeft size={26} />
          </IconButton>
        )}
        <div className="min-w-0 flex-1 pt-1">
          {kicker && <div className="kicker mb-1">{kicker}</div>}
          <h1 className="text-2xl font-bold text-balance break-words">{title}</h1>
        </div>
        {actions && <div className="-mr-2 flex shrink-0 items-center">{actions}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  )
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('px-4 py-3', className)}>
      {(title || action) && (
        <div className="mb-2.5 flex min-h-8 items-center justify-between gap-2">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Empty({ title, text, action, illustration }: { title: string; text: string; action?: ReactNode; illustration?: ReactNode }) {
  return (
    <div className="sketch relative mx-auto my-2 border-dashed px-5 py-6 shadow-none">
      {illustration && <div className="mb-3 text-ink-3">{illustration}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-ink-2">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SampleBadge() {
  return <span className="tape inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-ink uppercase">Contoh</span>
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <div className="text-sm font-semibold">{children}</div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  )
}

/** Input teks yang menyimpan saat blur (dan debounce) — cocok untuk edit langsung ke DB. */
export function AutoField({
  value,
  onSave,
  placeholder,
  multiline,
  rows = 3,
  className,
  inputMode,
  type = 'text',
  autoFocus,
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
  className?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'url'
  type?: string
  autoFocus?: boolean
}) {
  const [v, setV] = useState(value)
  const timer = useRef<number | undefined>(undefined)
  const last = useRef(value)
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current && value !== last.current) {
      setV(value)
      last.current = value
    }
  }, [value])
  const commit = (nv: string) => {
    if (nv !== last.current) {
      last.current = nv
      onSave(nv)
    }
  }
  const change = (nv: string) => {
    setV(nv)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(nv), 600)
  }
  const common = {
    value: v,
    placeholder,
    autoFocus,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false
      window.clearTimeout(timer.current)
      commit(v)
    },
    className: cx('field', className),
  }
  return multiline ? (
    <textarea rows={rows} {...common} onChange={(e) => change(e.target.value)} />
  ) : (
    <input type={type} inputMode={inputMode} {...common} onChange={(e) => change(e.target.value)} />
  )
}

export function CheckRow({
  checked,
  onToggle,
  children,
  sub,
  right,
  big,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
  sub?: ReactNode
  right?: ReactNode
  big?: boolean
}) {
  return (
    <div className={cx('flex items-center gap-3', big ? 'min-h-16' : 'min-h-12')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className={cx(
          'flex shrink-0 items-center justify-center rounded-lg border-2 transition',
          big ? 'size-11' : 'size-8',
          checked ? 'border-ok bg-ok text-paper anim-pop' : 'border-ink-3 bg-card',
        )}
      >
        {checked && <Check size={big ? 26 : 18} strokeWidth={3} />}
      </button>
      <button type="button" onClick={onToggle} className="min-w-0 flex-1 py-1.5 text-left">
        <div className={cx('break-words', checked && 'text-ink-3 line-through decoration-2', big && 'text-lg font-semibold')}>{children}</div>
        {sub && <div className="text-xs text-ink-3">{sub}</div>}
      </button>
      {right}
    </div>
  )
}

/** Daftar teks kecil yang bisa ditambah/dihapus (pro-kontra, daftar shot, dll). */
export function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (!t) return
    onChange([...items, t])
    setDraft('')
  }
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex min-h-11 items-center gap-2 rounded-xl bg-paper-2 pl-3">
          <span className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
          <span className="min-w-0 flex-1 text-sm break-words">{it}</span>
          <IconButton label="Hapus" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X size={18} />
          </IconButton>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className="field min-w-0 flex-1"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button variant="soft" onClick={add} aria-label="Tambah" className="w-12 px-0">
          <Plus size={20} />
        </Button>
      </div>
    </div>
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="sketch px-3 py-2.5">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
    </div>
  )
}
