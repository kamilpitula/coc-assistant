import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KeeperNotesConflictError, SceneNotFoundError, SceneValidationError } from '@/scenario-preparation/services/sceneApi'
import type { RichTextDocument } from '@/shared/types/RichText'

import { useKeeperNotesAutosave } from './useKeeperNotesAutosave'

// specs/scenario-preparation/ux.md section 73.2 and 73.3: the autosave behavior behind the Keeper notes section.

const api = vi.hoisted(() => ({ saveKeeperNotes: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/sceneApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/sceneApi')>()),
  ...api,
}))

const notes = (text: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

const oversize = (): RichTextDocument => notes('a'.repeat(300_000))

function setup(onDone: () => void = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => useKeeperNotesAutosave({ campaignId: 'c1', scenarioId: 's1', sceneId: 'a1', notesVersion: 0, onDone }), { wrapper })
  return { ...hook, onDone }
}

describe('keeper notes autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    onlineManager.setOnline(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    onlineManager.setOnline(true)
    vi.unstubAllGlobals()
  })

  it('saves one second after the last change and records the confirmed version', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Cellar'), notesVersion: 1 })
    const { result } = setup()

    act(() => result.current.edited(notes('Cellar')))
    expect(result.current.state.status).toBe('pending')
    await act(() => vi.advanceTimersByTimeAsync(999))
    expect(api.saveKeeperNotes).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(api.saveKeeperNotes).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', notes('Cellar'), 0)
    await act(async () => {})
    expect(result.current.state).toEqual({ status: 'saved', baseVersion: 1 })
  })

  it('sends one save for rapid typing and re-saves changes made during the save', async () => {
    let resolveFirst!: (value: { keeperNotes: RichTextDocument | null; notesVersion: number }) => void
    api.saveKeeperNotes.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve)),
    )
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Attic'), notesVersion: 1 })
    const { result } = setup()

    act(() => result.current.edited(notes('Cellar')))
    act(() => result.current.edited(notes('Cellar door')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)

    act(() => result.current.edited(notes('Attic')))
    expect(result.current.state.status).toBe('saving')
    await act(async () => resolveFirst({ keeperNotes: notes('Cellar'), notesVersion: 1 }))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(2)
    expect(api.saveKeeperNotes).toHaveBeenLastCalledWith('token', 'c1', 's1', 'a1', notes('Attic'), 1)
  })

  it('retries after 2 and 4 seconds, then fails and retries on demand', async () => {
    api.saveKeeperNotes.mockRejectedValue(new Error('The network is down'))
    const { result } = setup()

    act(() => result.current.edited(notes('Cellar')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.state.status).toBe('retrying')

    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(2)
    await act(() => vi.advanceTimersByTimeAsync(4000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(3)
    expect(result.current.state.status).toBe('failed')

    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Cellar'), notesVersion: 1 })
    act(() => result.current.retryNow())
    await act(async () => {})
    expect(result.current.state).toEqual({ status: 'saved', baseVersion: 1 })
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(4)
  })

  it('restarts the attempt count when the Keeper types while retrying', async () => {
    api.saveKeeperNotes.mockRejectedValue(new Error('The network is down'))
    const { result } = setup()

    act(() => result.current.edited(notes('Cellar')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    act(() => result.current.edited(notes('Attic')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(2)
  })

  it('waits while offline and saves once back online', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Cellar'), notesVersion: 1 })
    const { result } = setup()

    act(() => result.current.edited(notes('Cellar')))
    act(() => onlineManager.setOnline(false))
    expect(result.current.state.status).toBe('offline')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(api.saveKeeperNotes).not.toHaveBeenCalled()

    act(() => onlineManager.setOnline(true))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    await act(async () => {})
    expect(result.current.state).toEqual({ status: 'saved', baseVersion: 1 })
  })

  it('pauses on a conflict; keeping mine saves at the newer version and reloading takes it', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Mine'), notesVersion: 6 })
    const { result } = setup()

    act(() => result.current.edited(notes('Mine')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(result.current.state.status).toBe('conflict')
    expect(result.current.state).toEqual({
      status: 'conflict',
      baseVersion: 0,
      content: notes('Mine'),
      serverNotes: notes('Newer'),
      serverVersion: 5,
    })

    act(() => result.current.keepMine())
    await act(async () => {})
    expect(api.saveKeeperNotes).toHaveBeenLastCalledWith('token', 'c1', 's1', 'a1', notes('Mine'), 5)
    await act(async () => {})
    expect(result.current.state).toEqual({ status: 'saved', baseVersion: 6 })
  })

  it('reloads the newer notes as saved', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    const { result } = setup()

    act(() => result.current.edited(notes('Mine')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(result.current.state.status).toBe('conflict')

    act(() => result.current.reloadServer())
    expect(result.current.state).toEqual({ status: 'saved', baseVersion: 5 })
  })

  it('refuses invalid notes without retrying and stops on a missing Scene', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new SceneValidationError({}))
    const first = setup()

    act(() => first.result.current.edited(notes('Cellar')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(first.result.current.state.status).toBe('refused')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    first.unmount()
    await act(async () => {})

    api.saveKeeperNotes.mockRejectedValueOnce(new SceneNotFoundError())
    const second = setup()
    act(() => second.result.current.edited(notes('Cellar')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(second.result.current.state.status).toBe('gone')
  })

  it('sends nothing over the size limit until the notes fit', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Short'), notesVersion: 1 })
    const { result } = setup()

    act(() => result.current.edited(oversize()))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.saveKeeperNotes).not.toHaveBeenCalled()
    expect(result.current.tooLong).toBe(true)

    act(() => result.current.edited(notes('Short')))
    expect(result.current.tooLong).toBe(false)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
  })

  it('closes at once with nothing unsaved and waits for a waiting save otherwise', async () => {
    let resolveSave!: (value: { keeperNotes: RichTextDocument | null; notesVersion: number }) => void
    api.saveKeeperNotes.mockImplementationOnce(() => new Promise((resolve) => (resolveSave = resolve)))
    const onDone = vi.fn()
    const { result } = setup(onDone)

    act(() => result.current.requestDone())
    expect(onDone).toHaveBeenCalledTimes(1)

    act(() => result.current.edited(notes('Cellar')))
    await act(async () => result.current.requestDone())
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)

    await act(async () => resolveSave({ keeperNotes: notes('Cellar'), notesVersion: 1 }))
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('stays open on a conflict and shows the hint for Done while offline', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    const onDone = vi.fn()
    const { result } = setup(onDone)

    act(() => result.current.edited(notes('Mine')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(result.current.state.status).toBe('conflict')
    act(() => result.current.requestDone())
    expect(onDone).not.toHaveBeenCalled()

    act(() => result.current.reloadServer())
    act(() => onlineManager.setOnline(false))
    act(() => result.current.edited(notes('More')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.state.status).toBe('offline')
    act(() => result.current.requestDone())
    expect(onDone).not.toHaveBeenCalled()
    expect(result.current.showDoneOfflineHint).toBe(true)
  })

  it('flushes an unsaved change on unmount', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Cellar'), notesVersion: 1 })
    const { result, unmount } = setup()

    act(() => result.current.edited(notes('Cellar')))
    unmount()

    await act(async () => {})
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    expect(api.saveKeeperNotes).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', notes('Cellar'), 0)
  })

  it('never resends a refused save on Done, on finish, or on unmount', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new SceneValidationError({ keeperNotes: 'x' }))
    const onDone = vi.fn()
    const { result, unmount } = setup(onDone)

    act(() => result.current.edited(notes('Cellar')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(result.current.state.status).toBe('refused')

    act(() => result.current.requestDone())
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
    expect(result.current.state.status).toBe('refused')

    await act(async () => {
      await expect(result.current.finishEditing()).resolves.toBe(false)
    })
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)

    unmount()
    await act(async () => {})
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
  })

  it('finishEditing saves a waiting change and resolves true once confirmed', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Cellar'), notesVersion: 1 })
    const onDone = vi.fn()
    const { result } = setup(onDone)

    act(() => result.current.edited(notes('Cellar')))
    let finished!: Promise<boolean>
    act(() => {
      finished = result.current.finishEditing()
    })
    await act(async () => {
      await expect(finished).resolves.toBe(true)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(result.current.state).toEqual({ status: 'saved', baseVersion: 1 })
  })

  it('finishEditing resolves false while offline and shows the hint', async () => {
    const onDone = vi.fn()
    const { result } = setup(onDone)

    act(() => onlineManager.setOnline(false))
    act(() => result.current.edited(notes('Cellar')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.state.status).toBe('offline')

    await act(async () => {
      await expect(result.current.finishEditing()).resolves.toBe(false)
    })
    expect(onDone).not.toHaveBeenCalled()
    expect(result.current.showDoneOfflineHint).toBe(true)
  })

  it('finishEditing resolves false on conflict and keeps the editor state', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    const onDone = vi.fn()
    const { result } = setup(onDone)

    act(() => result.current.edited(notes('Mine')))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(result.current.state.status).toBe('conflict')

    await act(async () => {
      await expect(result.current.finishEditing()).resolves.toBe(false)
    })
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
    expect(result.current.state.status).toBe('conflict')
  })
})
