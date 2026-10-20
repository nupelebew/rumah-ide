import { Film, Lightbulb } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Thumb } from '../../components/Media'
import { Button } from '../../components/ui'
import type { ShootShot } from '../../db/types'
import { ANGLES, MOVES, SIZES, fpsTip, parseShot } from './shotGuide'
import { ShotAnimation } from './ShotAnimation'

/** Lembar "Cara ambil": animasi framing & gerak kamera + langkah praktis + contoh dari referensi. */
export function ShotGuideSheet({ shot, onClose, onExample }: { shot: ShootShot; onClose: () => void; onExample?: () => void }) {
  const p = parseShot(shot)
  const size = SIZES[p.size]
  const angle = ANGLES[p.angle]
  const steps = [
    ...size.how,
    `Lensa umumnya ${size.lens} (setara full-frame).${shot.lens ? ` Di rencana: ${shot.lens}.` : ''}`,
    ...(p.angle !== 'eye' ? angle.how : []),
    ...p.moves.filter((m) => m !== 'static' || p.moves.length === 1).flatMap((m) => MOVES[m].how),
  ]
  const tip = fpsTip(p.fps)
  return (
    <Sheet open onClose={onClose} title={shot.label || 'Cara ambil'}>
      <div className="space-y-4">
        <ShotAnimation shot={p} />

        <div className="space-y-2 rounded-xl bg-paper-2 p-3 text-sm">
          <p>
            <b>{size.label}:</b> {size.desc}
          </p>
          {p.angle !== 'eye' && (
            <p>
              <b>{angle.label}:</b> {angle.desc}
            </p>
          )}
          {p.moves.map((m) => (
            <p key={m}>
              <b>{MOVES[m].label}:</b> {MOVES[m].desc}
            </p>
          ))}
          {p.sizeGuessed && <p className="text-xs text-ink-3">Jenis shot tidak ditulis, jadi ditampilkan sebagai medium shot. Isi “Jenis shot” supaya animasinya pas.</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb size={16} className="text-accent" /> Cara ambil
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            {tip && <li>{tip}</li>}
          </ol>
          {shot.description && <p className="mt-2 rounded-lg border-[1.5px] border-dashed border-line p-2 text-sm">Catatan shot: {shot.description}</p>}
        </div>

        {(onExample || shot.frameId) && (
          <div>
            <div className="kicker mb-1.5">Dari referensi</div>
            <div className="flex items-center gap-3">
              {shot.frameId && <Thumb id={shot.frameId} className="h-24 w-16" />}
              {onExample ? (
                <Button variant="ink" icon={<Film size={18} />} onClick={onExample}>
                  Putar potongan contoh
                </Button>
              ) : (
                <p className="text-xs text-ink-3">Frame contoh dari referensi.</p>
              )}
            </div>
          </div>
        )}
        <p className="text-[11px] text-ink-3">Batas framing & lensa adalah kebiasaan umum, bukan aturan mati. Sesuaikan dengan referensi dan alatmu.</p>
      </div>
    </Sheet>
  )
}
