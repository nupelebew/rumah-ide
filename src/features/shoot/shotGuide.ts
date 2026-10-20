/**
 * Kamus shot untuk "Cara ambil": ukuran shot, sudut, gerakan kamera, dan setting fps.
 * Definisi mengikuti konvensi umum sinematografi (StudioBinder, MasterClass, Artlist, dll.).
 * Batas framing & lensa adalah kebiasaan umum, bukan aturan mati; lensa ditulis setara full-frame.
 */

export type SizeKey = 'ecu' | 'cu' | 'mcu' | 'ms' | 'cowboy' | 'fs' | 'ws' | 'ews'
export type AngleKey = 'eye' | 'high' | 'low' | 'top' | 'worm' | 'dutch' | 'ots' | 'pov'
export type MoveKey = 'static' | 'pan' | 'whip' | 'tilt' | 'push' | 'pull' | 'zoom' | 'truck' | 'pedestal' | 'orbit' | 'follow' | 'handheld' | 'ramp' | 'rack'

export interface Entry {
  label: string
  abbr?: string
  desc: string
  how: string[]
}

export const SIZES: Record<SizeKey, Entry & { lens: string; top: number; bottom: number }> = {
  ecu: { label: 'Extreme close-up', abbr: 'ECU', desc: 'Satu detail kecil memenuhi frame: mata, tangan menggenggam grip, bola, logo.', lens: '85–100mm / makro', top: 1, bottom: 25, how: ['Dekatkan kamera atau pakai lensa tele/makro', 'Fokus manual tepat di detail; sedikit gerakan saja sudah terasa besar'] },
  cu: { label: 'Close-up', abbr: 'CU', desc: 'Wajah atau objek memenuhi frame, kira-kira dari dada/bahu ke atas kepala.', lens: '50–85mm', top: -4, bottom: 42, how: ['Fokus di mata (subjek) atau bagian terpenting objek', 'Sisakan sedikit ruang di atas kepala; boleh terpotong sedikit di dahi'] },
  mcu: { label: 'Medium close-up', abbr: 'MCU', desc: 'Dari dada ke atas. Ekspresi jelas, gestur tangan mulai terlihat.', lens: '50mm', top: -6, bottom: 62, how: ['Potong frame di area dada, jangan tepat di sendi (leher/siku)'] },
  ms: { label: 'Medium shot', abbr: 'MS', desc: 'Dari pinggang ke atas. Seimbang antara ekspresi dan gerak tubuh.', lens: '35–50mm', top: -8, bottom: 96, how: ['Potong di pinggang; mata subjek kira-kira di sepertiga atas frame'] },
  cowboy: { label: 'Cowboy / medium long', abbr: 'MLS', desc: 'Dari pertengahan paha ke atas. Gerak tubuh dan tangan terlihat penuh.', lens: '35mm', top: -10, bottom: 125, how: ['Potong di pertengahan paha, bukan di lutut'] },
  fs: { label: 'Full shot', abbr: 'FS', desc: 'Seluruh badan dari kepala sampai kaki terlihat di dalam frame.', lens: '24–35mm', top: -14, bottom: 196, how: ['Sisakan sedikit ruang di atas kepala dan di bawah kaki'] },
  ws: { label: 'Wide shot', abbr: 'WS', desc: 'Subjek utuh plus lingkungan sekitarnya. Penonton tahu di mana adegan terjadi.', lens: '24–35mm', top: -60, bottom: 260, how: ['Perhatikan latar: rapikan benda yang mengganggu', 'Cocok sebagai pembuka (establishing)'] },
  ews: { label: 'Extreme wide', abbr: 'EWS', desc: 'Subjek tampak kecil dibanding lingkungan. Menunjukkan skala, lokasi, atau kesan sendiri.', lens: '14–24mm / drone', top: -300, bottom: 420, how: ['Ambil dari jauh atau dari tempat tinggi', 'Pakai tripod supaya horizon lurus'] },
}

export const ANGLES: Record<AngleKey, Entry> = {
  eye: { label: 'Eye level', desc: 'Kamera sejajar mata subjek. Terasa netral dan natural.', how: ['Lensa setinggi mata subjek, kamera lurus (tidak menunduk/mendongak)'] },
  high: { label: 'High angle', desc: 'Kamera di atas subjek, menghadap ke bawah. Subjek terasa lebih kecil.', how: ['Angkat kamera di atas kepala subjek lalu arahkan ke bawah'] },
  low: { label: 'Low angle', desc: 'Kamera di bawah subjek, menghadap ke atas. Subjek terasa besar dan kuat.', how: ['Turunkan kamera setinggi pinggang/lutut lalu arahkan ke atas', 'Pakai tripod pendek atau taruh di tanah'] },
  top: { label: 'Top down / bird’s eye', desc: 'Kamera tepat di atas, menghadap lurus ke bawah.', how: ['Kamera tegak lurus ke bawah (pakai lengan/overhead rig atau drone)'] },
  worm: { label: 'Worm’s eye', desc: 'Kamera di tanah, menghadap tajam ke atas. Kesan dramatis dan megah.', how: ['Letakkan kamera di tanah, layar dibalik atau pakai HP untuk monitor'] },
  dutch: { label: 'Dutch angle', desc: 'Kamera dimiringkan sehingga horizon miring. Kesan tegang atau dinamis.', how: ['Miringkan kamera 10–25°, konsisten sepanjang shot'] },
  ots: { label: 'Over the shoulder', desc: 'Diambil dari belakang bahu satu orang, melihat ke subjek/objek di depannya.', how: ['Bahu & sebagian kepala orang depan masuk di sisi frame, fokus ke yang dilihat'] },
  pov: { label: 'POV', desc: 'Sudut pandang orang pertama: penonton melihat dengan mata subjek.', how: ['Pegang kamera setinggi mata subjek, ikuti arah pandangnya', 'Tangan subjek boleh masuk frame untuk menegaskan POV'] },
}

