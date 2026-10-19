import { useEffect, useState } from 'react'
import { AlertTriangle, ClipboardPaste, Copy, ExternalLink, Send, Check, MessageSquareText } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button, CheckRow, cx } from '../../components/ui'
import { toast } from '../../components/Toast'
import { copyText } from '../../lib/file'
import { navigate } from '../../lib/router'
import { parseResponse, type ParseResult } from '../../ai/actions'
import { applyAction, describe, kindLabel, type Preview } from '../../ai/apply'
import { buildPrompt, TASK_LABEL } from '../../ai/prompts'
import { suggest, useAiConfig, AiError } from '../../ai'
import type { BridgeInput } from './types'

type Step = 'prompt' | 'paste' | 'preview'

/**
 * Jembatan Claude: (1) salin prompt → Claude, (2) tempel jawaban, (3) pratinjau & terapkan.
 * Dengan API key, langkah 1–2 bisa diganti tombol "Kirim langsung". Tidak ada data yang dikirim tanpa ketukan.
 */
export function BridgeSheet({ input, initialResponse, onClose }: { input: BridgeInput | null; initialResponse?: string; onClose: () => void }) {
  const ai = useAiConfig()
  const [step, setStep] = useState<Step>('prompt')
  const [prompt, setPrompt] = useState('')
  const [attach, setAttach] = useState<string>()
  const [response, setResponse] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [previews, setPreviews] = useState<Preview[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const open = !!input || !!initialResponse

  useEffect(() => {
    if (!open) return
    setError(undefined)
    setResult(null)
    if (initialResponse) {
      setResponse(initialResponse)
      void parse(initialResponse)
      return
    }
    setStep('prompt')
    setResponse('')
    if (input) buildPrompt(input).then((p) => (setPrompt(p.prompt), setAttach(p.attach)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, input, initialResponse])

  const parse = async (text: string) => {
    const r = parseResponse(text)
    setResult(r)
    const pv = await Promise.all(r.actions.map(describe))
    setPreviews(pv)
    setPicked(pv.map((p, i) => (p.warning || p.action.type === 'note' ? -1 : i)).filter((i) => i >= 0))
    setStep('preview')
  }
  const copy = async () => {
    if (await copyText(prompt)) {
      toast('Prompt disalin. Tempel di Claude.')
      setStep('paste')
    } else toast('Gagal menyalin. Tahan teks prompt lalu salin manual.')
  }
  const pasteClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText()
      setResponse(t)
      if (t.trim()) await parse(t)
    } catch {
      toast('Tidak bisa membaca clipboard. Tempel manual di kotak.')
    }
  }
  const sendDirect = async () => {
    setBusy(true)
    setError(undefined)
    try {
      const text = await suggest(prompt)
      setResponse(text)
      await parse(text)
    } catch (e) {
      setError(e instanceof AiError || e instanceof Error ? e.message : 'Gagal')
    } finally {
      setBusy(false)
    }
  }
  const apply = async () => {
    setBusy(true)
    let route: string | undefined
    let n = 0
    try {
      for (const i of picked) {
        const r = await applyAction(previews[i].action)
        route ??= r
        n++
      }
      toast(`${n} hal diterapkan`, route ? { label: 'Lihat', run: () => navigate(route!) } : undefined)
      onClose()
    } catch {
      toast('Sebagian gagal diterapkan')
    } finally {
      setBusy(false)
    }
  }
  const fixPrompt = () =>
    `Jawabanmu tadi tidak bisa dibaca aplikasi (${result?.errors.slice(0, 3).join('; ')}). Tolong ulangi HANYA blok \`\`\`rumah-ide berisi JSON valid {"rumah_ide":1,"aksi":[...]} sesuai format yang saya minta, tanpa komentar.`

  const notes = previews.filter((p) => p.action.type === 'note')
  const actionable = previews.map((p, i) => ({ p, i })).filter(({ p }) => p.action.type !== 'note')

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={input ? TASK_LABEL[input.task] : 'Jawaban Claude'}
      footer={
        step === 'preview' && actionable.length > 0 ? (
          <Button variant="primary" size="lg" block disabled={!picked.length || busy} onClick={apply} icon={<Check size={20} />}>
            Terapkan {picked.length} hal
          </Button>
        ) : undefined
      }
    >
      {input && (
        <ol className="mb-4 flex gap-1.5 font-mono text-[11px]">
          {(['prompt', 'paste', 'preview'] as Step[]).map((s, i) => (
            <li key={s} className={cx('flex-1 rounded-full py-1 text-center', step === s ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-3')}>
              {i + 1}. {s === 'prompt' ? 'Salin' : s === 'paste' ? 'Tempel' : 'Terapkan'}
            </li>
          ))}
        </ol>
      )}

      {step === 'prompt' && (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">Prompt ini berisi data yang kamu pilih. Salin, tempel di Claude (aplikasi atau claude.ai), lalu bawa jawabannya ke sini.</p>
          <textarea readOnly value={prompt} rows={8} className="field font-mono text-xs leading-relaxed" onFocus={(e) => e.currentTarget.select()} />
          {attach && (
            <div className="flex gap-2 rounded-xl bg-warn-soft p-3 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" />
              <span>{attach}</span>
            </div>
          )}
          <Button variant="primary" size="lg" block icon={<Copy size={20} />} onClick={copy} disabled={!prompt}>
            Salin prompt
          </Button>
          <a href="https://claude.ai/new" target="_blank" rel="noreferrer noopener" onClick={() => setStep('paste')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-line bg-card text-sm font-semibold">
            <ExternalLink size={18} /> Buka Claude
          </a>
          {ai?.apiKey && (
            <Button block icon={<Send size={18} />} onClick={sendDirect} disabled={busy || !prompt}>
              {busy ? 'Menunggu Claude…' : 'Kirim langsung (pakai API key)'}
            </Button>
          )}
          {error && <p className="rounded-xl bg-accent-soft p-3 text-sm">{error}</p>}
          <button type="button" onClick={() => setStep('paste')} className="min-h-11 w-full text-sm font-semibold text-ink-2 underline">
            Sudah punya jawaban → tempel
          </button>
        </div>
      )}

      {step === 'paste' && (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">Salin seluruh jawaban Claude (termasuk blok kodenya), lalu tempel di sini.</p>
          <Button variant="primary" size="lg" block icon={<ClipboardPaste size={20} />} onClick={pasteClipboard}>
            Tempel dari clipboard
          </Button>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={7} placeholder="…atau tempel manual di sini" className="field font-mono text-xs" />
          <Button block onClick={() => parse(response)} disabled={!response.trim()}>
            Baca jawaban
          </Button>
          {input && (
            <Button variant="ghost" block onClick={() => setStep('prompt')}>
              Kembali ke prompt
            </Button>
          )}
        </div>
      )}

      {step === 'preview' && result && (
        <div className="space-y-4">
          {result.prose && (
            <details className="rounded-xl bg-paper-2 p-3 text-sm" open={!actionable.length}>
              <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-semibold">
                <MessageSquareText size={17} /> Kata Claude
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-ink-2">{result.prose}</p>
            </details>
          )}
          {notes.map((n, i) => (
            <div key={i} className="sketch p-3 text-sm whitespace-pre-wrap">
              <div className="kicker mb-1">Catatan Claude</div>
              {n.detail}
            </div>
          ))}
          {actionable.length > 0 && (
            <div>
              <div className="kicker mb-1">Akan dibuat / diubah — centang yang mau dipakai</div>
              <div className="divide-y-[1.5px] divide-line">
                {actionable.map(({ p, i }) => (
                  <CheckRow strike={false}
                    key={i}
                    checked={picked.includes(i)}
                    onToggle={() => setPicked((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
                    sub={
                      <>
                        <span className="font-semibold text-accent">{kindLabel(p.action)}</span>
                        {p.detail && ` · ${p.detail}`}
                        {p.warning && <span className="block text-accent">⚠ {p.warning}</span>}
                      </>
                    }
                  >
                    {p.title}
                  </CheckRow>
                ))}
              </div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="rounded-xl bg-warn-soft p-3 text-sm">
              <div className="font-semibold">{actionable.length ? 'Sebagian dilewati' : 'Jawaban belum bisa dibaca'}</div>
              <ul className="mt-1 list-disc pl-5 text-ink-2">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              <Button size="sm" className="mt-2" icon={<Copy size={15} />} onClick={async () => (await copyText(fixPrompt())) && toast('Prompt perbaikan disalin')}>
                Salin prompt perbaikan
              </Button>
            </div>
          )}
          <Button variant="ghost" block onClick={() => setStep('paste')}>
            Tempel ulang
          </Button>
        </div>
      )}
    </Sheet>
  )
}
