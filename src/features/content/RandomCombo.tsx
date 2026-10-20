import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Dices, Lock, LockOpen, Save } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Empty, PageHeader, cx } from '../../components/ui'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { newContentIdea } from '../../db/factories'
import { pickRandom } from '../../lib/id'
import { navigate } from '../../lib/router'

type Key = 'pola' | 'subjek' | 'gaya'

const BASE_STYLES = ['Sinematik slow-mo', 'Cepat ikut beat', 'Lo-fi handheld', 'Minimalis statis', 'Retro VHS', 'Stop motion', 'One take', 'Dokumenter', 'Komedi situasi', 'ASMR detail']
const BASE_SUBJECTS = ['Kopi pagi', 'Sepatu', 'Kampus', 'Teman kos', 'Motor', 'Makanan kaki lima', 'Alat kamera', 'Olahraga sore', 'Meja kerja', 'Hujan']

function splitList(s: string): string[] {
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 2 && x.length < 40)
}

/** Acak Kombinasi: satu pola × satu subjek × satu gaya untuk memancing ide baru. */
export default function RandomCombo() {
  const pool = useLiveQuery(async () => {
    const [patterns, ideas, refs] = await Promise.all([db.patterns.toArray(), db.ideas.toArray(), db.references.toArray()])
    const subjects = [...new Set([...ideas.filter((i) => i.kind !== 'parked').map((i) => i.title).filter((t) => t.length < 50), ...refs.map((r) => r.title).filter(Boolean), ...BASE_SUBJECTS])]
    const styles = [
      ...new Set([...refs.flatMap((r) => [...splitList(r.atm.amati.color), ...splitList(r.atm.amati.movement), ...splitList(r.atm.amati.emotion), ...splitList(r.atm.amati.rhythm)]), ...BASE_STYLES]),
    ]
    return { pola: patterns.map((p) => p.name), subjek: subjects, gaya: styles }
  }, [])
  const [combo, setCombo] = useState<Record<Key, string>>({ pola: '', subjek: '', gaya: '' })
  const [locked, setLocked] = useState<Record<Key, boolean>>({ pola: false, subjek: false, gaya: false })
  const [spin, setSpin] = useState(0)

  const roll = () => {
    if (!pool) return
    setCombo((c) => ({
      pola: locked.pola ? c.pola : (pickRandom(pool.pola) ?? ''),
      subjek: locked.subjek ? c.subjek : (pickRandom(pool.subjek) ?? ''),
      gaya: locked.gaya ? c.gaya : (pickRandom(pool.gaya) ?? ''),
    }))
    setSpin((s) => s + 1)
  }
  useEffect(() => {
    if (pool && !combo.pola) roll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])

  const save = async () => {
    const i = newContentIdea({
      title: `${combo.pola}: ${combo.subjek}`,
      concept: `Pola: ${combo.pola}\nSubjek: ${combo.subjek}\nGaya: ${combo.gaya}`,
      tags: ['acak'],
    })
    await db.ideas.add(i)
    toast('Disimpan ke Ide Konten', { label: 'Buka', run: () => navigate(`konten/${i.id}`) })
  }

  const rows: { key: Key; label: string }[] = [
    { key: 'pola', label: 'Pola' },
    { key: 'subjek', label: 'Subjek' },
    { key: 'gaya', label: 'Gaya' },
  ]

  return (
    <Page>
      <PageHeader kicker="Proyek" title="Acak Kombinasi" backTo="konten" />
      <div className="space-y-3 px-4">
        <p className="text-sm text-ink-2">Ambil satu pola, satu subjek, satu gaya dari simpananmu. Kunci yang sudah cocok, acak sisanya.</p>
        {pool && !pool.pola.length ? (
          <Empty title="Belum ada pola" text="Tambah pola di halaman bedah referensi dulu." />
        ) : (
          rows.map((r, i) => (
            <div key={r.key} className={cx('sketch flex min-h-24 items-center gap-3 p-4', locked[r.key] && 'border-ink')}>
              <div className="min-w-0 flex-1">
                <div className="kicker">
                  {String(i + 1).padStart(2, '0')} · {r.label}
                </div>
                <div key={spin + r.key} className="anim-fade mt-1 font-display text-xl font-bold break-words">
                  {combo[r.key] || '—'}
                </div>
              </div>
              <button
                type="button"
                aria-pressed={locked[r.key]}
                aria-label={locked[r.key] ? `Buka kunci ${r.label}` : `Kunci ${r.label}`}
                onClick={() => setLocked((l) => ({ ...l, [r.key]: !l[r.key] }))}
                className={cx('flex size-12 shrink-0 items-center justify-center rounded-xl border-[1.5px]', locked[r.key] ? 'border-ink bg-ink text-paper' : 'border-line text-ink-3')}
              >
                {locked[r.key] ? <Lock size={20} /> : <LockOpen size={20} />}
              </button>
            </div>
          ))
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2 pt-2">
          <Button variant="primary" size="lg" icon={<Dices size={22} />} onClick={roll}>
            Acak lagi
          </Button>
          <Button size="lg" icon={<Save size={20} />} onClick={save} disabled={!combo.pola}>
            Simpan
          </Button>
        </div>
      </div>
    </Page>
  )
}
