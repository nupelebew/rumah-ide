import { describe, expect, it } from 'vitest'
import { looksLikeBridgeResponse, normalizeAction, parseResponse } from './actions'

describe('parseResponse', () => {
  it('mengambil blok rumah-ide walau ada teks diskusi di sekitarnya', () => {
    const text = `Oke, ini usulanku:\n\n\`\`\`rumah-ide\n{"rumah_ide":1,"aksi":[{"type":"task","title":"Beli ND filter","due":"2026-10-20"},{"type":"habit","title":"Latihan edit"}]}\n\`\`\`\n\nSemoga membantu!`
    const r = parseResponse(text)
    expect(r.errors).toEqual([])
    expect(r.actions).toHaveLength(2)
    expect(r.actions[0]).toMatchObject({ type: 'task', title: 'Beli ND filter', due: '2026-10-20' })
    expect(r.prose).toContain('Oke, ini usulanku')
  })

  it('toleran terhadap koma menggantung & kutip miring', () => {
    const text = '```json\n{“aksi”: [{"type": "note", "text": "hai",},],}\n```'
    const r = parseResponse(text)
    expect(r.actions).toEqual([{ type: 'note', text: 'hai' }])
  })

  it('melaporkan aksi tak dikenal tanpa membuang aksi valid', () => {
    const r = parseResponse('```rumah-ide\n{"aksi":[{"type":"hapus_semua"},{"type":"task","title":"A"}]}\n```')
    expect(r.actions).toHaveLength(1)
    expect(r.errors[0]).toContain('tidak dikenal')
  })

  it('jawaban tanpa blok / JSON rusak → error yang jelas', () => {
    expect(parseResponse('cuma teks biasa').errors[0]).toContain('Tidak menemukan')
    expect(parseResponse('```rumah-ide\n{"aksi":[{"type":"task"\n```').errors[0]).toContain('bukan JSON')
  })

  it('looksLikeBridgeResponse', () => {
    expect(looksLikeBridgeResponse('```rumah-ide\n{}```')).toBe(true)
    expect(looksLikeBridgeResponse('ide random biasa')).toBe(false)
  })
})

describe('normalizeAction', () => {
  it('membersihkan content_idea: goal & platform tak valid dibuang, durasi dibatasi', () => {
    const a = normalizeAction({
      type: 'content_idea',
      title: 'Reel tenis',
      goal: 'Branding',
      platforms: ['Instagram', 'myspace'],
      storyboard: [{ title: 'Hook', duration: '2,5' }, { duration: 9999 }],
      tags: ['#Olahraga'],
    })
    expect(a).toMatchObject({ goal: 'branding', platforms: ['instagram'], tags: ['olahraga'] })
    if (typeof a !== 'string' && a.type === 'content_idea') {
      expect(a.storyboard[0].duration).toBe(2.5)
      expect(a.storyboard[1].duration).toBe(600)
    }
  })
  it('task tanpa judul ditolak, tanggal tak valid diabaikan', () => {
    expect(typeof normalizeAction({ type: 'task' })).toBe('string')
    expect(normalizeAction({ type: 'task', title: 'X', due: 'besok' })).toEqual({ type: 'task', title: 'X', due: undefined, category: undefined, sourceIdeaId: undefined })
  })
  it('atm_fill hanya menerima kunci amati yang dikenal', () => {
    expect(normalizeAction({ type: 'atm_fill', refId: 'r1', amati: { hook: 'Close-up', hacker: 'x' } })).toEqual({ type: 'atm_fill', refId: 'r1', amati: { hook: 'Close-up' } })
  })
  it('shoot_checklist membawa jadwal; segmen membawa detik sumber', () => {
    const a = normalizeAction({ type: 'shoot_checklist', masterId: 'm', date: '2026-10-19', start: '16.00', end: '18:00', location: 'Lapangan', shots: [{ label: 'A' }] })
    expect(a).toMatchObject({ date: '2026-10-19', start: '16:00', end: '18:00', location: 'Lapangan' })
    const m = normalizeAction({ type: 'master', segments: [{ slot: 'Hook', sourceIn: '1,5', sourceOut: 3 }] })
    if (typeof m !== 'string' && m.type === 'master') expect(m.segments[0]).toMatchObject({ sourceIn: 1.5, sourceOut: 3 })
  })
})
