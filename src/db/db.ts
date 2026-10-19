import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  Decision,
  Gear,
  Habit,
  Idea,
  Link,
  Master,
  Media,
  Mix,
  Pattern,
  PrepTemplate,
  Reference,
  Review,
  Setting,
  ShootSession,
  Tag,
  Task,
  TodayPick,
} from './types'

export class RumahIdeDB extends Dexie {
  ideas!: EntityTable<Idea, 'id'>
  references!: EntityTable<Reference, 'id'>
  patterns!: EntityTable<Pattern, 'id'>
  mixes!: EntityTable<Mix, 'id'>
  masters!: EntityTable<Master, 'id'>
  shoots!: EntityTable<ShootSession, 'id'>
  gear!: EntityTable<Gear, 'id'>
  prepTemplates!: EntityTable<PrepTemplate, 'id'>
  categories!: EntityTable<Category, 'id'>
  tasks!: EntityTable<Task, 'id'>
  habits!: EntityTable<Habit, 'id'>
  decisions!: EntityTable<Decision, 'id'>
  tags!: EntityTable<Tag, 'id'>
  links!: EntityTable<Link, 'id'>
  today!: EntityTable<TodayPick, 'date'>
  reviews!: EntityTable<Review, 'week'>
  media!: EntityTable<Media, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'rumah-ide') {
    super(name)
    // Versi skema. Kalau menambah field terindeks / tabel baru, tambahkan this.version(2)... di bawah
    // beserta .upgrade() bila data lama perlu diubah. Jangan ubah definisi versi lama.
    this.version(1).stores({
      ideas: 'id, kind, stage, categoryId, createdAt, updatedAt, *tags',
      references: 'id, platform, status, createdAt, *tags, *patternIds',
      patterns: 'id, name',
      mixes: 'id, status, createdAt',
      masters: 'id, mixId, ideaId, createdAt',
      shoots: 'id, date, masterId, ideaId, createdAt',
      gear: 'id, type',
      prepTemplates: 'id',
      categories: 'id, name',
      tasks: 'id, due, done, categoryId, createdAt',
      habits: 'id, categoryId, createdAt',
      decisions: 'id, categoryId, createdAt',
      tags: 'id, &name',
      links: 'id, [fromType+fromId], [toType+toId]',
      today: 'date',
      reviews: 'week',
      media: 'id, kind',
      settings: 'key',
    })
  }
}

export const db = new RumahIdeDB()

/** Tabel yang diekspor/diimpor sebagai JSON (media diekspor terpisah sebagai base64 bila diminta). */
export const DATA_TABLES = [
  'ideas',
  'references',
  'patterns',
  'mixes',
  'masters',
  'shoots',
  'gear',
  'prepTemplates',
  'categories',
  'tasks',
  'habits',
  'decisions',
  'tags',
  'links',
  'today',
  'reviews',
  'settings',
] as const

export type DataTable = (typeof DATA_TABLES)[number]
