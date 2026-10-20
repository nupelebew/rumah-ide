import { describe, expect, it } from 'vitest'
import { DEFAULT_MASTER, autoStatus, projectRow } from './planner'
import type { Idea } from '../../db/types'

const base: Idea = { id: 'p1', kind: 'content', title: 'Reel tenis', body: '', tags: [], createdAt: 0, updatedAt: 0 }

describe('autoStatus', () => {
  const s = DEFAULT_MASTER.status
  it('memetakan langkah ke status Master', () => {
    expect(autoStatus('ide', s)).toBe('Proses Writing')
    expect(autoStatus('dikembangkan', s)).toBe('Proses Design')
    expect(autoStatus('syuting', s)).toBe('Proses Design')
    expect(autoStatus('edit', s)).toBe('Proses Revisi')
    expect(autoStatus('selesai', s)).toBe('Siap Upload')
  })
  it('mengikuti urutan walau nama status diganti', () => {
    expect(autoStatus('edit', ['Tulis', 'Produksi', 'Cek', 'Siap'])).toBe('Cek')
  })
})

describe('projectRow', () => {
  it('mengisi kolom dari proyek, pillar & jenis ditebak dari tujuan & platform', () => {
    const r = projectRow({ ...base, stage: 'syuting', goal: 'edukasi', platforms: ['tiktok'], hook: 'Bola memantul', concept: 'Energi sore', planner: { akun: 'Akun 2', uploadDate: '2026-10-26' } })
    expect(r).toMatchObject({ id: 'p1', akun: 'Akun 2', status: 'Proses Design', pillar: 'Education', jenis: 'TikTok Video', tglUpload: '2026-10-26', judul: 'Reel tenis' })
    expect(r.catatan).toContain('Hook: Bola memantul')
  })
  it('status & pilihan manual menang atas tebakan', () => {
    const r = projectRow({ ...base, stage: 'ide', goal: 'jualan', planner: { status: 'On Hold', pillar: 'Katalog', jenis: 'Instagram Story' } })
    expect(r).toMatchObject({ status: 'On Hold', pillar: 'Katalog', jenis: 'Instagram Story' })
  })
  it('tebakan yang tidak ada di Master dikosongkan', () => {
    const r = projectRow({ ...base, goal: 'hiburan', platforms: ['youtube'] }, { ...DEFAULT_MASTER, pillar: ['Lain'], jenis: ['Lain'] })
    expect(r.pillar).toBe('')
    expect(r.jenis).toBe('')
  })
})
