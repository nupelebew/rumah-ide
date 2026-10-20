import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { ANGLES, MOVES, SIZES, type AngleKey, type MoveKey, type ParsedShot } from './shotGuide'

/*
 * Animasi SVG (SMIL) — dua panel:
 * 1. "Di layar": frame 9:16 berisi subjek + latar. Ukuran shot menentukan seberapa besar subjek;
 *    gerakan kamera dianimasikan dengan paralaks yang benar (dolly ≠ zoom, truck: latar lebih lambat, dst).
 * 2. "Posisi kamera": tampak samping (tinggi & arah kamera = sudut) dan tampak atas (jalur gerak kamera).
 */

const DUR = '3.2s'

/** Tampak atas: bagian lebar frame yang diisi bahu subjek, per ukuran shot. */
const TOP_FRAC: Record<ParsedShot['size'], number> = { ecu: 2.6, cu: 1.3, mcu: 1, ms: 0.8, cowboy: 0.62, fs: 0.48, ws: 0.26, ews: 0.09 }
const W = 90
const H = 160

/** values a;b;a supaya bolak-balik mulus. */
const loop3 = (a: string, b: string) => `${a};${b};${a}`

interface LayerAnim {
  translate?: [string, string]
  scale?: [number, number]
  /** urutan translate bebas (diulang terus) */
  values?: string
  dur?: string
}

interface Motion {
  subject?: LayerAnim
  bg?: LayerAnim
  blur?: { subject?: [number, number]; bg?: [number, number] }
  whip?: boolean
  ramp?: boolean
  turn?: boolean
  walk?: boolean
}

/** Gerakan kamera → animasi isi frame. Arah latar berlawanan dengan arah kamera. */
function motionFor(m: MoveKey): Motion {
  switch (m) {
    case 'pan':
      return { subject: { translate: ['22 0', '-22 0'] }, bg: { translate: ['22 0', '-22 0'] } }
    case 'whip':
      return { subject: { translate: ['0 0', '-120 0'] }, bg: { translate: ['0 0', '-120 0'] }, whip: true }
    case 'tilt':
      return { subject: { translate: ['0 26', '0 -26'] }, bg: { translate: ['0 26', '0 -26'] } }
    case 'push':
      return { subject: { scale: [1, 1.7] }, bg: { scale: [1, 1.15] } }
    case 'pull':
      return { subject: { scale: [1.7, 1] }, bg: { scale: [1.15, 1] } }
    case 'zoom':
      return { subject: { scale: [1, 1.7] }, bg: { scale: [1, 1.7] } }
    case 'truck':
      return { subject: { translate: ['26 0', '-26 0'] }, bg: { translate: ['8 0', '-8 0'] } }
    case 'pedestal':
      return { subject: { translate: ['0 -20', '0 20'] }, bg: { translate: ['0 -6', '0 6'] } }
    case 'orbit':
      return { bg: { translate: ['40 0', '-40 0'] }, turn: true }
    case 'follow':
      return { bg: { values: '30 0;-30 0', dur: '1.6s' }, walk: true }
    case 'handheld':
      return { subject: { values: '0 0;1.2 -0.8;-0.8 0.6;0.6 1;-1 -0.4;0 0', dur: '1.1s' }, bg: { values: '0 0;1.2 -0.8;-0.8 0.6;0.6 1;-1 -0.4;0 0', dur: '1.1s' } }
    case 'ramp':
      return { ramp: true }
    case 'rack':
      return { blur: { subject: [2.5, 0], bg: [0, 2.5] } }
    default:
      return {}
  }
}

