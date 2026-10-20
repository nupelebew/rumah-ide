import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Check, ChevronDown, ClipboardCheck, Link2, MoreHorizontal, Play, Plus, RotateCcw, Sparkles, Sun, Trash2, Upload, Wand2, PartyPopper } from 'lucide-react'
import { Page } from '../../components/Layout'
import { AutoField, Button, Choice, IconButton, Label, ListEditor, MultiChoice, PageHeader, SampleBadge, Section, cx } from '../../components/ui'
import { Thumb, VideoPlayer } from '../../components/Media'
import { Confirm, Sheet } from '../../components/Sheet'
import { LinkPanel, LinkPicker } from '../../components/LinkPanel'
import { TagPicker } from '../../components/TagPicker'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { deleteMedia, ensureTags, link, patch, removeLinksOf, saveMedia, togglePick } from '../../db/repo'
import { storyboardTemplate } from '../../db/factories'
import type { Idea, Master, Reference, ShootSession } from '../../db/types'
import { navigate } from '../../lib/router'
import { relativeDay } from '../../lib/dates'
import { extractUrl } from '../../lib/platform'
import { pickFiles } from '../../lib/file'
import { GOALS, TARGET_PLATFORMS } from '../content/contentMeta'
import { Storyboard } from '../content/ContentDetail'
import { EditRecipe, ShootCreateSheet } from '../mix/MasterScreen'
import { HarvestButton, MergeStartSheet } from '../mix/ClaudeFlow'
import { BridgeButton } from '../bridge/BridgeButton'
import { addRefFromUrl, addRefsFromFiles } from '../atm/refOps'
import { STEPS, ensureMaster, goToStep, openManualMix, projectRefs, projectShoot, stepOf } from './projectOps'
import { PlannerCard } from '../sheet/PlannerCard'
import { HasilCard } from '../sheet/HasilCard'
import { masterOf, useSheetConfig } from '../sheet/sync'
import { uploadedStatus } from '../sheet/planner'

