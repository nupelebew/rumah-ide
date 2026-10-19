import { useEffect, useState } from 'react'
import { db } from '../db/db'

/** Muat video dari blob lalu tunggu metadata siap. */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.src = src
    v.onloadedmetadata = () => resolve(v)
    v.onerror = () => reject(new Error('Video tidak bisa dibaca'))
  })
}

export async function videoDuration(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob)
  try {
    const v = await loadVideo(url)
    return Number.isFinite(v.duration) ? v.duration : 0
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Ambil satu frame (JPEG) dari elemen video yang sedang tampil. */
export function frameFromElement(v: HTMLVideoElement, maxW = 540): Promise<Blob> {
  const scale = Math.min(1, maxW / (v.videoWidth || maxW))
  const c = document.createElement('canvas')
  c.width = Math.round((v.videoWidth || maxW) * scale)
  c.height = Math.round((v.videoHeight || maxW) * scale)
  c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal ambil frame'))), 'image/jpeg', 0.82))
}

/** Ambil frame pada detik tertentu dari blob video. */
export async function grabFrame(blob: Blob, sec: number): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    const v = await loadVideo(url)
    await new Promise<void>((resolve) => {
      v.onseeked = () => resolve()
      v.currentTime = Math.min(Math.max(sec, 0), Math.max((v.duration || 1) - 0.05, 0))
    })
    return await frameFromElement(v)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Object URL untuk media tersimpan; otomatis dilepas saat komponen hilang. */
export function useMediaUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!id) return setUrl(undefined)
    let u: string | undefined
    let alive = true
    db.media.get(id).then((m) => {
      if (!alive || !m) return
      u = URL.createObjectURL(m.blob)
      setUrl(u)
    })
    return () => {
      alive = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id])
  return url
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'tanpa-judul'
  )
}
