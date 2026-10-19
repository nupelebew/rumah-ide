import { forwardRef } from 'react'
import { Film } from 'lucide-react'
import { useMediaUrl } from '../lib/video'
import { PLATFORM_LABEL, type Platform } from '../lib/platform'
import { cx } from './ui'

export function Thumb({ id, platform, className, label }: { id?: string; platform?: Platform; className?: string; label?: string }) {
  const url = useMediaUrl(id)
  return (
    <div className={cx('relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper-2 text-ink-3', className)}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <Film size={20} />}
      {label && <span className="absolute top-1 left-1 rounded bg-ink/85 px-1 font-mono text-[10px] font-bold text-paper">{label}</span>}
      {!url && platform && <span className="absolute inset-x-0 bottom-1 truncate px-1 text-center font-mono text-[9px] uppercase">{PLATFORM_LABEL[platform]}</span>}
    </div>
  )
}

export const VideoPlayer = forwardRef<HTMLVideoElement, { id?: string; className?: string; onTime?: (t: number) => void }>(function VideoPlayer(
  { id, className, onTime },
  ref,
) {
  const url = useMediaUrl(id)
  if (!url) return <div className={cx('aspect-[9/16] max-h-[55dvh] animate-pulse rounded-xl bg-paper-2', className)} />
  return (
    <video
      ref={ref}
      src={url}
      controls
      playsInline
      preload="metadata"
      onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
      className={cx('mx-auto max-h-[55dvh] w-auto max-w-full rounded-xl bg-black', className)}
    />
  )
})

const PLATFORM_TONE: Partial<Record<Platform, string>> = {
  instagram: 'bg-[#f3d6e4] text-[#7a1f4b]',
  tiktok: 'bg-[#d4f0ef] text-[#0d5755]',
  youtube: 'bg-[#f6d5d2] text-[#8c1d14]',
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className={cx('inline-flex h-6 items-center rounded-md px-1.5 font-mono text-[10px] font-semibold uppercase', PLATFORM_TONE[platform] ?? 'bg-paper-2 text-ink-2')}>
      {PLATFORM_LABEL[platform]}
    </span>
  )
}
