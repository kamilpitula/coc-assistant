import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { LiveConnectionOptions } from '@/shared/services/liveConnection'

import { CampaignLiveConnection } from './campaign-live-connection'
import { useCampaignLiveConnection } from './campaignLiveConnectionContext'

// specs/campaign-play/spec.md, Live connection contract: open the connection in the Campaign layout route, subscribe,
// refetch every Campaign query after a reconnect, and map CampaignDataChanged topics to their queries.

const { liveConnection, captured } = vi.hoisted(() => ({
  liveConnection: {
    start: vi.fn(async () => {}),
    retry: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    on: vi.fn(),
    invoke: vi.fn(),
  },
  captured: { options: undefined as LiveConnectionOptions | undefined },
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

vi.mock('@/shared/services/liveConnection', () => ({
  createLiveConnection: (options: LiveConnectionOptions) => {
    captured.options = options
    return liveConnection
  },
}))

function serverSends(method: string, payload: unknown) {
  const handler = liveConnection.on.mock.calls.find(([name]) => name === method)?.[1] as (message: unknown) => void
  act(() => handler(payload))
}

async function connect(reason: 'initial' | 'reconnected') {
  await act(async () => {
    captured.options!.onStateChange('connected')
    captured.options!.onConnected(reason)
  })
}

function PresenceProbe() {
  const { connection, presence, retry } = useCampaignLiveConnection()
  return (
    <>
      <p>connection: {connection}</p>
      <p>presence: {JSON.stringify(presence.presenceByMember)}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </>
  )
}

function setup() {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CampaignLiveConnection campaignId="c1">
        <PresenceProbe />
      </CampaignLiveConnection>
    </QueryClientProvider>,
  )
  return { invalidate, ...view }
}

describe('CampaignLiveConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    liveConnection.invoke.mockResolvedValue({ campaignId: 'c1', members: [{ memberId: 'k', presence: 'Connected' }] })
  })

  it('opens the Campaign hub connection and closes it when the user leaves the Campaign', () => {
    const { unmount } = setup()

    expect(captured.options?.url).toBe('/hubs/campaign')
    expect(liveConnection.start).toHaveBeenCalled()

    unmount()
    expect(liveConnection.stop).toHaveBeenCalled()
  })

  it('subscribes to the Campaign once connected and shares the Presence snapshot', async () => {
    setup()

    await connect('initial')

    expect(liveConnection.invoke).toHaveBeenCalledWith('SubscribeToCampaign', 'c1')
    expect(screen.getByText('connection: connected')).toBeInTheDocument()
    expect(screen.getByText('presence: {"k":"Connected"}')).toBeInTheDocument()
  })

  it('subscribes again and refetches every Campaign query after reconnecting', async () => {
    const { invalidate } = setup()
    await connect('initial')
    expect(invalidate).not.toHaveBeenCalled()

    await connect('reconnected')

    expect(liveConnection.invoke).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.detail('c1') })
  })

  it('applies Presence changes of this Campaign only', async () => {
    setup()
    await connect('initial')

    serverSends('PresenceChanged', { campaignId: 'other', memberId: 'x', presence: 'Connected' })
    serverSends('PresenceChanged', { campaignId: 'c1', memberId: 'p', presence: 'Connected' })

    expect(screen.getByText('presence: {"k":"Connected","p":"Connected"}')).toBeInTheDocument()
  })

  it('refetches the queries behind each topic of this Campaign', async () => {
    const { invalidate } = setup()
    await connect('initial')

    serverSends('CampaignDataChanged', { campaignId: 'other', topics: ['members'] })
    serverSends('CampaignDataChanged', { campaignId: 'c1', topics: ['members'] })

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.members('c1') })
  })

  it('records a refused subscription for a non-member', async () => {
    liveConnection.invoke.mockRejectedValue(new Error('Campaign not found.'))
    setup()

    await connect('initial')

    expect(screen.getByText('connection: refused')).toBeInTheDocument()
  })

  it('starts a new attempt when trying again', async () => {
    setup()

    act(() => screen.getByRole('button', { name: 'Try again' }).click())

    expect(liveConnection.retry).toHaveBeenCalled()
  })
})
