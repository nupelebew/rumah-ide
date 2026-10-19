import { describe, expect, it } from 'vitest'
import { detectPlatform, extractUrl, looksLikeUrl } from './platform'
import { splitBrainDump } from './braindump'
import { currentStreak, lastNDays, longestStreak } from './streak'
import { addDays, weekStart, formatTimecode } from './dates'
import { clusterByKeywords } from './cluster'
import { buildIcs, parseIcs } from './ics'

describe('detectPlatform', () => {
  it.each([
    ['https://www.instagram.com/reel/Cx123abc/', 'instagram'],
    ['https://instagr.am/p/abc', 'instagram'],
    ['https://www.tiktok.com/@user/video/7300000000000000000', 'tiktok'],
    ['https://vt.tiktok.com/ZSabc123/', 'tiktok'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
    ['https://m.youtube.com/shorts/abc', 'youtube'],
    ['https://fb.watch/abc/', 'facebook'],
    ['https://x.com/user/status/1', 'x'],
    ['https://pin.it/abc', 'pinterest'],
    ['https://id.pinterest.com/pin/1/', 'pinterest'],
    ['https://vimeo.com/123', 'vimeo'],
    ['https://www.threads.net/@user/post/abc', 'threads'],
    ['https://contoh.com/video', 'lainnya'],
    ['bukan link', 'lainnya'],
  ])('%s → %s', (url, expected) => {
    expect(detectPlatform(url)).toBe(expected)
  })

  it('menemukan link di dalam teks bagikan', () => {
    expect(detectPlatform('Lihat ini deh https://www.tiktok.com/@a/video/1 keren')).toBe('tiktok')
    expect(extractUrl('cek (https://youtu.be/abc).')).toBe('https://youtu.be/abc')
  })

  it('looksLikeUrl', () => {
    expect(looksLikeUrl('https://youtu.be/abc')).toBe(true)
    expect(looksLikeUrl('ide tentang https://a.com')).toBe(false)
  })
})

describe('splitBrainDump', () => {
  it('memisah per baris dan membuang penanda daftar', () => {
    expect(splitBrainDump('- ide satu\n* ide dua\n\n3. ide tiga\n• ide empat')).toEqual([
      'ide satu',
      'ide dua',
      'ide tiga',
      'ide empat',
    ])
  })
  it('memisah " - " di tengah baris', () => {
    expect(splitBrainDump('vlog kampus - review lensa - tips grading')).toEqual([
      'vlog kampus',
      'review lensa',
      'tips grading',
    ])
  })
  it('tidak memecah tanda hubung di dalam kata dan membuang duplikat', () => {
    expect(splitBrainDump('before-after kopi\nBefore-after kopi\n   ')).toEqual(['before-after kopi'])
  })
  it('teks kosong → array kosong', () => {
    expect(splitBrainDump('  \n \n')).toEqual([])
  })
})

describe('streak', () => {
  const today = '2026-10-19'
  it('menghitung hari berturut-turut sampai hari ini', () => {
    expect(currentStreak(['2026-10-17', '2026-10-18', '2026-10-19'], today)).toBe(3)
  })
  it('belum centang hari ini tidak memutus streak', () => {
    expect(currentStreak(['2026-10-17', '2026-10-18'], today)).toBe(2)
  })
  it('bolong satu hari memutus streak', () => {
    expect(currentStreak(['2026-10-15', '2026-10-16', '2026-10-18', '2026-10-19'], today)).toBe(2)
    expect(currentStreak(['2026-10-10'], today)).toBe(0)
  })
  it('melewati batas bulan & tahun', () => {
    expect(currentStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01')).toBe(3)
  })
  it('duplikat tidak dihitung dua kali, longest streak benar', () => {
    expect(currentStreak(['2026-10-19', '2026-10-19'], today)).toBe(1)
    expect(longestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'])).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
  it('lastNDays', () => {
    const d = lastNDays(['2026-10-19', '2026-10-17'], 3, today)
    expect(d).toEqual([
      { key: '2026-10-17', done: true },
      { key: '2026-10-18', done: false },
      { key: '2026-10-19', done: true },
    ])
  })
})

describe('dates', () => {
  it('addDays & weekStart (Senin)', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(weekStart('2026-10-19')).toBe('2026-10-19') // Senin
    expect(weekStart('2026-10-25')).toBe('2026-10-19') // Minggu
  })
  it('formatTimecode', () => {
    expect(formatTimecode(75.36)).toBe('01:15.3')
  })
})

describe('clusterByKeywords', () => {
  it('mengelompokkan ide yang berbagi kata kunci', () => {
    const items = ['review lensa 50mm', 'tips lensa murah', 'resep kopi susu', 'kopi pagi aesthetic', 'tidur cepat']
    const c = clusterByKeywords(items, (s) => s)
    expect(c).toHaveLength(2)
    expect(c.map((x) => x.label).sort()).toEqual(['kopi', 'lensa'])
  })
})

describe('ics', () => {
  it('membaca file dari Ritme termasuk escape dan acara seharian', () => {
    const src = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:a@ritme',
      'DTSTART:20261019T160000',
      'DTEND:20261019T180000',
      'SUMMARY:Take video tennis\\, sore',
      'CATEGORIES:Freelance',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:b',
      'DTSTART;VALUE=DATE:20270324',
      'SUMMARY:Ulang tahun',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const ev = parseIcs(src)
    expect(ev[0]).toMatchObject({ summary: 'Take video tennis, sore', date: '2026-10-19', start: '16:00', end: '18:00' })
    expect(ev[1]).toMatchObject({ allDay: true, date: '2027-03-24' })
  })
  it('bolak-balik build → parse', () => {
    const ics = buildIcs([
      { uid: 'x', summary: 'Syuting; tennis', date: '2026-10-19', start: '16:00', end: '18:00', allDay: false, description: 'baris 1\nbaris 2' },
    ])
    const [e] = parseIcs(ics)
    expect(e.summary).toBe('Syuting; tennis')
    expect(e.description).toBe('baris 1\nbaris 2')
    expect(e.start).toBe('16:00')
  })
})
