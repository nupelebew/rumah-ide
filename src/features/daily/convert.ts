import { db } from '../../db/db'
import { link, patch } from '../../db/repo'
import { newDecision } from '../../db/factories'
import { now, uid } from '../../lib/id'
import type { ID, Idea } from '../../db/types'

/** Ubah Ide Keseharian jadi Tugas / Kebiasaan / Catatan Keputusan, lalu tautkan. */
export async function convertIdea(idea: Idea, type: 'task' | 'habit' | 'decision', due?: string): Promise<ID> {
  const t = now()
  const id = uid()
  if (type === 'task') {
    await db.tasks.add({ id, title: idea.title, due, done: false, categoryId: idea.categoryId, ideaId: idea.id, createdAt: t, updatedAt: t })
  } else if (type === 'habit') {
    await db.habits.add({ id, title: idea.title, categoryId: idea.categoryId, checkins: [], ideaId: idea.id, createdAt: t, updatedAt: t })
  } else {
    await db.decisions.add({ ...newDecision(idea.title, { categoryId: idea.categoryId, ideaId: idea.id }), id })
  }
  await patch(db.ideas, idea.id, { convertedTo: { type, id } })
  await link('idea', idea.id, type, id)
  return id
}