export const MOVES: Record<MoveKey, Entry> = {
  static: { label: 'Statis', desc: 'Kamera diam di tripod. Gerakan datang dari subjek.', how: ['Kunci tripod, jangan sentuh kamera saat merekam'] },
  pan: { label: 'Pan', desc: 'Kamera tetap di tempat, berputar mendatar ke kiri/kanan.', how: ['Putar dari pinggang/kepala tripod, pelan dan rata', 'Mulai & akhiri dengan diam 1 detik supaya mudah dipotong'] },
  whip: { label: 'Whip pan', desc: 'Pan yang sangat cepat sampai gambar blur. Sering dipakai sebagai transisi.', how: ['Ayunkan kamera cepat ke satu arah; ambil versi masuk & keluar untuk disambung', 'Shutter jangan terlalu cepat supaya blurnya terasa'] },
  tilt: { label: 'Tilt', desc: 'Kamera tetap di tempat, menunduk atau mendongak.', how: ['Engsel di kepala tripod/pergelangan, gerak pelan'] },
  push: { label: 'Push in (dolly in)', desc: 'Seluruh kamera bergerak maju mendekati subjek. Latar berubah lebih lambat dari subjek (paralaks), terasa seperti masuk ke adegan.', how: ['Jalan maju pelan dengan gimbal/slider, jaga jarak fokus', 'Beda dengan zoom: kameranya yang berpindah'] },
  pull: { label: 'Pull out (dolly out)', desc: 'Seluruh kamera bergerak mundur menjauhi subjek, membuka lingkungan.', how: ['Jalan mundur pelan (minta teman memandu), gimbal mode follow'] },
  zoom: { label: 'Zoom', desc: 'Kamera diam, hanya lensa yang memperbesar. Subjek dan latar membesar bersama, tanpa paralaks.', how: ['Pakai lensa zoom, putar ring zoom pelan dan rata', 'Kalau ingin terasa "masuk ke adegan", pakai push in, bukan zoom'] },
  truck: { label: 'Truck / slide', desc: 'Kamera bergeser ke samping sejajar subjek. Objek dekat bergerak lebih cepat dari latar.', how: ['Pakai slider atau jalan menyamping dengan gimbal, langkah kecil'] },
  pedestal: { label: 'Pedestal / crane', desc: 'Seluruh kamera naik atau turun lurus, sudut tetap.', how: ['Naik-turunkan kamera dengan lutut (gimbal) atau tiang tripod'] },
  orbit: { label: 'Orbit / arc', desc: 'Kamera berputar mengelilingi subjek sambil tetap mengarah ke subjek. Latar bergeser di belakangnya.', how: ['Jaga jarak tetap, langkah menyamping memutar, gimbal mode lock/follow', 'Subjek di tengah frame sepanjang gerakan'] },
  follow: { label: 'Follow / tracking', desc: 'Kamera ikut bergerak bersama subjek, menjaga posisi subjek di frame.', how: ['Jalan sejajar/di belakang subjek dengan gimbal, kecepatan disamakan'] },
  handheld: { label: 'Handheld', desc: 'Kamera dipegang tangan; sedikit goyang yang disengaja, terasa hidup dan dekat.', how: ['Siku menempel badan, napas teratur; goyang kecil, bukan berantakan'] },
  ramp: { label: 'Speed ramp', desc: 'Kecepatan berubah dalam satu shot: cepat → lambat di momen puncak → cepat lagi.', how: ['Rekam di 60–120fps supaya bagian lambatnya halus', 'Atur kurva kecepatan di editor (CapCut: Kecepatan → Kurva)'] },
  rack: { label: 'Rack focus', desc: 'Fokus berpindah dari satu objek ke objek lain dalam satu shot.', how: ['Fokus manual, bukaan lebar (f/1.8–2.8) supaya perpindahannya terlihat', 'Tandai dua titik fokus di ring sebelum merekam'] },
}

