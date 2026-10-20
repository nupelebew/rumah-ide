import { describe, expect, it } from 'vitest'
import { DEFAULT_MASTER, autoStatus, projectRow, uploadedStatus } from './planner'
import type { Idea } from '../../db/types'

const base: Idea = { id: 'p1', kind: 'content', title: 'Reel tenis', body: '', tags: [], createdAt: 0, updatedAt: 0 }
const OLD_STATUS = ['Proses Writing', 'Proses Design', 'Proses Revisi', 'Siap Upload', 'Selesai di Upload', 'On Hold', 'Reschedule', 'Revisi Script / Caption']

describe('autoStatus', () => {
  it('planner baru: satu status per langkah proyek', () => {
    const s = DEFAULT_MASTER.status
    expect(['ide', 'dikembangkan', 'siap', 'syuting', 'edit', 'selesai'].map((st) => autoStatus(st as Idea['stage'], s))).toEqual(['Konsep', 'Referensi', 'Video Contoh', 'Syuting', 'Editing', 'Siap Upload'])
    expect(uploadedStatus(s)).toBe('Sudah Upload')
  })
  it('planner lama tetap cocok lewat nama', () => {
    expect(autoStatus('ide', OLD_STATUS)).toBe('Proses Writing')
    expect(autoStatus('syuting', OLD_STATUS)).toBe('Proses Design')
    expect(autoStatus('edit', OLD_STATUS)).toBe('Proses Revisi')
    expect(autoStatus('selesai', OLD_STATUS)).toBe('Siap Upload')
    expect(uploadedStatus(OLD_STATUS)).toBe('Selesai di Upload')
  })
  it('nama asing: pakai urutan di Master', () => {
    expect(autoStatus('edit', ['A', 'B', 'C', 'D', 'E', 'F'])).toBe('E')
  })
})

describe('projectRow', () => {
  it('mengisi kolom dari proyek; pillar & jenis ditebak; klien ikut', () => {
    const r = projectRow({ ...base, stage: 'syuting', goal: 'edukasi', platforms: ['tiktok'], hook: 'Bola memantul', concept: 'Energi sore', client: 'Klub Tenis 75', planner: { akun: 'Akun 2', uploadDate: '2026-10-26' } })
    expect(r).toMatchObject({ id: 'p1', akun: 'Akun 2', status: 'Syuting', pillar: 'Education', jenis: 'TikTok Video', tglUpload: '2026-10-26', judul: 'Reel tenis', klien: 'Klub Tenis 75' })
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
