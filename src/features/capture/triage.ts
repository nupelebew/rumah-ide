import { db } from '../../db/db'
import { patch } from '../../db/repo'
import { now } from '../../lib/id'
import type { ID, Idea } from '../../db/types'
import { toast } from '../../components/Toast'

export async function toContent(idea: Idea) {
  await patch(db.ideas, idea.id, {
    kind: 'content',
    stage: 'ide',
    platforms: idea.platforms ?? [],
    hook: idea.hook ?? '',
    concept: idea.concept ?? idea.body ?? '',
    shots: idea.shots ?? [],
    needs: idea.needs ?? { gear: '', location: '', talent: '' },
  })
}

export async function toDaily(idea: Idea, categoryId?: ID) {
  await patch(db.ideas, idea.id, { kind: 'daily', categoryId })
}

export async function park(idea: Idea) {
  await patch(db.ideas, idea.id, { kind: 'parked' })
}

/** Buang dengan opsi "Urungkan" lewat toast. */
export async function discard(idea: Idea) {
  await db.ideas.delete(idea.id)
  toast('Ide dibuang', {
    label: 'Urungkan',
    run: () => void db.ideas.put({ ...idea, updatedAt: now() }),
  })
}

export async function mergeIdeas(ideas: Idea[], title: string) {
  const [first, ...rest] = ideas
  const body = ideas.map((i) => `- ${i.title}${i.body ? `: ${i.body}` : ''}`).join('\n')
  const tags = [...new Set(ideas.flatMap((i) => i.tags))]
  await patch(db.ideas, first.id, { title, body, tags })
  await db.ideas.bulkDelete(rest.map((r) => r.id))
}
