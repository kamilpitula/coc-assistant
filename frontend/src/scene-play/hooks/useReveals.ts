import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys, getInvestigatorClues, getMyClues } from '@/scene-play/services/cluesApi'
import { getRevealFile, revealQueryKeys, revealToInvestigators } from '@/scene-play/services/revealApi'
import { newRevealAnnouncement } from '@/scene-play/services/revealPresentation'
import type { PlayerReveal, RevealInput } from '@/scene-play/types/Reveal'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** Reveals a subject of the Active Scene; the confirmed Keeper view replaces the cached Active Scene. */
export function useRevealToInvestigators(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RevealInput) => revealToInvestigators(await getAccessToken(), campaignId, input),
    onSuccess: (scene) => {
      queryClient.setQueryData(activeSceneQueryKeys.detail(campaignId), scene)
      void queryClient.invalidateQueries({ queryKey: cluesQueryKeys.investigators(campaignId) })
    },
  })
}

/**
 * A Reveal's stored file as a Blob. A snapshot never changes, so it is never stale and is fetched once (PBI-SPL-002 D8). Enabled
 * only when the content is on screen, so a closed Clue loads nothing.
 */
export function useRevealFile(campaignId: string, revealId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: revealQueryKeys.file(campaignId, revealId),
    queryFn: async () => getRevealFile(await getAccessToken(), campaignId, revealId),
    staleTime: Infinity,
    enabled,
  })
}

/** The calling Player's own Clues; resolves to null when the API answers 404 (no Approved Investigator). */
export function useMyClues(campaignId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: cluesQueryKeys.mine(campaignId),
    queryFn: async () => getMyClues(await getAccessToken(), campaignId),
    enabled,
  })
}

/** An Approved Investigator's Clues for the Keeper; resolves to null when the API answers 404. */
export function useInvestigatorClues(campaignId: string, investigatorId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: cluesQueryKeys.investigator(campaignId, investigatorId),
    queryFn: async () => getInvestigatorClues(await getAccessToken(), campaignId, investigatorId),
    enabled,
  })
}

/** The text for a polite live region; the sequence changes with every announcement, even for identical text. */
export interface RevealAnnouncement {
  message: string
  sequence: number
}

/**
 * Announces Reveals that arrive in a refetch after the first load (specs/scene-play/ux.md section 14). The first fetched list is the
 * baseline, so the first load, cached data, and a catch-up refetch with no new Reveal announce nothing. `reveals` is undefined until
 * a list is known.
 */
export function useRevealAnnouncement(reveals: PlayerReveal[] | undefined, investigatorName: string | null, isFetchedAfterMount: boolean): RevealAnnouncement {
  const [announcement, setAnnouncement] = useState<RevealAnnouncement>({ message: '', sequence: 0 })
  const known = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!isFetchedAfterMount || reveals === undefined) {
      return
    }

    const message = known.current === null ? null : newRevealAnnouncement(known.current, reveals, investigatorName)
    known.current = new Set([...(known.current ?? []), ...reveals.map((reveal) => reveal.revealId)])
    if (message) {
      setAnnouncement((current) => ({ message, sequence: current.sequence + 1 }))
    }
  }, [reveals, investigatorName, isFetchedAfterMount])

  return announcement
}
