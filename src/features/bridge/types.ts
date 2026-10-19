import type { ID } from '../../db/types'

/** Tugas yang bisa dikirim ke Claude (lewat salin-tempel atau API). */
export type BridgeTask =
  | 'free'
  | 'group'
  | 'develop'
  | 'breakdown'
  | 'atm-fill'
  | 'atm-mods'
  | 'storyboard'
  | 'mix-opinion'
  | 'master'
  | 'shoot'
  | 'edit'
  | 'review'

export interface BridgeInput {
  task: BridgeTask
  ideaIds?: ID[]
  refId?: ID
  mixId?: ID
  masterId?: ID
  shootId?: ID
  week?: string
}