function Person({ top, turn, walk }: { top?: boolean; turn?: boolean; walk?: boolean }) {
  if (top)
    return (
      <g>
        <ellipse cx="0" cy="40" rx="30" ry="14" fill="#c9502f" />
        <circle cx="0" cy="40" r="11" fill="#3b2a22" />
      </g>
    )
  return (
    <g strokeLinecap="round">
      {/* kaki */}
      <g stroke="#2c3e57" strokeWidth="9">
        <line x1="-6" y1="100" x2="-8" y2="176">
          {walk && <animate attributeName="x2" values="-8;-16;-8;0;-8" dur="0.8s" repeatCount="indefinite" />}
        </line>
        <line x1="6" y1="100" x2="8" y2="176">
          {walk && <animate attributeName="x2" values="8;0;8;16;8" dur="0.8s" repeatCount="indefinite" />}
        </line>
      </g>
      {/* badan & lengan */}
      <path d="M-17 34 Q0 28 17 34 L14 102 L-14 102 Z" fill="#c9502f" />
      <g stroke="#e8b996" strokeWidth="6">
        <line x1="-16" y1="38" x2="-22" y2="86" />
        <line x1="16" y1="38" x2="23" y2="84" />
      </g>
      {/* leher, kepala, wajah */}
      <rect x="-4" y="22" width="8" height="10" fill="#e8b996" />
      <circle cx="0" cy="12" r="11" fill="#e8b996" />
      <path d="M-11 9 Q0 -4 11 9 Q6 1 0 1 Q-6 1 -11 9Z" fill="#3b2a22" />
      <g fill="#1d1b18">
        <circle cx="-4" cy="12" r="1.3">
          {turn && <animate attributeName="cx" values="-7;-1;-7" dur={DUR} repeatCount="indefinite" />}
        </circle>
        <circle cx="4" cy="12" r="1.3">
          {turn && <animate attributeName="cx" values="1;7;1" dur={DUR} repeatCount="indefinite" />}
        </circle>
      </g>
    </g>
  )
}

/** Latar: langit, horizon (tingginya mengikuti sudut kamera), pohon & tiang sebagai patokan paralaks. */
function Backdrop({ angle }: { angle: AngleKey }) {
  if (angle === 'top')
    return (
      <g>
        <rect x="-200" y="-200" width="490" height="560" fill="#9bbf7a" />
        {Array.from({ length: 13 }, (_, i) => (
          <line key={i} x1={-200 + i * 40} y1="-200" x2={-200 + i * 40} y2="360" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />
        ))}
      </g>
    )
  const horizon = angle === 'low' ? 128 : angle === 'worm' ? 150 : angle === 'high' ? 50 : 96
  const posts = [-150, -95, -40, 130, 185, 240]
  return (
    <g>
      <rect x="-200" y="-200" width="490" height={horizon + 200} fill="#cfe3f0" />
      <path d={`M-200 ${horizon} L-120 ${horizon - 18} L-60 ${horizon - 6} L10 ${horizon - 24} L90 ${horizon - 8} L170 ${horizon - 20} L290 ${horizon} Z`} fill="#a9c3d1" />
      <rect x="-200" y={horizon} width="490" height={400} fill="#b7d39a" />
      <line x1="-200" y1={horizon} x2="290" y2={horizon} stroke="#7a9a64" strokeWidth="1" />
      {posts.map((x) => (
        <g key={x}>
          <rect x={x} y={horizon - 46} width="5" height="46" fill="#6b4f3a" />
          <circle cx={x + 2.5} cy={horizon - 52} r="14" fill="#5f8f4e" />
        </g>
      ))}
    </g>
  )
}

/** Satu lapisan dengan translate & scale beranimasi (scale di sekitar tengah frame). */
function Layer({ anim, children, blur, id }: { anim?: LayerAnim; children: React.ReactNode; blur?: [number, number]; id: string }) {
  const scale = anim?.scale
  return (
    <g filter={blur ? `url(#${id})` : undefined}>
      {blur && (
        <defs>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={blur[0]}>
              <animate attributeName="stdDeviation" values={loop3(String(blur[0]), String(blur[1]))} dur={DUR} repeatCount="indefinite" />
            </feGaussianBlur>
          </filter>
        </defs>
      )}
      <g>
        {(anim?.translate || anim?.values) && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values={anim.values ?? loop3(anim.translate![0], anim.translate![1])}
            dur={anim.dur ?? DUR}
            repeatCount="indefinite"
          />
        )}
        <g transform={`translate(${W / 2} ${H / 2})`}>
          <g>{scale && <animateTransform attributeName="transform" type="scale" values={loop3(String(scale[0]), String(scale[1]))} dur={DUR} repeatCount="indefinite" />}<g transform={`translate(${-W / 2} ${-H / 2})`}>{children}</g></g>
        </g>
      </g>
    </g>
  )
}

