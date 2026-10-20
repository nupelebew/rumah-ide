import { describe, expect, it } from 'vitest'
import { fpsTip, parseShot } from './shotGuide'

describe('parseShot', () => {
  it('membedakan extreme close-up, medium close-up, close-up', () => {
    expect(parseShot({ shotType: 'Extreme close-up' }).size).toBe('ecu')
    expect(parseShot({ shotType: 'Medium close-up' }).size).toBe('mcu')
    expect(parseShot({ shotType: 'Close-up' }).size).toBe('cu')
    expect(parseShot({ shotType: 'CU' }).size).toBe('cu')
  })
  it('wide, extreme wide, full, medium, cowboy', () => {
    expect(parseShot({ shotType: 'Wide' }).size).toBe('ws')
    expect(parseShot({ shotType: 'Extreme wide' }).size).toBe('ews')
    expect(parseShot({ shotType: 'Full shot' }).size).toBe('fs')
    expect(parseShot({ shotType: 'Medium' }).size).toBe('ms')
    expect(parseShot({ shotType: 'Cowboy shot' }).size).toBe('cowboy')
  })
  it('sudut & gerakan dari teks campuran Indonesia/Inggris', () => {
    const p = parseShot({ shotType: 'Medium', angle: 'Samping', movement: 'Speed ramp', fps: '120' })
    expect(p).toMatchObject({ size: 'ms', angle: 'eye', moves: ['ramp'], fps: 120 })
    expect(parseShot({ angle: 'Low angle', movement: 'Push in pelan' })).toMatchObject({ angle: 'low', moves: ['push'] })
    expect(parseShot({ movement: 'Gimbal follow' }).moves).toEqual(['follow'])
    expect(parseShot({ movement: 'Statis / tripod' }).moves).toEqual(['static'])
    expect(parseShot({ movement: 'Orbit' }).moves).toEqual(['orbit'])
    expect(parseShot({ movement: 'Whip pan' }).moves[0]).toBe('whip')
    expect(parseShot({ shotType: 'Top down' }).angle).toBe('top')
  })
  it('tanpa info: tebakan medium, statis; slow-mo di deskripsi → 120fps', () => {
    const p = parseShot({ label: 'Senyum ke kamera', description: 'slow-mo' })
    expect(p).toMatchObject({ size: 'ms', sizeGuessed: true, moves: ['static'], fps: 120 })
  })
})

describe('fpsTip', () => {
  it('aturan shutter 180°', () => {
    expect(fpsTip(120)).toContain('1/240')
    expect(fpsTip(120)).toContain('1/250')
    expect(fpsTip(60)).toContain('1/120')
    expect(fpsTip(24)).toContain('1/48')
    expect(fpsTip()).toBeNull()
  })
})
