import { describe, expect, it } from 'vitest'
import { parseRange, parseTime, sampleTimes } from './timerange'

describe('parseTime', () => {
  it.each([
    ['3', 3],
    ['3.5', 3.5],
    ['3,5', 3.5],
    ['0:03', 3],
    ['1:02.5', 62.5],
  ])('%s → %s', (s, v) => expect(parseTime(s)).toBe(v))
  it('tidak valid → null', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('abc')).toBeNull()
  })
})

describe('parseRange', () => {
  it('berbagai cara menulis rentang', () => {
    expect(parseRange('1-3')).toEqual({ inSec: 1, outSec: 3 })
    expect(parseRange('1.5 - 3,2')).toEqual({ inSec: 1.5, outSec: 3.2 })
    expect(parseRange('0:01–0:03')).toEqual({ inSec: 1, outSec: 3 })
    expect(parseRange('detik 1 sampai 3')).toEqual({ inSec: 1, outSec: 3 })
  })
  it('selesai harus setelah mulai', () => {
    expect(parseRange('3-1')).toBeNull()
    expect(parseRange('2-2')).toBeNull()
    expect(parseRange('3')).toBeNull()
  })
})

describe('sampleTimes', () => {
  it('awal, tengah, akhir', () => {
    expect(sampleTimes(1, 3)).toEqual([1, 2, 2.95])
  })
})
