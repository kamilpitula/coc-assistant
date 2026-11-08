import { useState } from 'react'

import { useAddWallEntry } from '@/campaign-play/hooks/useWallEntries'
import type { NewWallEntry } from '@/campaign-play/types/WallEntry'

/** The status text after a Wall Entry is stored (specs/campaign-wall/ux.md section 8). */
export const WALL_ENTRY_ADDED_MESSAGE = 'Wall Entry added.'

/** The Wall add flow the Wall page and the Active Scene share (PBI-SPL-007 D3): one place for pending, failed, and the success callback. */
export function useAddWallEntryForm(campaignId: string, onAdded: () => void) {
  const addEntry = useAddWallEntry(campaignId)
  const [failed, setFailed] = useState(false)

  const submit = async (entry: NewWallEntry) => {
    setFailed(false)
    try {
      await addEntry.mutateAsync(entry)
      onAdded()
      return true
    } catch {
      setFailed(true)
      return false
    }
  }

  return { pending: addEntry.isPending, failed, submit }
}
