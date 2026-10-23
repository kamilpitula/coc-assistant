import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ItemPicker, type ItemPickerHandle } from '@/scenario-preparation/components/item-picker/item-picker'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useItems } from '@/scenario-preparation/hooks/useItems'
import { useLinkItem } from '@/scenario-preparation/hooks/useItemLinks'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { ItemLinkNotFoundError, ItemLinkValidationError } from '@/scenario-preparation/services/itemLinkApi'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { Alert } from '@/shared/components/ui/alert'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'

const CHOOSE_AN_ITEM = 'Choose an Item.'
const FINISHED_MEANWHILE = "This Scene has been finished, so it can't be changed. Select Cancel to go back."
const LINK_FAILED = "We couldn't link the Item. Try again."

function noticeFor(error: unknown): string | null {
  if (!error || error instanceof ItemLinkValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? FINISHED_MEANWHILE : LINK_FAILED
}

interface LinkItemPageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

/**
 * "Link an Item" (specs/scenario-preparation/ux.md section 64.2). A Player or an unknown Scene gets the Scene not-found page and no
 * request is made; a Finished Scene gets the sentence that it can't be changed instead of the form. Linking an Item that is already
 * linked counts as success.
 */
export function LinkItemPage({ campaignId, scenarioId, sceneId }: LinkItemPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scene = useScene(campaignId, scenarioId, sceneId, isKeeper)
  const items = useItems(campaignId, isKeeper)
  const linking = useLinkItem(campaignId, scenarioId, sceneId)
  const refetchItems = items.refetch
  const refused = linking.error instanceof ItemLinkValidationError ? linking.error : null

  // A refused Item means the list the Keeper chose from is out of date.
  useEffect(() => {
    if (refused) {
      void refetchItems()
    }
  }, [refused, refetchItems])

  if (!isKeeper || scene.data === null || linking.error instanceof ItemLinkNotFoundError) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if (!scene.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const backToScene = (label: string) => (
    <Link
      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
      params={{ campaignId, scenarioId, sceneId }}
      className={buttonVariants({ variant: 'link', className: 'px-0' })}
    >
      {label}
    </Link>
  )

  if (scene.data.status === 'Finished') {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Link an Item</h1>
        <p className="text-sm text-muted-foreground">This Scene is finished and can&apos;t be changed.</p>
        {backToScene('Back to the Scene')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Link an Item</h1>
        <p className="text-sm break-words text-muted-foreground">Scene: {scene.data.title}</p>
      </div>
      <LinkItemForm
        campaignId={campaignId}
        scenarioId={scenarioId}
        sceneId={sceneId}
        linkedIds={scene.data.itemLinks.map((link) => link.item.id)}
        items={items}
        linking={linking}
        serverMessage={refused ? (refused.itemMessage ?? 'Choose an Item of this Campaign.') : undefined}
        cancel={backToScene('Cancel')}
      />
    </div>
  )
}

interface LinkItemFormProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  linkedIds: string[]
  items: ReturnType<typeof useItems>
  linking: ReturnType<typeof useLinkItem>
  /** The server's message when it refused the Item, shown at the picker. */
  serverMessage: string | undefined
  cancel: ReactNode
}

function LinkItemForm({ campaignId, scenarioId, sceneId, linkedIds, items, linking, serverMessage, cancel }: LinkItemFormProps) {
  const errorId = useId()
  const pickerRef = useRef<ItemPickerHandle>(null)
  const navigate = useNavigate()
  const [itemId, setItemId] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | undefined>(undefined)
  const notice = noticeFor(linking.error)
  useUnsavedChangesPrompt(itemId !== null)

  // A refusal from the server is explained at the picker, with focus on it.
  useEffect(() => {
    if (serverMessage) {
      pickerRef.current?.focus()
    }
  }, [serverMessage])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (itemId === null) {
      setClientError(CHOOSE_AN_ITEM)
      pickerRef.current?.focus()
      return
    }

    setClientError(undefined)
    linking.mutate(itemId, {
      onSuccess: (link) =>
        void navigate({
          to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
          params: { campaignId, scenarioId, sceneId },
          state: { statusMessage: `${link.item.name} linked.`, focusItemLinkId: link.id },
        }),
    })
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <ItemPicker
        ref={pickerRef}
        campaignId={campaignId}
        items={items.data}
        isPending={items.isPending}
        isError={items.isError}
        onRetry={() => void items.refetch()}
        linkedIds={linkedIds}
        value={itemId}
        onChange={(next) => {
          setItemId(next)
          setClientError(undefined)
        }}
        error={clientError ?? serverMessage}
        errorId={errorId}
      />
      {notice && (
        <Alert variant="destructive" role="alert">
          {notice}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={linking.isPending}>
          {linking.isPending ? 'Linking...' : 'Link'}
        </Button>
        {cancel}
      </div>
    </form>
  )
}
