import { db } from '../../db/db'
import { addDays, fromDateKey } from '../../lib/dates'

const STUCK_DAYS = 7

/** Data ringkasan satu minggu (Senin–Minggu) — dipakai layar ini dan prompt Claude. */
export async function weekSummary(week: string) {
  const start = fromDateKey(week).getTime()
  const end = fromDateKey(addDays(week, 7)).getTime()
  const stuckBefore = Date.now() - STUCK_DAYS * 86400000
  const [ideas, tasks, habits, shoots, refs] = await Promise.all([db.ideas.toArray(), db.tasks.toArray(), db.habits.toArray(), db.shoots.toArray(), db.references.toArray()])
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  return {
    newIdeas: ideas.filter((i) => i.createdAt >= start && i.createdAt < end),
    newRefs: refs.filter((r) => r.createdAt >= start && r.createdAt < end),
    stuck: ideas.filter((i) => i.kind === 'content' && i.stage !== 'selesai' && i.updatedAt < stuckBefore),
    finished: ideas.filter((i) => i.kind === 'content' && i.stage === 'selesai' && i.updatedAt >= start && i.updatedAt < end),
    tasksDone: tasks.filter((t) => t.done && (t.doneAt ?? 0) >= start && (t.doneAt ?? 0) < end),
    habitDays: habits.reduce((a, h) => a + h.checkins.filter((d) => days.includes(d)).length, 0),
    habitCount: habits.filter((h) => !h.archived).length,
    shoots: shoots.filter((s) => s.date && days.includes(s.date)),
  }
}