export function ScreenView({ shot }: { shot: ParsedShot }) {
  const size = SIZES[shot.size]
  const moves = shot.moves.map(motionFor)
  // gabungkan: gerakan pertama dipakai untuk animasi layar (yang kedua ditunjukkan di diagram & teks)
  const mo = moves[0] ?? {}
  const top = shot.angle === 'top'
  // framing: rentang tinggi tubuh (top..bottom) mengisi tinggi frame
  const span = size.bottom - size.top
  const k = H / span
  // tampak atas: lebar bahu (60 unit) mengisi sebagian lebar frame sesuai ukuran shot
  const topFrac = TOP_FRAC[shot.size]
  const subjectTransform = top ? `translate(${W / 2} ${H / 2}) scale(${(W * topFrac) / 60}) translate(0 -40)` : `translate(${W / 2} 0) scale(${k}) translate(0 ${-size.top})`
  // latar diskalakan pelan mengikuti ukuran shot (shot dekat = latar lebih besar & lebih "dekat")
  const bgScale = top ? Math.min(3, Math.max(0.3, topFrac * 1.6)) : Math.min(2.2, Math.max(0.55, Math.sqrt(k / 0.8)))
  const groundY = top ? 0 : (180 - size.top) * k

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Contoh tampilan ${size.label}`}>
      <defs>
        <clipPath id="frame">
          <rect width={W} height={H} rx="4" />
        </clipPath>
        {mo.whip && (
          <filter id="whipblur" x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation="0 0">
              <animate attributeName="stdDeviation" values="0 0;0 0;6 0;0 0" keyTimes="0;0.35;0.6;1" dur={DUR} repeatCount="indefinite" />
            </feGaussianBlur>
          </filter>
        )}
      </defs>
      <g clipPath="url(#frame)">
        <g transform={shot.angle === 'dutch' ? `rotate(14 ${W / 2} ${H / 2})` : undefined} filter={mo.whip ? 'url(#whipblur)' : undefined}>
          <Layer anim={mo.bg} blur={mo.blur?.bg} id="bgblur">
            <g transform={top ? `translate(${W / 2} ${H / 2}) scale(${bgScale}) translate(${-W / 2} ${-H / 2})` : `translate(${W / 2} ${groundY}) scale(${bgScale}) translate(${-W / 2} -150)`}>
              <Backdrop angle={shot.angle} />
            </g>
          </Layer>
          <Layer anim={mo.subject} blur={mo.blur?.subject} id="sbjblur">
            <g transform={subjectTransform}>
              {mo.ramp ? (
                <g>
                  <animateTransform attributeName="transform" type="translate" values="-60 0;-10 0;10 0;60 0" keyTimes="0;0.3;0.7;1" dur={DUR} repeatCount="indefinite" />
                  <Person top={top} />
                </g>
              ) : (
                <Person top={top} turn={mo.turn} walk={mo.walk} />
              )}
            </g>
          </Layer>
        </g>
        {shot.angle === 'ots' && <path d={`M-10 ${H} Q10 ${H - 70} 34 ${H - 58} Q40 ${H - 30} 30 ${H} Z`} fill="#1d1b18" opacity="0.85" />}
        {shot.angle === 'pov' && (
          <g fill="#e8b996" opacity="0.95">
            <ellipse cx="18" cy={H + 4} rx="12" ry="26" transform={`rotate(20 18 ${H})`} />
            <ellipse cx="72" cy={H + 4} rx="12" ry="26" transform={`rotate(-20 72 ${H})`} />
          </g>
        )}
        {mo.ramp && (
          <g fontFamily="ui-monospace, monospace" fontSize="7" fontWeight="700">
            <rect x="4" y={H - 16} width="44" height="12" rx="3" fill="#1d1b18" opacity="0.8" />
            <text x="8" y={H - 7.5} fill="#fff">
              <animate attributeName="opacity" values="1;1;1" dur={DUR} repeatCount="indefinite" />
              <tspan>
                1×<animate attributeName="opacity" values="1;0;0;1" keyTimes="0;0.3;0.7;1" dur={DUR} repeatCount="indefinite" />
              </tspan>
            </text>
            <text x="20" y={H - 7.5} fill="#ffb199" opacity="0">
              0,25× slow
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.3;0.7;1" dur={DUR} repeatCount="indefinite" />
            </text>
          </g>
        )}
        {/* garis bantu sepertiga */}
        <g stroke="#fff" strokeOpacity="0.45" strokeWidth="0.5">
          <line x1={W / 3} y1="0" x2={W / 3} y2={H} />
          <line x1={(2 * W) / 3} y1="0" x2={(2 * W) / 3} y2={H} />
          <line x1="0" y1={H / 3} x2={W} y2={H / 3} />
          <line x1="0" y1={(2 * H) / 3} x2={W} y2={(2 * H) / 3} />
        </g>
      </g>
      <rect width={W} height={H} rx="4" fill="none" stroke="#1d1b18" strokeWidth="1.5" />
    </svg>
  )
}

function CameraIcon({ rot = 0 }: { rot?: number }) {
  return (
    <g transform={`rotate(${rot})`}>
      <rect x="-8" y="-5" width="12" height="10" rx="2" fill="#1d1b18" />
      <path d="M4 -3 L10 -6 L10 6 L4 3 Z" fill="#1d1b18" />
      <circle cx="-2" cy="0" r="2" fill="#d23e1f" />
    </g>
  )
}

/** Tampak samping: tinggi & arah kamera terhadap subjek (sudut). */
function SideView({ angle, moves }: { angle: AngleKey; moves: MoveKey[] }) {
  const ground = 92
  const sx = 72
  const pos: Record<AngleKey, [number, number, number]> = {
    eye: [22, ground - 40, 0],
    high: [24, ground - 72, 34],
    low: [22, ground - 10, -28],
    top: [sx, 12, 90],
    worm: [38, ground - 4, -60],
    dutch: [22, ground - 40, 0],
    ots: [16, ground - 40, 0],
    pov: [sx - 2, ground - 40, 0],
  }
  const [cx, cy, rot] = pos[angle]
  const ped = moves.includes('pedestal')
  const tilt = moves.includes('tilt')
  return (
    <g>
      <text x="4" y="10" fontSize="7" fill="#5a544b" fontWeight="700">
        SAMPING
      </text>
      <line x1="0" y1={ground} x2="100" y2={ground} stroke="#8a8275" strokeWidth="1" />
      {/* subjek */}
      <g transform={`translate(${sx} ${ground - 48}) scale(0.27)`}>
        <Person />
      </g>
      {angle === 'ots' && <circle cx="36" cy={ground - 40} r="5" fill="#8a8275" />}
      {/* garis pandang */}
      <g>
        {ped && <animateTransform attributeName="transform" type="translate" values={loop3('0 14', '0 -14')} dur={DUR} repeatCount="indefinite" />}
        <line x1={cx} y1={cy} x2={angle === 'top' ? sx : sx} y2={angle === 'top' ? ground - 30 : ground - 44} stroke="#d23e1f" strokeDasharray="2 2" strokeWidth="0.8" opacity={angle === 'pov' ? 0 : 1} />
        <g transform={`translate(${cx} ${cy})`}>
          <g>
            {tilt && <animateTransform attributeName="transform" type="rotate" values={loop3('-18', '18')} dur={DUR} repeatCount="indefinite" />}
            <CameraIcon rot={rot} />
          </g>
        </g>
      </g>
    </g>
  )
}

/** Tampak atas: jalur gerak kamera terhadap subjek. */
function TopView({ moves }: { moves: MoveKey[] }) {
  const sx = 50
  const sy = 40
  const camY = 80
  const m = moves[0]
  let camAnim: React.ReactNode = null
  let rotAnim: React.ReactNode = null
  let path: React.ReactNode = null
  let subjectAnim: React.ReactNode = null
  const cone = (w: number) => `M0 0 L${-w} -46 L${w} -46 Z`
  let coneAnim: React.ReactNode = null
  switch (m) {
    case 'push':
      camAnim = <animateTransform attributeName="transform" type="translate" values={loop3('0 0', '0 -20')} dur={DUR} repeatCount="indefinite" additive="sum" />
      path = <line x1={sx} y1={camY + 4} x2={sx} y2={camY - 24} stroke="#d23e1f" strokeDasharray="2 2" markerEnd="url(#arrow)" />
      break
    case 'pull':
      camAnim = <animateTransform attributeName="transform" type="translate" values={loop3('0 -16', '0 4')} dur={DUR} repeatCount="indefinite" additive="sum" />
      path = <line x1={sx} y1={camY - 16} x2={sx} y2={camY + 10} stroke="#d23e1f" strokeDasharray="2 2" markerEnd="url(#arrow)" />
      break
    case 'truck':
      camAnim = <animateTransform attributeName="transform" type="translate" values={loop3('-22 0', '22 0')} dur={DUR} repeatCount="indefinite" additive="sum" />
      path = <line x1={sx - 26} y1={camY + 9} x2={sx + 26} y2={camY + 9} stroke="#d23e1f" strokeDasharray="2 2" markerEnd="url(#arrow)" />
      break
    case 'orbit':
      rotAnim = <animateTransform attributeName="transform" type="rotate" values={`-60 ${sx} ${sy};60 ${sx} ${sy};-60 ${sx} ${sy}`} dur={DUR} repeatCount="indefinite" />
      path = <path d={`M${sx - 35} ${sy + 20} A40 40 0 0 0 ${sx + 35} ${sy + 20}`} fill="none" stroke="#d23e1f" strokeDasharray="2 2" markerEnd="url(#arrow)" />
      break
    case 'pan':
    case 'whip':
      coneAnim = <animateTransform attributeName="transform" type="rotate" values={m === 'whip' ? '-10;-10;70;70' : loop3('-30', '30')} keyTimes={m === 'whip' ? '0;0.35;0.6;1' : undefined} dur={DUR} repeatCount="indefinite" />
      break
    case 'zoom':
      coneAnim = <animate attributeName="d" values={`${cone(22)};${cone(8)};${cone(22)}`} dur={DUR} repeatCount="indefinite" />
      break
    case 'follow':
      subjectAnim = <animateTransform attributeName="transform" type="translate" values="-24 0;24 0" dur="1.6s" repeatCount="indefinite" />
      camAnim = <animateTransform attributeName="transform" type="translate" values="-24 0;24 0" dur="1.6s" repeatCount="indefinite" additive="sum" />
      break
    case 'handheld':
      camAnim = <animateTransform attributeName="transform" type="translate" values="0 0;1 -1;-1 1;1 1;0 0" dur="1.2s" repeatCount="indefinite" additive="sum" />
      break
  }
  return (
    <g>
      <defs>
        <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="#d23e1f" />
        </marker>
      </defs>
      <text x="4" y="10" fontSize="7" fill="#5a544b" fontWeight="700">
        ATAS
      </text>
      {path}
      <g>
        {subjectAnim}
        <ellipse cx={sx} cy={sy} rx="9" ry="5" fill="#c9502f" />
        <circle cx={sx} cy={sy} r="4" fill="#3b2a22" />
      </g>
      <g>
        {rotAnim}
        <g transform={`translate(${sx} ${camY})`}>
          {camAnim}
          <g>
            {m !== 'zoom' && coneAnim}
            <path d={cone(18)} fill="#d23e1f" opacity="0.12">
              {m === 'zoom' && coneAnim}
            </path>
          </g>
          <CameraIcon rot={-90} />
        </g>
      </g>
    </g>
  )
}

export function CameraDiagram({ shot }: { shot: ParsedShot }) {
  return (
    <svg viewBox="0 0 200 100" className="w-full" role="img" aria-label="Posisi dan gerak kamera">
      <rect x="0.5" y="0.5" width="99" height="99" rx="6" fill="#fbf8f2" stroke="#d8cfbf" />
      <rect x="100.5" y="0.5" width="99" height="99" rx="6" fill="#fbf8f2" stroke="#d8cfbf" />
      <SideView angle={shot.angle} moves={shot.moves} />
      <g transform="translate(100 0)">
        <TopView moves={shot.moves} />
      </g>
    </svg>
  )
}

/** Panel lengkap: layar + diagram + tombol jeda. */
export function ShotAnimation({ shot }: { shot: ParsedShot }) {
  const box = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const toggle = () => {
    box.current?.querySelectorAll('svg').forEach((s) => (paused ? s.unpauseAnimations() : s.pauseAnimations()))
    setPaused((p) => !p)
  }
  const sizeInfo = SIZES[shot.size]
  return (
    <div ref={box} className="space-y-2">
      <div className="flex gap-3">
        <div className="aspect-[9/16] w-[42%] shrink-0 overflow-hidden rounded-lg">
          <ScreenView shot={shot} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <div className="kicker">Di layar</div>
          <div className="font-display text-lg leading-tight font-bold">
            {sizeInfo.label}
            {sizeInfo.abbr && <span className="ml-1 font-mono text-xs text-ink-3">{sizeInfo.abbr}</span>}
          </div>
          <div className="text-xs text-ink-2">
            {ANGLES[shot.angle].label} · {shot.moves.map((m) => MOVES[m].label).join(' + ')}
          </div>
          {shot.fps && <div className="font-mono text-xs text-accent">{shot.fps} fps</div>}
          <button type="button" onClick={toggle} className="mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-paper-2 px-3 text-xs font-semibold">
            {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Putar' : 'Jeda'}
          </button>
        </div>
      </div>
      <div>
        <div className="kicker mb-1">Posisi & gerak kamera</div>
        <CameraDiagram shot={shot} />
      </div>
    </div>
  )
}
