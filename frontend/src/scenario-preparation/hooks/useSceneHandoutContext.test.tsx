import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { corbittHouse, sceneOwner } from '@/scenario-preparation/test-support/handoutOwnerFixtures'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'

import { useSceneHandoutContext } from './useSceneHandoutContext'

// Design record PBI-SP-008, D3: the Scene query and what the Handout screens may do, until the Scene has loaded.

const { mockUseScene, refetch } = vi.hoisted(() => ({ mockUseScene: vi.fn(), refetch: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))

const owner = sceneOwner as SceneHandoutOwner

describe('useSceneHandoutContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks for the Scene of the owner, only when enabled', () => {
    mockUseScene.mockReturnValue({ data: undefined, refetch })

    renderHook(() => useSceneHandoutContext(owner, false))

    expect(mockUseScene).toHaveBeenLastCalledWith('c1', 's1', 'a1', false)
  })

  it('has no context until the Scene has loaded, and none for an unknown Scene', () => {
    mockUseScene.mockReturnValue({ data: undefined, refetch })
    expect(renderHook(() => useSceneHandoutContext(owner, true)).result.current.context).toBeNull()

    mockUseScene.mockReturnValue({ data: null, refetch })
    expect(renderHook(() => useSceneHandoutContext(owner, true)).result.current.context).toBeNull()
  })

  it('builds the context of the loaded Scene and reloads the Scene from it', () => {
    mockUseScene.mockReturnValue({ data: corbittHouse('Active'), refetch })

    const { result } = renderHook(() => useSceneHandoutContext(owner, true))
    result.current.context?.refetchOwner()

    expect(result.current.context).toMatchObject({ ownerName: 'The Corbitt House', canChange: true, canDelete: false })
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
