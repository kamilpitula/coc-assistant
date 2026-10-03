import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { InvestigatorNotFound } from '@/campaign-play/components/investigator-not-found/investigator-not-found'
import { useMyCharacterSheet } from '@/campaign-play/hooks/useMyInvestigator'
import { resumeStep, type WizardStep } from '@/campaign-play/services/wizardProgress'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import { Skeleton } from '@/shared/components/ui/skeleton'

function destination(sheet: MyCharacterSheet): WizardStep {
  const readOnly = sheet.status === 'Submitted' || sheet.status === 'Approved'
  return readOnly ? 'sheet' : resumeStep(sheet.characterSheet, sheet.validationErrors)
}

interface InvestigatorResumeProps {
  campaignId: string
}

/**
 * /campaigns/$campaignId/investigator: opens the first step that is not completed, or the read-only sheet once the
 * Investigator is Submitted or Approved (specs/character-sheet/ux.md sections 1 and 5.3).
 */
export function InvestigatorResume({ campaignId }: InvestigatorResumeProps) {
  const sheet = useMyCharacterSheet(campaignId)
  const navigate = useNavigate()
  const target = sheet.data ? destination(sheet.data) : null

  useEffect(() => {
    if (target) {
      void navigate({ to: '/campaigns/$campaignId/investigator/$step', params: { campaignId, step: target }, replace: true })
    }
  }, [campaignId, navigate, target])

  if (sheet.data === null) {
    return <InvestigatorNotFound campaignId={campaignId} />
  }

  if (sheet.isError) {
    return <p className="text-sm">We couldn&apos;t load your Investigator.</p>
  }

  return <Skeleton aria-busy="true" className="h-64 w-full max-w-2xl" />
}
