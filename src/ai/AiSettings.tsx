import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Trash2, Zap } from 'lucide-react'
import { Button, Choice, Label, Section, CheckRow } from '../components/ui'
import { toast } from '../components/Toast'
import { PROVIDERS, setAiConfig, suggest, useAiConfig } from '.'

/** Pengaturan Claude: salin-tempel (tanpa key) selalu bisa; API key opsional & hanya disimpan di perangkat. */
export function AiSettings() {
  const ai = useAiConfig()
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  if (!ai) return null
  const provider = PROVIDERS[ai.provider]

  const saveKey = async () => {
    if (!key.trim()) return
    await setAiConfig({ apiKey: key.trim() })
    setKey('')
    toast('API key disimpan di perangkat ini')
  }
  const test = async () => {
    setTesting(true)
    try {
      await suggest('Balas hanya dengan kata: siap')
      toast('Tersambung ke Claude')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Section title="Claude (AI)">
      <div className="space-y-4">
        <CheckRow checked={ai.enabled} onToggle={() => setAiConfig({ enabled: !ai.enabled })} sub="Tombol “Minta Claude” di semua mode. Matikan kalau mau aplikasi tanpa AI sama sekali.">
          Tampilkan fitur Claude
        </CheckRow>
        {ai.enabled && (
          <>
            <div className="rounded-xl bg-paper-2 p-3 text-sm text-ink-2">
              <b className="text-ink">Tanpa API key:</b> pakai jalur salin-tempel. Aplikasi menyusun prompt → kamu tempel di Claude (gratis/langganan) → jawaban ditempel balik → aplikasi mengisi datanya.
              <br />
              <b className="text-ink">Dengan API key:</b> ada tombol “Kirim langsung”. Data hanya dikirim ke Anthropic saat kamu menekan tombol itu. Biaya API ditanggung akunmu.
            </div>
            <div>
              <Label hint="Disimpan hanya di HP ini dan tidak ikut di file ekspor.">
                <span className="flex items-center gap-1.5">
                  <KeyRound size={16} /> API key {provider?.label}
                </span>
              </Label>
              {ai.apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="field flex flex-1 items-center font-mono text-xs">
                    {show ? ai.apiKey : `${ai.apiKey.slice(0, 10)}••••••••${ai.apiKey.slice(-4)}`}
                  </code>
                  <Button aria-label={show ? 'Sembunyikan' : 'Tampilkan'} onClick={() => setShow((s) => !s)} className="w-12 px-0">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                  <Button variant="danger" aria-label="Hapus API key" onClick={() => setAiConfig({ apiKey: '' })} className="w-12 px-0">
                    <Trash2 size={18} />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" className="field min-w-0 flex-1 font-mono text-sm" />
                  <Button variant="primary" onClick={saveKey} disabled={!key.trim()}>
                    Simpan
                  </Button>
                </div>
              )}
            </div>
            {ai.apiKey && (
              <>
                <div>
                  <Label>Model</Label>
                  <Choice options={(provider?.models ?? []).map((m) => ({ value: m.id, label: m.label }))} value={ai.model} onChange={(model) => model && setAiConfig({ model })} />
                </div>
                <Button block icon={<Zap size={18} />} onClick={test} disabled={testing}>
                  {testing ? 'Mengetes…' : 'Tes koneksi'}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </Section>
  )
}
