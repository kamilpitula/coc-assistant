import { WallEntryComposer } from '@/campaign-play/components/wall-entry-composer/wall-entry-composer'
import { WallPreview } from '@/campaign-play/components/wall-preview/wall-preview'
import { useAddWallEntryForm } from '@/campaign-play/hooks/useAddWallEntryForm'
import type { CampaignRole } from '@/campaign-play/types/Campaign'
import { Card } from '@/shared/components/ui/card'

interface ActiveSceneWallProps {
  campaignId: string
  viewerRole: CampaignRole
  /** A post was stored, so the page says "Wall Entry added.". */
  onWallEntryAdded: () => void
}

/**
 * The Wall on the Active Scene (specs/scene-play/ux.md section 21.8): the 5 latest Wall Entries the viewer may read with
 * the Wall page's compose form above them, live as on the Wall. No Remove and no older entries here; both stay on the Wall page.
 */
export function ActiveSceneWall({ campaignId, viewerRole, onWallEntryAdded }: ActiveSceneWallProps) {
  const add = useAddWallEntryForm(campaignId, onWallEntryAdded)

  return (
    <Card className="min-w-0 p-4">
      <WallPreview
        campaignId={campaignId}
        composer={<WallEntryComposer viewerRole={viewerRole} pending={add.pending} failed={add.failed} onSubmit={add.submit} rows={2} />}
      />
    </Card>
  )
}
