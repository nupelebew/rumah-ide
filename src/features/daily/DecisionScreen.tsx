import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, IconButton, Label, ListEditor, PageHeader, Section, cx } from '../../components/ui'
import { Confirm } from '../../components/Sheet'
import { LinkPanel } from '../../components/LinkPanel'
import { db } from '../../db/db'
import { patch, removeLinksOf } from '../../db/repo'
import type { Decision } from '../../db/types'
import { navigate } from '../../lib/router'

export default function DecisionScreen({ id }: { id?: string }) {
  const d = useLiveQuery(() => (id ? db.decisions.get(id) : undefined), [id])
  const [confirmDel, setConfirmDel] = useState(false)
  if (d === undefined) return null
  if (!d)
    return (
      <Page>
        <PageHeader title="Keputusan tidak ditemukan" backTo="harian?tab=keputusan" />
      </Page>
    )
  const set = (c: Partial<Decision>) => patch(db.decisions, d.id, c)
  const score = (pros: string[], cons: string[]) => pros.length - cons.length
  const sA = score(d.prosA, d.consA)
  const sB = score(d.prosB, d.consB)
  const lean = sA === sB ? null : sA > sB ? 'A' : 'B'

  return (
    <Page>
      <PageHeader
        kicker="Catatan Keputusan"
        title={d.title}
        backTo="harian?tab=keputusan"
        actions={
          <IconButton label="Hapus" onClick={() => setConfirmDel(true)}>
            <Trash2 size={20} />
          </IconButton>
        }
      />
      <div className="px-4">
        <AutoField value={d.title} onSave={(title) => set({ title })} placeholder="Apa yang mau diputuskan?" />
      </div>

      {(['A', 'B'] as const).map((k) => {
        const opt = k === 'A' ? d.optionA : d.optionB
        const pros = k === 'A' ? d.prosA : d.prosB
        const cons = k === 'A' ? d.consA : d.consB
        return (
          <Section key={k}>
            <div className={cx('sketch p-4', d.final === k && 'border-ok')}>
              <div className="mb-2 flex items-center gap-2">
                <span className={cx('flex size-9 items-center justify-center rounded-lg font-display text-lg font-bold', k === 'A' ? 'bg-ink text-paper' : 'bg-accent text-accent-ink')}>{k}</span>
                <span className="font-mono text-xs text-ink-3">
                  skor {score(pros, cons) > 0 ? '+' : ''}
                  {score(pros, cons)}
                </span>
              </div>
              <AutoField value={opt} onSave={(v) => set(k === 'A' ? { optionA: v } : { optionB: v })} placeholder={`Opsi ${k}`} className="font-semibold" />
              <div className="mt-3">
                <Label>Pro</Label>
                <ListEditor items={pros} onChange={(v) => set(k === 'A' ? { prosA: v } : { prosB: v })} placeholder="Kelebihan" />
              </div>
              <div className="mt-3">
                <Label>Kontra</Label>
                <ListEditor items={cons} onChange={(v) => set(k === 'A' ? { consA: v } : { consB: v })} placeholder="Kekurangan" />
              </div>
            </div>
          </Section>
        )
      })}

      <Section title="Keputusan akhir">
        {lean && !d.final && <p className="mb-2 text-sm text-ink-2">Dari hitungan pro-kontra, condong ke opsi {lean}. Tapi kamu yang menentukan.</p>}
        <div className="grid grid-cols-2 gap-2">
          {(['A', 'B'] as const).map((k) => (
            <Button key={k} size="lg" variant={d.final === k ? 'ink' : 'soft'} onClick={() => set({ final: d.final === k ? undefined : k })}>
              Pilih {k === 'A' ? d.optionA || 'A' : d.optionB || 'B'}
            </Button>
          ))}
        </div>
        <AutoField value={d.finalNote} onSave={(finalNote) => set({ finalNote })} multiline rows={2} placeholder="Kenapa memilih ini? (biar ingat nanti)" className="mt-3" />
        <div className="mt-4">
          <LinkPanel type="decision" id={d.id} />
        </div>
      </Section>

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus catatan keputusan?"
        onConfirm={async () => {
          await removeLinksOf('decision', d.id)
          await db.decisions.delete(d.id)
          navigate('harian?tab=keputusan', { replace: true })
        }}
      />
    </Page>
  )
}
