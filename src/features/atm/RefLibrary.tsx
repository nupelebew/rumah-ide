import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ClipboardPaste, Search, Upload, X, Shuffle } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Chip, ChipRow, Empty, PageHeader, SampleBadge, Segmented, cx } from '../../components/ui'
import { PlatformBadge, Thumb } from '../../components/Media'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { newMix } from '../../db/factories'
import type { RefStatus, Reference } from '../../db/types'
import { extractUrl, PLATFORM_LABEL, type Platform } from '../../lib/platform'
import { pickFiles } from '../../lib/file'
import { navigate } from '../../lib/router'
import { addRefFromUrl, addRefsFromFiles } from './refOps'

export const STATUS_LABEL: Record<RefStatus, string> = { belum: 'Belum dibedah', dibedah: 'Sudah dibedah', dipakai: 'Sudah dipakai' }
const STATUS_TONE: Record<RefStatus, 'warn' | 'accent' | 'ok'> = { belum: 'warn', dibedah: 'accent', dipakai: 'ok' }

export function RefTabs({ value }: { value: 'ref' | 'racik' }) {
  return (
    <Segmented
      value={value}
      onChange={(v) => navigate(v)}
      options={[
        { value: 'ref', label: 'Pustaka' },
        { value: 'racik', label: 'Papan Racik & Utama' },
      ]}
    />
  )
}

