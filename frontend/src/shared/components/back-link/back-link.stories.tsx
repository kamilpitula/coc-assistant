import { ArrowLeft } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { useOriginBackLink } from '@/campaign-play/hooks/useOriginBackLink'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { BackLink } from './back-link'

function BackLinkStory({ from }: { from?: string }) {
  const originLabel = useOriginBackLink('story-campaign')

  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
      <BackLink
        from={from}
        fallback={{
          label: 'Lucy Ward',
          to: '/campaigns/$campaignId/investigators/$investigatorId',
          params: { campaignId: 'story-campaign', investigatorId: 'story-investigator' },
        }}
        originTargets={{
          'active-scene': { label: originLabel, to: '/campaigns/$campaignId/active-scene', params: { campaignId: 'story-campaign' } },
        }}
        render={(target) => (
          <a href={target.to} className="inline-flex items-center gap-1 self-start px-0 text-sm font-medium underline underline-offset-4">
            <ArrowLeft aria-hidden="true" />
            Back to {target.label}
          </a>
        )}
      />
    </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'Shared/BackLink',
  component: BackLinkStory,
} satisfies Meta<typeof BackLinkStory>

export default meta
type Story = StoryObj<typeof meta>

export const StructuralFallback: Story = { args: {} }

export const Origin: Story = { args: { from: 'active-scene' } }
