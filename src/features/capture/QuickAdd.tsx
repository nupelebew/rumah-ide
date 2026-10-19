import { useEffect, useMemo, useRef, useState } from 'react'
import { Link2, ListPlus, CheckSquare } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import { toast } from '../../components/Toast'
import { splitBrainDump } from '../../lib/braindump'
import { detectPlatform, extractUrl, PLATFORM_LABEL } from '../../lib/platform'
import { db } from '../../db/db'
import { newIdea, newReference } from '../../db/factories'
import { navigate } from '../../lib/router'
import { uid, now } from '../../lib/id'
import { toDateKey } from '../../lib/dates'
import { looksLikeBridgeResponse } from '../../ai/actions'
import { BridgeSheet } from '../bridge/BridgeSheet'
import { Sparkles } from 'lucide-react'

/** Tambah cepat dari mana saja: teks → ide mentah, link → referensi, atau tugas hari ini. */
export function QuickAdd({ open, onClose, initial = '' }: { open: boolean; onClose: () => void; initial?: string }) {
  const [text, setText] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (open) {
      setText(initial)
      window.setTimeout(() => ref.current?.focus(), 80)
    }
  }, [open, initial])

  const [bridgeText, setBridgeText] = useState<string>()
  const isBridge = useMemo(() => looksLikeBridgeResponse(text), [text])
  const url = useMemo(() => extractUrl(text), [text])
  const ideas = useMemo(() => splitBrainDump(text), [text])
  const onlyUrl = !!url && text.trim().replace(url, '').trim().length < 60

  const saveIdeas = async () => {
    if (!ideas.length) return
    await db.ideas.bulkAdd(ideas.map((title) => newIdea({ title })))
    toast(`${ideas.length} ide masuk Inbox`, { label: 'Rapikan', run: () => navigate('rapikan') })
    onClose()
  }
  const saveRef = async () => {
    if (!url) return
    const title = text.replace(url, '').trim().slice(0, 120)
    const r = newReference(url, { title })
    await db.references.add(r)
    toast(`Referensi ${PLATFORM_LABEL[r.platform]} disimpan`, { label: 'Bedah', run: () => navigate(`ref/${r.id}`) })
    onClose()
  }
  const saveTask = async () => {
    const t = text.trim().split(/\r?\n/)[0]
    if (!t) return
    await db.tasks.add({ id: uid(), title: t, due: toDateKey(), done: false, createdAt: now(), updatedAt: now() })
    toast('Tugas hari ini ditambah')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tangkap cepat">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={'Tulis apa pun yang lewat di kepala…\nSatu baris = satu ide. Atau tempel link referensi.'}
        className="field text-base"
      />
      <div className="mt-1.5 mb-3 font-mono text-[11px] text-ink-3">
        {url ? `Link ${PLATFORM_LABEL[detectPlatform(url)]} terdeteksi` : ideas.length > 1 ? `${ideas.length} ide terpisah` : ' '}
      </div>
      <div className="space-y-2">
        {isBridge && (
          <Button variant="primary" size="lg" block icon={<Sparkles size={20} />} onClick={() => setBridgeText(text)}>
            Terapkan jawaban Claude
          </Button>
        )}
        {url && !isBridge && (
          <Button variant={onlyUrl ? 'primary' : 'soft'} size="lg" block icon={<Link2 size={20} />} onClick={saveRef}>
            Simpan sebagai Referensi
          </Button>
        )}
        <Button variant={(url && onlyUrl) || isBridge ? 'soft' : 'primary'} size="lg" block icon={<ListPlus size={20} />} disabled={!ideas.length} onClick={saveIdeas}>
          {ideas.length > 1 ? `Simpan ${ideas.length} ide ke Inbox` : 'Simpan ke Inbox'}
        </Button>
        <Button variant="ghost" block icon={<CheckSquare size={19} />} disabled={!text.trim()} onClick={saveTask}>
          Jadikan tugas hari ini
        </Button>
      </div>
      {bridgeText && (
        <BridgeSheet
          input={null}
          initialResponse={bridgeText}
          onClose={() => {
            setBridgeText(undefined)
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}