export default function RefLibrary() {
  const refs = useLiveQuery(() => db.references.orderBy('createdAt').reverse().toArray(), [])
  const patterns = useLiveQuery(() => db.patterns.toArray(), []) ?? []
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [platform, setPlatform] = useState<Platform>()
  const [status, setStatus] = useState<RefStatus>()
  const [pattern, setPattern] = useState<string>()
  const [tag, setTag] = useState<string>()
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const all = refs ?? []
  const platforms = [...new Set(all.map((r) => r.platform))]
  const tags = [...new Set(all.flatMap((r) => r.tags))]
  const usedPatterns = patterns.filter((p) => all.some((r) => r.patternIds.includes(p.id)))
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter(
      (r) =>
        (!platform || r.platform === platform) &&
        (!status || r.status === status) &&
        (!pattern || r.patternIds.includes(pattern)) &&
        (!tag || r.tags.includes(tag)) &&
        (!s || [r.title, r.url, r.notes, ...Object.values(r.atm.amati), ...r.tags].join(' ').toLowerCase().includes(s)),
    )
  }, [all, q, platform, status, pattern, tag])

  const add = async () => {
    const u = extractUrl(url)
    if (!u) return toast('Itu bukan link. Tempel link IG/TikTok/YouTube.')
    const r = await addRefFromUrl(u, url.replace(u, '').trim())
    setUrl('')
    toast(`Referensi ${PLATFORM_LABEL[r.platform]} ditambah`, { label: 'Bedah', run: () => navigate(`ref/${r.id}`) })
  }
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText()
      setUrl(t)
    } catch {
      toast('Tidak bisa membaca clipboard. Tempel manual ya.')
    }
  }
  const upload = async () => {
    const files = await pickFiles('video/*', true)
    if (!files.length) return
    setBusy(true)
    try {
      const rs = await addRefsFromFiles(files)
      toast(`${rs.length} video disimpan di HP`)
    } catch {
      toast('Gagal menyimpan video. Memori HP penuh?')
    } finally {
      setBusy(false)
    }
  }
  const startMix = async () => {
    const m = newMix(`Racikan ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`, selected)
    await db.mixes.add(m)
    setSelecting(false)
    setSelected([])
    navigate(`racik/${m.id}`)
  }
  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Page>
      <PageHeader kicker="Mode 2 · ATM" title="Bedah Referensi">
        <RefTabs value="ref" />
      </PageHeader>

      <div className="space-y-2 px-4">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            inputMode="url"
            placeholder="Tempel link Instagram / TikTok / YouTube"
            className="field min-w-0 flex-1"
          />
          {url ? (
            <Button variant="primary" onClick={add}>
              Tambah
            </Button>
          ) : (
            <Button onClick={paste} icon={<ClipboardPaste size={18} />} aria-label="Tempel dari clipboard">
              Tempel
            </Button>
          )}
        </div>
        <Button block variant="ghost" icon={<Upload size={18} />} onClick={upload} disabled={busy} className="border-dashed border-line">
          {busy ? 'Menyimpan video…' : 'Unggah video dari galeri'}
        </Button>
      </div>

      {all.length > 0 && (
        <div className="mt-3 space-y-1 px-4">
          <div className="relative">
            <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, catatan, hasil bedah…" className="field pl-10" />
          </div>
          <ChipRow>
            {(['belum', 'dibedah', 'dipakai'] as RefStatus[]).map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? undefined : s)}>
                {STATUS_LABEL[s]}
              </Chip>
            ))}
          </ChipRow>
          {(platforms.length > 1 || usedPatterns.length > 0 || tags.length > 0) && (
            <ChipRow>
              {platforms.length > 1 &&
                platforms.map((p) => (
                  <Chip key={p} active={platform === p} onClick={() => setPlatform(platform === p ? undefined : p)}>
                    {PLATFORM_LABEL[p]}
                  </Chip>
                ))}
              {usedPatterns.map((p) => (
                <Chip key={p.id} active={pattern === p.id} onClick={() => setPattern(pattern === p.id ? undefined : p.id)}>
                  {p.name}
                </Chip>
              ))}
              {tags.map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? undefined : t)}>
                  #{t}
                </Chip>
              ))}
            </ChipRow>
          )}
        </div>
      )}

      <div className="px-4 pt-2">
        {all.length > 1 && (
          <div className="mb-2 flex min-h-11 items-center justify-between">
            <span className="font-mono text-xs text-ink-3">{list.length} referensi</span>
            <Button
              size="sm"
              variant={selecting ? 'ink' : 'soft'}
              icon={selecting ? <X size={16} /> : <Shuffle size={16} />}
              onClick={() => {
                setSelecting(!selecting)
                setSelected([])
              }}
            >
              {selecting ? 'Batal pilih' : 'Pilih untuk diracik'}
            </Button>
          </div>
        )}
        {!refs ? null : all.length === 0 ? (
          <Empty
            title="Belum ada referensi"
            text="Tempel link video yang kamu suka, atau unggah video yang sudah kamu simpan. Lalu bedah pakai Amati → Tiru → Modifikasi."
          />
        ) : list.length === 0 ? (
          <Empty title="Tidak ada yang cocok" text="Coba hapus filter atau kata pencarian." />
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <RefCard
                key={r.id}
                r={r}
                patternNames={patterns.filter((p) => r.patternIds.includes(p.id)).map((p) => p.name)}
                selecting={selecting}
                selected={selected.includes(r.id)}
                onClick={() => (selecting ? toggleSel(r.id) : navigate(`ref/${r.id}`))}
              />
            ))}
          </ul>
        )}
      </div>

      {selecting && (
        <div className="fixed inset-x-0 z-40 px-4" style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-xl">
            <Button variant="primary" size="lg" block disabled={!selected.length} onClick={startMix} className="shadow-lg">
              Racik {selected.length || ''} referensi
            </Button>
          </div>
        </div>
      )}
    </Page>
  )
}

function RefCard({
  r,
  patternNames,
  selecting,
  selected,
  onClick,
}: {
  r: Reference
  patternNames: string[]
  selecting: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cx('sketch flex w-full gap-3 p-2.5 text-left active:translate-y-px', selected && 'border-ink')}>
        <Thumb id={r.thumbId} platform={r.platform} className="h-20 w-14" />
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={r.platform} />
            {r.sample && <SampleBadge />}
            {r.videoId && <span className="font-mono text-[10px] text-ink-3">VIDEO</span>}
          </div>
          <div className="mt-1 line-clamp-2 font-medium break-words">{r.title || r.url || 'Tanpa judul'}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Chip tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Chip>
            {patternNames.slice(0, 2).map((n) => (
              <Chip key={n}>{n}</Chip>
            ))}
          </div>
        </div>
        {selecting && (
          <span className={cx('flex size-8 shrink-0 items-center justify-center self-center rounded-lg border-2', selected ? 'border-ink bg-ink text-paper' : 'border-ink-3')}>
            {selected && <Check size={18} strokeWidth={3} />}
          </span>
        )}
      </button>
    </li>
  )
}

