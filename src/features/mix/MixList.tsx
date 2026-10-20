import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Clapperboard, Sparkles } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Chip, Empty, PageHeader, SampleBadge, Section } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { db } from '../../db/db'
import { newMaster, newMix } from '../../db/factories'
import { navigate } from '../../lib/router'

export default function MixList() {
  const mixes = useLiveQuery(() => db.mixes.orderBy('createdAt').reverse().toArray(), [])
  const masters = useLiveQuery(() => db.masters.orderBy('createdAt').reverse().toArray(), [])
  const [naming, setNaming] = useState<'mix' | 'master' | null>(null)
  const [title, setTitle] = useState('')

  const create = async () => {
    const t = title.trim() || 'Racikan baru'
    if (naming === 'mix') {
      const m = newMix(t)
      await db.mixes.add(m)
      navigate(`racik/${m.id}`)
    } else {
      const m = newMaster(t)
      await db.masters.add(m)
      navigate(`utama/${m.id}`)
    }
    setNaming(null)
    setTitle('')
  }

  return (
    <Page>
      <PageHeader kicker="Referensi · lanjutan" title="Racikan & Referensi Utama" backTo="ref" />

      <div className="space-y-2 px-4">
        <button type="button" onClick={() => navigate('konten')} className="sketch block w-full border-accent p-4 text-left active:translate-y-px">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-accent" />
            <span className="font-display text-lg font-bold">Cara cepat ada di Proyek</span>
          </div>
          <p className="mt-1 text-sm text-ink-2">Buat proyek → langkah 2 “Gabungkan di Claude”. Aplikasi menuntun sampai checklist & resep edit.</p>
          <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">Buka Proyek →</span>
        </button>
        <div className="rounded-[14px] border-[1.5px] border-dashed border-line p-3 text-sm text-ink-2">
          <b className="text-ink">Cara manual: Papan Racik</b> — susun sendiri referensi ke slot Hook/Isi/Penutup, tandai detiknya, lalu Deal. Cocok kalau mau kontrol penuh atau tanpa internet.
        </div>
      </div>

      <Section
        title="Papan Racik"
        action={
          <Button size="sm" variant="ink" icon={<Plus size={16} />} onClick={() => setNaming('mix')}>
            Baru
          </Button>
        }
      >
        {mixes && mixes.length === 0 ? (
          <Empty title="Belum ada racikan" text="Mulai dari Pustaka: ketuk “Pilih untuk diracik”, centang beberapa referensi. Atau buat papan kosong di sini." />
        ) : (
          <ul className="space-y-2">
            {mixes?.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => navigate(`racik/${m.id}`)} className="sketch w-full p-3.5 text-left active:translate-y-px">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">{m.title}</span>
                    {m.sample && <SampleBadge />}
                    <Chip tone={m.status === 'deal' ? 'ok' : 'warn'}>{m.status === 'deal' ? 'Deal' : 'Draf'}</Chip>
                  </div>
                  <div className="mt-1 font-mono text-xs text-ink-3">
                    {m.refIds.length} referensi · {m.items.length} potongan
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Referensi Utama"
        action={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setNaming('master')}>
            Kosong
          </Button>
        }
      >
        {masters && masters.length === 0 ? (
          <Empty title="Belum ada Referensi Utama" text="Terbentuk saat kamu menekan “Deal” di Papan Racik. Bisa juga dibuat kosong lalu diisi manual." />
        ) : (
          <ul className="space-y-2">
            {masters?.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => navigate(`utama/${m.id}`)} className="sketch flex w-full items-center gap-3 p-3.5 text-left active:translate-y-px">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-paper">
                    <Clapperboard size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{m.title}</span>
                      {m.sample && <SampleBadge />}
                    </span>
                    <span className="block font-mono text-xs text-ink-3">
                      {m.segments.length} segmen · {m.segments.reduce((a, s) => a + s.durationSec, 0).toFixed(1)} dtk · {m.aspect}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Sheet open={!!naming} onClose={() => setNaming(null)} title={naming === 'mix' ? 'Papan racik baru' : 'Referensi Utama kosong'}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="Judul (mis. “Reel tenis klien”)" className="field mb-3" />
        <Button variant="primary" size="lg" block onClick={create}>
          Buat
        </Button>
      </Sheet>
    </Page>
  )
}
