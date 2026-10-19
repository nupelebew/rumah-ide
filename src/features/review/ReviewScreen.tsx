import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArrowRight, Check, Sun } from 'lucide-react'
import { Page } from '../../components/Layout'
import { Button, Chip, PageHeader, Section, Stat } from '../../components/ui'
import { toast } from '../../components/Toast'
import { db } from '../../db/db'
import { patch, togglePick } from '../../db/repo'
import { addDays, formatDate, toDateKey, weekStart } from '../../lib/dates'
import { navigate } from '../../lib/router'
import { STAGE_LABEL } from '../content/contentMeta'
import { weekSummary } from './summary'
import { BridgeButton } from '../bridge/BridgeButton'

export const QUESTIONS: { key: string; q: string; options: string[] }[] = [
  { key: 'rasa', q: 'Minggu ini terasa…', options: ['Produktif', 'Biasa saja', 'Berat', 'Berantakan'] },
  { key: 'hambatan', q: 'Yang paling menghambat?', options: ['Waktu', 'Energi', 'Bingung mulai', 'Alat / lokasi', 'Tidak ada'] },
  { key: 'bangga', q: 'Yang paling bikin puas?', options: ['Konten jadi', 'Syuting lancar', 'Kuliah beres', 'Kebiasaan jalan', 'Istirahat cukup'] },
  { key: 'fokus', q: 'Fokus minggu depan?', options: ['Bikin konten', 'Kuliah / skripsi', 'Freelance', 'Kesehatan', 'Istirahat'] },
]

export default function ReviewScreen() {
  const week = weekStart(toDateKey())
  const data = useLiveQuery(() => weekSummary(week), [week])
  const review = useLiveQuery(() => db.reviews.get(week), [week])
  const history = useLiveQuery(() => db.reviews.orderBy('week').reverse().limit(8).toArray(), []) ?? []
  const answers = review?.answers ?? {}

  const answer = async (key: string, value: string) => {
    const next = { ...answers, [key]: answers[key] === value ? '' : value }
    await db.reviews.put({ week, answers: next, createdAt: review?.createdAt ?? Date.now() })
  }

  return (
    <Page>
      <PageHeader kicker={`${formatDate(week, false)} – ${formatDate(addDays(week, 6), false)}`} title="Review Mingguan" backTo="hari-ini" />
      {data && (
        <>
          <div className="grid grid-cols-3 gap-2 px-4">
            <Stat value={data.newIdeas.length} label="ide baru" />
            <Stat value={data.finished.length + data.tasksDone.length} label="selesai" />
            <Stat value={data.stuck.length} label="mandek" />
            <Stat value={data.newRefs.length} label="referensi" />
            <Stat value={data.shoots.length} label="syuting" />
            <Stat value={data.habitCount ? `${data.habitDays}` : '–'} label="centang kebiasaan" />
          </div>

          {data.stuck.length > 0 && (
            <Section title="Mandek > 7 hari">
              <p className="-mt-1 mb-2 text-sm text-ink-2">Putuskan satu-satu, biar kepala lega.</p>
              <ul className="space-y-2">
                {data.stuck.slice(0, 8).map((i) => (
                  <li key={i.id} className="sketch p-3">
                    <button type="button" onClick={() => navigate(`konten/${i.id}`)} className="block w-full text-left">
                      <div className="kicker">{STAGE_LABEL[i.stage ?? 'ide']}</div>
                      <div className="font-semibold">{i.title}</div>
                    </button>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        icon={<Sun size={15} />}
                        onClick={async () => {
                          const r = await togglePick('idea', i.id)
                          toast(r === 'full' ? 'Hari Ini sudah penuh' : 'Masuk Hari Ini')
                        }}
                      >
                        Lanjut
                      </Button>
                      <Button size="sm" icon={<Archive size={15} />} onClick={() => patch(db.ideas, i.id, { kind: 'parked' })}>
                        Simpan
                      </Button>
                      <Button size="sm" icon={<Check size={15} />} onClick={() => patch(db.ideas, i.id, { stage: 'selesai' })}>
                        Selesai
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.finished.length + data.tasksDone.length > 0 && (
            <Section title="Yang beres">
              <ul className="space-y-1 text-sm">
                {data.finished.map((i) => (
                  <li key={i.id} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-ok" /> {i.title}
                  </li>
                ))}
                {data.tasksDone.slice(0, 10).map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-ink-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-ok" /> {t.title}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      <Section title="Refleksi">
        <div className="space-y-5">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <div className="mb-2 font-semibold">{q.q}</div>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <Chip key={o} active={answers[q.key] === o} onClick={() => answer(q.key, o)}>
                    {o}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
          {answers.ringkasan && (
            <div className="sketch p-3 text-sm whitespace-pre-wrap">
              <div className="kicker mb-1">Ringkasan dari Claude</div>
              {answers.ringkasan}
            </div>
          )}
          <BridgeButton input={{ task: 'review', week }} label="Minta Claude rangkum minggu ini" block />
        </div>
      </Section>

      {history.filter((h) => h.week !== week).length > 0 && (
        <Section title="Minggu sebelumnya">
          <ul className="space-y-2">
            {history
              .filter((h) => h.week !== week)
              .map((h) => (
                <li key={h.week} className="sketch p-3 text-sm">
                  <div className="kicker mb-1">{formatDate(h.week, false)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(h.answers)
                      .filter(([k, v]) => k !== 'ringkasan' && v)
                      .map(([, v]) => v)
                      .map((a) => (
                        <Chip key={a}>{a}</Chip>
                      ))}
                  </div>
                </li>
              ))}
          </ul>
        </Section>
      )}
      <div className="px-4 pt-2">
        <Button variant="ghost" block icon={<ArrowRight size={18} />} onClick={() => navigate('hari-ini')}>
          Ke Hari Ini
        </Button>
      </div>
    </Page>
  )
}
