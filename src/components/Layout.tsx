import { type ReactNode } from 'react'
import { Clapperboard, LayoutGrid, NotebookPen, Plus, Search, Settings, Sun, CalendarHeart, History } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { navigate } from '../lib/router'
import { cx, IconButton } from './ui'
import { db } from '../db/db'
import { toDateKey } from '../lib/dates'

const TABS = [
  { key: 'tangkap', label: 'Tangkap', icon: NotebookPen },
  { key: 'ref', label: 'Referensi', icon: Clapperboard },
  null,
  { key: 'konten', label: 'Konten', icon: LayoutGrid },
  { key: 'harian', label: 'Harian', icon: CalendarHeart },
] as const

const SECTION_OF: Record<string, string> = {
  tangkap: 'tangkap',
  rapikan: 'tangkap',
  ref: 'ref',
  racik: 'ref',
  utama: 'ref',
  konten: 'konten',
  syuting: 'konten',
  acak: 'konten',
  harian: 'harian',
  keputusan: 'harian',
}

export function TopBar({ route }: { route: string }) {
  const pick = useLiveQuery(() => db.today.get(toDateKey()), [])
  const n = pick?.items.length ?? 0
  const onToday = route === 'hari-ini'
  return (
    <div className="safe-t sticky top-0 z-30 border-b-[1.5px] border-line/70 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => navigate('hari-ini')}
          className={cx(
            'flex min-h-11 items-center gap-2 rounded-xl px-2.5 font-display text-base font-bold transition',
            onToday ? 'text-ink' : 'text-ink-2 active:bg-paper-2',
          )}
          aria-label="Hari Ini"
        >
          <span className="relative flex size-7 items-center justify-center rounded-lg bg-ink text-paper">
            <Sun size={16} strokeWidth={2.5} />
            {n > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-accent font-mono text-[10px] font-bold text-accent-ink">
                {n}
              </span>
            )}
          </span>
          Hari Ini
        </button>
        <div className="flex-1" />
        <IconButton label="Cari" onClick={() => navigate('cari')} active={route === 'cari'}>
          <Search size={21} />
        </IconButton>
        <IconButton label="Review Mingguan" onClick={() => navigate('review')} active={route === 'review'}>
          <History size={21} />
        </IconButton>
        <IconButton label="Pengaturan" onClick={() => navigate('atur')} active={route === 'atur'}>
          <Settings size={21} />
        </IconButton>
      </div>
    </div>
  )
}

export function BottomNav({ route, onQuickAdd }: { route: string; onQuickAdd: () => void }) {
  const current = SECTION_OF[route]
  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-line bg-paper/95 backdrop-blur-md" aria-label="Navigasi utama">
      <div className="mx-auto grid h-[72px] max-w-xl grid-cols-5 items-center px-1">
        {TABS.map((t) =>
          t === null ? (
            <div key="fab" className="flex justify-center">
              <button
                type="button"
                onClick={onQuickAdd}
                aria-label="Tambah cepat"
                className="-mt-7 flex size-16 items-center justify-center rounded-2xl border-[1.5px] border-ink bg-accent text-accent-ink shadow-[3px_3px_0_var(--ink)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--ink)]"
              >
                <Plus size={32} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate(t.key)}
              aria-current={current === t.key ? 'page' : undefined}
              className={cx(
                'relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition',
                current === t.key ? 'text-ink' : 'text-ink-3',
              )}
            >
              <t.icon size={23} strokeWidth={current === t.key ? 2.4 : 1.9} />
              {t.label}
              {current === t.key && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent" />}
            </button>
          ),
        )}
      </div>
    </nav>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="pb-nav mx-auto w-full max-w-xl">{children}</main>
}