export default function ProjectScreen({ id }: { id: string }) {
  const idea = useLiveQuery(() => db.ideas.get(id), [id])
  const master = useLiveQuery(async () => {
    const i = await db.ideas.get(id)
    return i?.masterId ? await db.masters.get(i.masterId) : undefined
  }, [id])
  const refs = useLiveQuery(async () => {
    void (await db.links.count())
    return projectRefs(id)
  }, [id])
  const shoot = useLiveQuery(async () => {
    const i = await db.ideas.get(id)
    return i ? projectShoot(i) : undefined
  }, [id])
  const [view, setView] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  if (idea === undefined) return null
  if (!idea)
    return (
      <Page>
        <PageHeader title="Proyek tidak ditemukan" backTo="konten" />
      </Page>
    )
  const current = stepOf(idea.stage)
  const shown = Math.min(view ?? current, STEPS.length - 1)
  const finished = current >= STEPS.length
  const next = async () => {
    await goToStep(idea, shown + 1)
    setView(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Page>
      <PageHeader
        kicker={idea.client ? `Proyek · ${idea.client}` : 'Proyek'}
        title={idea.title}
        backTo="konten"
        actions={
          <IconButton label="Lainnya" onClick={() => setMenu(true)}>
            <MoreHorizontal size={22} />
          </IconButton>
        }
      >
        {idea.sample && <SampleBadge />}
      </PageHeader>

      {/* Penunjuk langkah */}
      <div className="px-4">
        <ol className="flex gap-1">
          {STEPS.map((s, i) => {
            const done = i < current
            const active = i === shown
            return (
              <li key={s.key} className="flex-1">
                <button type="button" onClick={() => setView(i)} className="flex w-full flex-col items-center gap-1 py-1" aria-current={active ? 'step' : undefined}>
                  <span
                    className={cx(
                      'flex size-8 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition',
                      active ? 'border-ink bg-ink text-paper' : done ? 'border-ok bg-ok text-paper' : i === current ? 'border-accent bg-card text-accent' : 'border-line bg-card text-ink-3',
                    )}
                  >
                    {done && !active ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cx('text-[11px] leading-tight font-semibold', active ? 'text-ink' : 'text-ink-3')}>{s.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
        {finished && <UploadedBanner idea={idea} />}
      </div>
      <PlannerCard idea={idea} />

      {shown === 0 && <StepKonsep idea={idea} />}
      {shown === 1 && <StepReferensi idea={idea} refs={refs ?? []} />}
      {shown === 2 && <StepContoh idea={idea} master={master} />}
      {shown === 3 && <StepSyuting idea={idea} master={master} shoot={shoot} />}
      {shown === 4 && <StepEdit idea={idea} master={master} />}

      <div className="px-4 pt-2">
        {shown < STEPS.length - 1 ? (
          <Button variant={shown === current ? 'ink' : 'soft'} size="lg" block icon={<ArrowRight size={20} />} onClick={next}>
            Lanjut: {STEPS[shown + 1].label}
          </Button>
        ) : (
          !finished && (
            <Button variant="primary" size="lg" block icon={<PartyPopper size={20} />} onClick={next}>
              Tandai proyek selesai
            </Button>
          )
        )}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Proyek">
        <div className="space-y-2">
          <Button
            block
            icon={<Sun size={18} />}
            onClick={async () => {
              const r = await togglePick('idea', idea.id)
              toast(r === 'full' ? 'Hari Ini sudah 3 hal.' : r === 'added' ? 'Masuk Hari Ini' : 'Dilepas dari Hari Ini')
              setMenu(false)
            }}
          >
            Jadikan prioritas Hari Ini
          </Button>
          {master && (
            <Button block onClick={() => navigate(`utama/${master.id}`)}>
              Buka Referensi Utama (detail segmen, Remotion)
            </Button>
          )}
          {finished && (
            <Button block icon={<RotateCcw size={18} />} onClick={() => (goToStep(idea, STEPS.length - 1), setMenu(false))}>
              Buka lagi proyek ini
            </Button>
          )}
          <Button variant="danger" block icon={<Trash2 size={18} />} onClick={() => (setMenu(false), setConfirmDel(true))}>
            Hapus proyek
          </Button>
        </div>
      </Sheet>
      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus proyek ini?"
        text="Referensi, video contoh, dan checklist tetap tersimpan."
        onConfirm={async () => {
          await removeLinksOf('idea', idea.id)
          await db.ideas.delete(idea.id)
          navigate('konten', { replace: true })
        }}
      />
    </Page>
  )
}

/** Bagian yang jarang dipakai disembunyikan di sini supaya layar tetap ringkas. */
function More({ label = 'Opsi lain', children }: { label?: string; children: ReactNode }) {
  return (
    <details className="group mt-3 rounded-xl border-[1.5px] border-dashed border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-ink-2">
        {label}
        <ChevronDown size={18} className="transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t-[1.5px] border-dashed border-line p-3">{children}</div>
    </details>
  )
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="mb-3">
      <div className="kicker">Langkah {n} dari 5</div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-ink-2">{hint}</p>
    </div>
  )
}

/* ---------- 1. Konsep ---------- */

function StepKonsep({ idea }: { idea: Idea }) {
  const set = (c: Partial<Idea>) => patch(db.ideas, idea.id, c)
  const needs = idea.needs ?? { gear: '', location: '', talent: '' }
  return (
    <Section>
      <StepTitle n={1} title="Konsep" hint="Ketuk pilihan, tulis seperlunya. Claude bisa menyusun storyboard-nya." />
      <div className="space-y-4">
        <div>
          <Label>Tujuan</Label>
          <Choice options={GOALS} value={idea.goal} onChange={(goal) => set({ goal })} allowNone />
        </div>
        <div>
          <Label>Platform</Label>
          <MultiChoice options={TARGET_PLATFORMS.slice(0, 3)} value={idea.platforms ?? []} onChange={(platforms) => set({ platforms })} />
        </div>
        <div>
          <Label>Durasi</Label>
          <Choice options={[15, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} dtk` }))} value={idea.durationTarget ? String(idea.durationTarget) : undefined} onChange={(d) => set({ durationTarget: d ? +d : undefined })} allowNone />
        </div>
        <div>
          <Label hint="3 detik pertama yang bikin berhenti scroll">Hook</Label>
          <AutoField value={idea.hook ?? ''} onSave={(hook) => set({ hook })} multiline rows={2} />
        </div>
        <div>
          <Label>Konsep / catatan brief</Label>
          <AutoField value={idea.concept ?? ''} onSave={(concept) => set({ concept })} multiline rows={4} placeholder="Tulis bebas: maunya klien, pesan utama, mood…" />
        </div>
      </div>

      {(idea.storyboard?.length ?? 0) > 0 ? (
        <div className="-mx-4 mt-2">
          <Storyboard idea={idea} />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <BridgeButton input={{ task: 'storyboard', ideaIds: [idea.id] }} label="Susun storyboard dengan Claude" variant="primary" block />
          <Button variant="ghost" block icon={<Wand2 size={18} />} onClick={() => set({ storyboard: storyboardTemplate(idea) })}>
            Pakai template kosong
          </Button>
        </div>
      )}

      <More label="Detail lain (klien, shot, kebutuhan, tag)">
        <div>
          <Label>Judul</Label>
          <AutoField value={idea.title} onSave={(title) => set({ title })} />
        </div>
        <div>
          <Label>Klien</Label>
          <AutoField value={idea.client ?? ''} onSave={(client) => set({ client })} placeholder="Kosongkan kalau proyek pribadi" />
        </div>
        <div>
          <Label>Daftar shot</Label>
          <ListEditor items={idea.shots ?? []} onChange={(shots) => set({ shots })} placeholder="mis. close-up tangan pegang raket" />
        </div>
        <div className="space-y-2">
          <Label>Kebutuhan</Label>
          <AutoField value={needs.gear} onSave={(gear) => set({ needs: { ...needs, gear } })} placeholder="Alat" />
          <AutoField value={needs.location} onSave={(location) => set({ needs: { ...needs, location } })} placeholder="Lokasi" />
          <AutoField value={needs.talent} onSave={(talent) => set({ needs: { ...needs, talent } })} placeholder="Talent / model" />
        </div>
        <div>
          <Label>Tag</Label>
          <TagPicker
            value={idea.tags}
            onChange={(tags) => {
              ensureTags(tags)
              set({ tags })
            }}
          />
        </div>
        <LinkPanel type="idea" id={idea.id} />
      </More>
    </Section>
  )
}

/* ---------- 2. Referensi ---------- */

function StepReferensi({ idea, refs }: { idea: Idea; refs: Reference[] }) {
  const [adding, setAdding] = useState(false)
  const [picking, setPicking] = useState(false)
  const [merge, setMerge] = useState(false)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const upload = async () => {
    const files = await pickFiles('video/*', true)
    if (!files.length) return
    setBusy(true)
    try {
      const rs = await addRefsFromFiles(files)
      for (const r of rs) await link('idea', idea.id, 'reference', r.id)
      toast(`${rs.length} video ditambahkan`)
      setAdding(false)
    } catch {
      toast('Gagal menyimpan video. Memori penuh?')
    } finally {
      setBusy(false)
    }
  }
  const addUrl = async () => {
    const u = extractUrl(url)
    if (!u) return toast('Itu bukan link')
    const r = await addRefFromUrl(u)
    await link('idea', idea.id, 'reference', r.id)
    setUrl('')
    setAdding(false)
  }
  const withVideo = refs.filter((r) => r.videoId).length

  return (
    <Section>
      <StepTitle n={2} title="Referensi" hint="Masukkan video yang jadi acuan. Lalu biarkan Claude menggabungkannya jadi satu video contoh." />
      <div className="grid grid-cols-4 gap-2">
        {refs.map((r, i) => (
          <button key={r.id} type="button" onClick={() => navigate(`ref/${r.id}`)} className="text-left">
            <Thumb id={r.thumbId} platform={r.platform} label={`R${i + 1}`} className="aspect-[3/4] w-full" />
            <div className="mt-0.5 truncate text-[11px]">{r.title || r.url || 'Video'}</div>
          </button>
        ))}
        <button type="button" onClick={() => setAdding(true)} className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-ink-3 text-xs font-semibold text-ink-2">
          <Plus size={22} /> Tambah
        </button>
      </div>
      {refs.length > 0 && withVideo < refs.length && <p className="mt-2 text-xs text-ink-3">{refs.length - withVideo} referensi belum ada videonya. Claude butuh file videonya, bukan link.</p>}

      <div className="mt-4">
        <Button variant="primary" size="lg" block icon={<Sparkles size={20} />} onClick={() => setMerge(true)} disabled={!refs.length}>
          Gabungkan di Claude
        </Button>
        <p className="mt-1.5 text-xs text-ink-3">Prompt disalin & Claude terbuka. Tempel, lampirkan video R1–R{refs.length || 'n'}, tunggu video contohnya jadi.</p>
      </div>

      <More>
        <Button
          block
          onClick={async () => {
            const mid = await openManualMix(idea, refs)
            navigate(`racik/${mid}`)
          }}
          disabled={!refs.length}
        >
          Racik manual (Papan Racik)
        </Button>
        <p className="text-xs text-ink-3">Susun sendiri potongan tiap referensi ke Hook/Isi/Penutup, tanpa Claude.</p>
      </More>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Tambah referensi">
        <div className="space-y-3">
          <Button variant="primary" size="lg" block icon={<Upload size={20} />} onClick={upload} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Pilih video dari galeri'}
          </Button>
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUrl()} placeholder="…atau tempel link" inputMode="url" className="field min-w-0 flex-1" />
            <Button onClick={addUrl} disabled={!url.trim()}>
              Simpan
            </Button>
          </div>
          <Button variant="ghost" block icon={<Link2 size={18} />} onClick={() => (setAdding(false), setPicking(true))}>
            Ambil dari Pustaka Referensi
          </Button>
        </div>
      </Sheet>
      <LinkPicker
        open={picking}
        onClose={() => setPicking(false)}
        types={['reference']}
        onPick={async (e) => {
          await link('idea', idea.id, 'reference', e.id)
          setPicking(false)
        }}
      />
      {merge && <MergeStartSheet open idea={idea} refCount={refs.length} onClose={() => setMerge(false)} onDone={() => goToStep(idea, 2)} />}
    </Section>
  )
}

/* ---------- 3. Video contoh ---------- */

function StepContoh({ idea, master }: { idea: Idea; master?: Master }) {
  const upload = async () => {
    const [f] = await pickFiles('video/*')
    if (!f) return
    const m = master ?? (await ensureMaster(idea))
    await deleteMedia(m.videoId)
    await patch(db.masters, m.id, { videoId: await saveMedia('video', f, f.name) })
    toast('Video contoh disimpan')
  }
  const segs = master?.segments.length ?? 0
  return (
    <Section>
      <StepTitle n={3} title="Video contoh" hint="Simpan video jadi dari Claude, lalu ambil daftar shot + checklist + resep edit sekali tempel." />
      <div className="space-y-3">
        <StepItem n={1} done={!!master?.videoId} title="Simpan video dari Claude">
          {master?.videoId ? (
            <>
              <VideoPlayer id={master.videoId} />
              <Button variant="ghost" size="sm" block className="mt-1" onClick={upload}>
                Ganti video
              </Button>
            </>
          ) : (
            <Button block icon={<Upload size={18} />} onClick={upload}>
              Pilih video
            </Button>
          )}
        </StepItem>
        <StepItem n={2} done={segs > 0} title="Ambil hasil dari Claude">
          <p className="mb-2 text-xs text-ink-3">Tempel di chat Claude yang SAMA dengan tempat video dibuat.</p>
          {master ? <HarvestButton master={master} variant={segs ? 'soft' : 'primary'} label={segs ? 'Ambil ulang dari Claude' : 'Ambil hasil dari Claude'} /> : <EnsureMasterButton idea={idea} />}
          {segs > 0 && (
            <button type="button" onClick={() => navigate(`utama/${master!.id}`)} className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl bg-paper-2 px-3 text-sm">
              <span>
                <b>{segs} segmen</b> · {master!.segments.reduce((a, s) => a + s.durationSec, 0).toFixed(0)} dtk
              </span>
              <span className="font-semibold">Lihat detail →</span>
            </button>
          )}
        </StepItem>
      </div>
    </Section>
  )
}

function EnsureMasterButton({ idea }: { idea: Idea }) {
  return (
    <Button variant="primary" size="lg" block icon={<Sparkles size={20} />} onClick={() => ensureMaster(idea)}>
      Siapkan
    </Button>
  )
}

function StepItem({ n, done, title, children }: { n: number; done: boolean; title: string; children: ReactNode }) {
  return (
    <div className={cx('sketch p-3', done && 'border-ok')}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cx('flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold', done ? 'bg-ok text-paper' : 'bg-paper-2 text-ink-2')}>{done ? '✓' : n}</span>
        <span className="font-semibold">{title}</span>
      </div>
      {children}
    </div>
  )
}

/* ---------- 4. Syuting ---------- */

function StepSyuting({ idea, master, shoot }: { idea: Idea; master?: Master; shoot?: ShootSession }) {
  const [creating, setCreating] = useState(false)
  if (shoot) {
    const done = shoot.shots.filter((x) => x.done).length
    const prep = shoot.prep.filter((x) => x.done).length
    return (
      <Section>
        <StepTitle n={4} title="Syuting" hint="Centang persiapan sebelum berangkat. Di lokasi, pakai Mode Lapangan." />
        <div className="sketch p-4">
          <div className="font-mono text-xs text-ink-3">
            {shoot.date ? relativeDay(shoot.date) : 'Tanpa tanggal'}
            {shoot.start ? ` · ${shoot.start}${shoot.end ? `–${shoot.end}` : ''}` : ''}
            {shoot.location ? ` · ${shoot.location}` : ''}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-paper-2 p-2">
              <div className="font-display text-2xl font-bold">
                {prep}/{shoot.prep.length}
              </div>
              <div className="text-xs text-ink-2">persiapan</div>
            </div>
            <div className="rounded-xl bg-paper-2 p-2">
              <div className="font-display text-2xl font-bold">
                {done}/{shoot.shots.length}
              </div>
              <div className="text-xs text-ink-2">shot</div>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Button variant="primary" size="lg" block icon={<Play size={20} />} onClick={() => navigate(`syuting/${shoot.id}?lapangan=1`)}>
            Mulai syuting (Mode Lapangan)
          </Button>
          <Button block icon={<ClipboardCheck size={18} />} onClick={() => navigate(`syuting/${shoot.id}`)}>
            Buka checklist & persiapan
          </Button>
        </div>
      </Section>
    )
  }
  return (
    <Section>
      <StepTitle n={4} title="Syuting" hint="Buat checklist dari video contoh. Biasanya sudah otomatis terbuat saat “Ambil hasil dari Claude”." />
      {master?.segments.length ? (
        <>
          <Button variant="primary" size="lg" block icon={<ClipboardCheck size={20} />} onClick={() => setCreating(true)}>
            Buat checklist syuting
          </Button>
          <ShootCreateSheet open={creating} master={master} onClose={() => setCreating(false)} />
        </>
      ) : (
        <div className="rounded-xl bg-warn-soft p-3 text-sm">
          Belum ada daftar shot. Selesaikan langkah 3 dulu (Ambil hasil dari Claude).
          <Button size="sm" className="mt-2" onClick={() => goToStep(idea, 2)}>
            Ke langkah 3
          </Button>
        </div>
      )}
    </Section>
  )
}

/* ---------- 5. Edit ---------- */

function StepEdit({ idea, master }: { idea: Idea; master?: Master }) {
  if (!master)
    return (
      <Section>
        <StepTitle n={5} title="Edit" hint="Resep edit CapCut muncul di sini setelah langkah 3." />
        <div className="mb-3">
          <HasilCard idea={idea} />
        </div>
        <Button onClick={() => goToStep(idea, 2)}>Ke langkah 3</Button>
      </Section>
    )
  return (
    <>
      <Section>
        <StepTitle n={5} title="Edit" hint="Ikuti langkah per segmen di CapCut, centang sambil jalan." />
        <div className="mb-4">
          <HasilCard idea={idea} />
        </div>
        {master.videoId && (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <Play size={16} /> Tonton video contoh
            </summary>
            <div className="pt-2">
              <VideoPlayer id={master.videoId} />
            </div>
          </details>
        )}
      </Section>
      <div className="-mt-4">
        <EditRecipe master={master} />
      </div>
    </>
  )
}

/** Setelah proyek selesai: satu ketuk untuk menandai sudah diposting (status "Selesai di Upload"). */
function UploadedBanner({ idea }: { idea: Idea }) {
  const cfg = useSheetConfig()
  const uploaded = uploadedStatus(masterOf(cfg).status)
  const done = idea.planner?.status === uploaded
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-ok-soft p-3 text-sm font-semibold">
      <PartyPopper size={18} className="shrink-0" />
      <span className="flex-1">{done ? 'Sudah diupload.' : 'Proyek selesai. Sudah diposting?'}</span>
      {!done && (
        <Button size="sm" variant="ink" onClick={() => patch(db.ideas, idea.id, { planner: { ...idea.planner, status: uploaded } })}>
          Sudah diupload
        </Button>
      )}
    </div>
  )
}
