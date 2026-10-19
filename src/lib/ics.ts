/** Baca & tulis file kalender .ics (dipakai untuk tukar jadwal syuting dengan Ritme / Google Calendar). */

export interface IcsEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  categories?: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM, kosong untuk acara seharian */
  start?: string
  end?: string
  allDay: boolean
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')
}

function escape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

function parseDt(v: string): { date: string; time?: string } {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/)
  if (!m) return { date: '' }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : undefined }
}

export function parseIcs(text: string): IcsEvent[] {
  // buka "line folding": baris lanjutan diawali spasi/tab
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const events: IcsEvent[] = []
  let cur: Record<string, string> | null = null
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {}
    else if (line === 'END:VEVENT' && cur) {
      const s = parseDt(cur.DTSTART ?? '')
      const e = parseDt(cur.DTEND ?? '')
      if (s.date) {
        events.push({
          uid: cur.UID ?? `${s.date}-${cur.SUMMARY ?? ''}`,
          summary: unescape(cur.SUMMARY ?? '(tanpa judul)'),
          description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION) : undefined,
          location: cur.LOCATION ? unescape(cur.LOCATION) : undefined,
          categories: cur.CATEGORIES ? unescape(cur.CATEGORIES) : undefined,
          date: s.date,
          start: s.time,
          end: e.time,
          allDay: !s.time,
        })
      }
      cur = null
    } else if (cur) {
      const i = line.indexOf(':')
      if (i < 0) continue
      const key = line.slice(0, i).split(';')[0].toUpperCase()
      cur[key] = line.slice(i + 1)
    }
  }
  return events
}

function dt(date: string, time?: string): string {
  const d = date.replace(/-/g, '')
  return time ? `${d}T${time.replace(':', '')}00` : d
}

export function buildIcs(events: IcsEvent[], calName = 'Rumah Ide'): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const out = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rumah Ide//Jadwal Syuting//ID',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escape(calName)}`,
  ]
  for (const ev of events) {
    out.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`)
    if (ev.allDay || !ev.start) {
      out.push(`DTSTART;VALUE=DATE:${dt(ev.date)}`)
    } else {
      out.push(`DTSTART:${dt(ev.date, ev.start)}`)
      if (ev.end) out.push(`DTEND:${dt(ev.date, ev.end)}`)
    }
    out.push(`SUMMARY:${escape(ev.summary)}`)
    if (ev.categories) out.push(`CATEGORIES:${escape(ev.categories)}`)
    if (ev.location) out.push(`LOCATION:${escape(ev.location)}`)
    if (ev.description) out.push(`DESCRIPTION:${escape(ev.description)}`)
    out.push('END:VEVENT')
  }
  out.push('END:VCALENDAR')
  return out.join('\r\n') + '\r\n'
}
