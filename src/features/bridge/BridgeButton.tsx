import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../../components/ui'
import { useAiConfig } from '../../ai'
import { BridgeSheet } from './BridgeSheet'
import type { BridgeInput } from './types'

/** Tombol "Minta Claude …". Tersembunyi bila fitur Claude dimatikan di Pengaturan. */
export function BridgeButton({ input, label, variant = 'soft', block }: { input: BridgeInput; label: string; variant?: 'soft' | 'ghost' | 'primary'; block?: boolean }) {
  const ai = useAiConfig()
  const [open, setOpen] = useState(false)
  if (!ai?.enabled) return null
  return (
    <>
      <Button variant={variant} block={block} icon={<Sparkles size={17} className={variant === 'primary' ? '' : 'text-accent'} />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <BridgeSheet input={input} onClose={() => setOpen(false)} />}
    </>
  )
}
