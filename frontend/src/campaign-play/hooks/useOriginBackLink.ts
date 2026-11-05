import { useActiveScene } from '@/scene-play/hooks/useActiveScene'

/**
 * The label of the Active Scene origin back link (specs/navigation/ux.md section 4, PBI-NAV-002 design record D6): the
 * Scene title from the deduplicated Active Scene query, or "the Active Scene" until the title is known or when no
 * Scene is Active. The page combines it with its literal router link and the pure `resolveBackLink` decision.
 */
export function useOriginBackLink(campaignId: string): string {
  const active = useActiveScene(campaignId)

  return active.data?.title ?? 'the Active Scene'
}