const SIZE_WORDS: [RegExp, SizeKey][] = [
  [/extreme close|\becu\b|detail|makro|macro|super dekat/i, 'ecu'],
  [/medium close|\bmcu\b/i, 'mcu'],
  [/close[\s-]?up|\bcu\b|dekat/i, 'cu'],
  [/cowboy|medium long|\bmls\b|american/i, 'cowboy'],
  [/extreme wide|extreme long|\bews\b|\bels\b|establish|drone|aerial/i, 'ews'],
  [/full shot|full body|\bfs\b|seluruh badan|badan penuh/i, 'fs'],
  [/wide|long shot|\bws\b|\bls\b|lebar|jauh/i, 'ws'],
  [/medium|\bms\b|setengah badan|pinggang/i, 'ms'],
]

const ANGLE_WORDS: [RegExp, AngleKey][] = [
  [/top[\s-]?down|bird|overhead|dari atas/i, 'top'],
  [/worm|dari tanah/i, 'worm'],
  [/low[\s-]?angle|rendah|dari bawah/i, 'low'],
  [/high[\s-]?angle|tinggi/i, 'high'],
  [/dutch|miring|canted/i, 'dutch'],
  [/over the shoulder|\bots\b|bahu/i, 'ots'],
  [/\bpov\b|point of view|sudut pandang/i, 'pov'],
  [/eye[\s-]?level|sejajar|setinggi mata/i, 'eye'],
]

const MOVE_WORDS: [RegExp, MoveKey][] = [
  [/whip/i, 'whip'],
  [/speed[\s-]?ramp|\bramp/i, 'ramp'],
  [/rack|pindah fokus/i, 'rack'],
  [/push|dolly[\s-]?in|maju|mendekat/i, 'push'],
  [/pull|dolly[\s-]?out|mundur|menjauh/i, 'pull'],
  [/zoom/i, 'zoom'],
  [/orbit|\barc\b|memutar|mengelilingi|360/i, 'orbit'],
  [/truck|slide|slider|menyamping|geser/i, 'truck'],
  [/pedestal|crane|boom|naik|turun|jib/i, 'pedestal'],
  [/follow|tracking|ikut|mengikuti/i, 'follow'],
  [/handheld|tangan|goyang/i, 'handheld'],
  [/\bpan\b/i, 'pan'],
  [/tilt/i, 'tilt'],
  [/statis|static|tripod|diam|locked/i, 'static'],
]

export interface ParsedShot {
  size: SizeKey
  sizeGuessed: boolean
  angle: AngleKey
  moves: MoveKey[]
  fps?: number
}

/** Baca teks bebas (jenis shot, sudut, gerakan, deskripsi) menjadi kunci kamus. */
export function parseShot(s: { shotType?: string; angle?: string; movement?: string; fps?: string; description?: string; label?: string }): ParsedShot {
  const sizeText = `${s.shotType ?? ''} ${s.label ?? ''}`
  const all = `${s.shotType ?? ''} ${s.angle ?? ''} ${s.movement ?? ''} ${s.label ?? ''} ${s.description ?? ''}`
  const size = SIZE_WORDS.find(([re]) => re.test(sizeText))?.[1] ?? SIZE_WORDS.find(([re]) => re.test(all))?.[1]
  const angle = ANGLE_WORDS.find(([re]) => re.test(`${s.angle ?? ''} ${s.shotType ?? ''}`))?.[1] ?? ANGLE_WORDS.find(([re]) => re.test(all))?.[1] ?? 'eye'
  const moveText = `${s.movement ?? ''}`
  let moves = MOVE_WORDS.filter(([re]) => re.test(moveText)).map(([, k]) => k)
  if (!moves.length) moves = MOVE_WORDS.filter(([re]) => re.test(all)).map(([, k]) => k)
  // "pull" dan "push" bisa sama-sama cocok di kalimat panjang; pertahankan urutan, buang duplikat & statis bila ada gerakan lain
  moves = [...new Set(moves)]
  if (moves.length > 1) moves = moves.filter((m) => m !== 'static')
  const fpsMatch = `${s.fps ?? ''}`.match(/\d{2,3}/) ?? (/slow[\s-]?mo/i.test(all) ? ['120'] : null)
  return { size: size ?? 'ms', sizeGuessed: !size, angle, moves: moves.length ? moves.slice(0, 2) : ['static'], fps: fpsMatch ? +fpsMatch[0] : undefined }
}

/** Saran setting kamera dari fps (aturan shutter 180°: shutter ≈ 1/(2×fps)). */
export function fpsTip(fps?: number): string | null {
  if (!fps) return null
  const shutter = fps * 2
  const near = shutter >= 200 ? 250 : shutter >= 100 ? 125 : shutter >= 55 ? 60 : 50
  if (fps >= 100) return `${fps}fps = slow-mo ±${Math.round(fps / 25)}× saat diputar 24/25/30fps. Shutter ±1/${shutter} (di kamera biasanya 1/${near}). Siang hari pakai ND supaya tidak terlalu terang.`
  if (fps >= 50) return `${fps}fps = slow-mo ±2×. Shutter ±1/${shutter} (biasanya 1/${near}).`
  return `${fps}fps = kecepatan normal. Shutter ±1/${shutter} (biasanya 1/${near}) untuk motion blur natural.`
}
