import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, StrictMode, type ReactNode, type Ref } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KeeperNotesConflictError, SceneNotFoundError, SceneValidationError } from '@/scenario-preparation/services/sceneApi'
import type { RichTextDocument } from '@/shared/types/RichText'

import { KeeperNotesSection, type KeeperNotesSectionHandle } from './keeper-notes-section'

// specs/scenario-preparation/ux.md section 73; SP-UX-110 to SP-UX-115 and SP-A11Y-61 to SP-A11Y-66.

const api = vi.hoisted(() => ({ saveKeeperNotes: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/sceneApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/sceneApi')>()),
  ...api,
}))

const notes = (text: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

const props = {
  campaignId: 'c1',
  scenarioId: 's1',
  sceneId: 'a1',
  keeperNotes: notes('The cellar key'),
  notesVersion: 0,
}

function setup(sectionRef?: Ref<KeeperNotesSectionHandle>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return render(<KeeperNotesSection {...props} sectionRef={sectionRef} />, { wrapper })
}

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const editorBox = () => screen.getByRole('textbox', { name: 'Keeper notes' }) as EditableElement

async function typeNotes(value: string) {
  const editor = editorBox().__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode(value)))
    })
  })
}

describe('KeeperNotesSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    // jsdom has no layout; focusing the Lexical editor while it mounts needs this.
    if (typeof window.Range !== 'undefined' && !window.Range.prototype.getBoundingClientRect) {
      window.Range.prototype.getBoundingClientRect = () => new DOMRect()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reads the notes with an Edit named for Keeper notes', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.getByText('The cellar key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Keeper notes' })).toHaveTextContent('Edit')
  })

  it('reads a placeholder when there are no notes', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<KeeperNotesSection {...props} keeperNotes={null} />, {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })

    expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
  })

  it('opens the editor with the current notes and saves as the Keeper types', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('The cellar door'), notesVersion: 1 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    const box = editorBox()
    expect(box).toHaveAccessibleDescription('Only you can read these. Changes save as you type.')
    expect(box).toHaveFocus()
    await typeNotes('The cellar door')

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    const [, , , , sentNotes, sentVersion] = api.saveKeeperNotes.mock.calls[0]
    expect([sentVersion, JSON.stringify(sentNotes)]).toEqual([0, expect.stringContaining('The cellar door')])
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
  })

  it('returns to the reading state on Done and moves focus to Edit', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('The cellar door'), notesVersion: 1 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByRole('button', { name: 'Edit Keeper notes' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('saves a waiting change on Done before returning', async () => {
    let resolveSave!: (value: { keeperNotes: RichTextDocument | null; notesVersion: number }) => void
    api.saveKeeperNotes.mockImplementationOnce(() => new Promise((resolve) => (resolveSave = resolve)))
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()

    await act(async () => resolveSave({ keeperNotes: notes('The cellar door'), notesVersion: 1 }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'Edit Keeper notes' })).toBeInTheDocument()
  })

  it('offers Try again after three failed attempts and announces the retry', async () => {
    api.saveKeeperNotes.mockRejectedValue(new Error('The network is down'))
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})

    expect(screen.getAllByText("Couldn't save. Retrying...")).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't save. Retrying...")
    await act(() => vi.advanceTimersByTimeAsync(2000))
    await act(async () => {})
    await act(() => vi.advanceTimersByTimeAsync(4000))
    await act(async () => {})

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your changes.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await act(async () => {})
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(4)
  })

  it('explains an offline save and resumes when back online', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('The cellar door'), notesVersion: 1 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getAllByText("You're offline. Your changes will save when you're back online.")).toHaveLength(2)
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(api.saveKeeperNotes).not.toHaveBeenCalled()

    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
  })

  it('reloads newer notes or keeps mine after a conflict', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Mine'), notesVersion: 6 })
    const { rerender } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('Mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})

    const conflict = await screen.findByRole('alert')
    expect(conflict).toHaveTextContent('These Keeper notes were changed in another window.')
    expect(screen.getByText('Not saved yet.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reload newer notes' }))
    expect(editorBox()).toHaveFocus()
    expect(screen.getByText('Newer')).toBeInTheDocument()

    rerender(<KeeperNotesSection {...props} keeperNotes={notes('Newer')} notesVersion={5} />)
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Newer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Keeper notes' })).toBeInTheDocument()
  })

  it('keeps mine by saving over the newer version', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Mine'), notesVersion: 6 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('Mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    await screen.findByRole('alert')

    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    await act(async () => {})
    const [, , , , sentNotes, sentVersion] = api.saveKeeperNotes.mock.calls.at(-1) as unknown[]
    expect([sentVersion, JSON.stringify(sentNotes)]).toEqual([5, expect.stringContaining('Mine')])
    expect(editorBox()).toHaveFocus()
  })

  it('refuses invalid notes, flags an over-long draft, and stops on a missing Scene', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new SceneValidationError({ keeperNotes: 'x' }))
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('Mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(await screen.findByRole('alert')).toHaveTextContent("These Keeper notes can't be saved.")

    api.saveKeeperNotes.mockRejectedValueOnce(new SceneNotFoundError())
    await typeNotes('Still mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't find this Scene any more.")
  })

  it('announces only the retrying, offline, and recovered states', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Mine'), notesVersion: 1 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    const live = screen.getByRole('status')
    expect(live).toHaveTextContent('')

    await typeNotes('Mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    expect(live).toHaveTextContent('')
  })

  it('shows no save status while the draft is over the limit', async () => {
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes(`x${'a'.repeat(300_000)}`)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})

    expect(api.saveKeeperNotes).not.toHaveBeenCalled()
    expect(screen.getByText('Keeper notes are too long. Shorten them and try again.')).toBeInTheDocument()
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
  })

  it('hides its Edit through the hideEdit prop', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<KeeperNotesSection {...props} hideEdit />, {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })

    expect(screen.getByRole('heading', { name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Keeper notes' })).not.toBeInTheDocument()
  })

  it('finishEditing resolves true at once when reading', async () => {
    const ref = createRef<KeeperNotesSectionHandle>()
    setup(ref)

    await act(async () => {
      await expect(ref.current?.finishEditing()).resolves.toBe(true)
    })
    expect(screen.getByRole('button', { name: 'Edit Keeper notes' })).toBeInTheDocument()
  })

  it('finishEditing waits for a pending save and returns to reading', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('The cellar door'), notesVersion: 1 })
    const ref = createRef<KeeperNotesSectionHandle>()
    setup(ref)

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    let finished!: Promise<boolean>
    await act(async () => {
      finished = ref.current?.finishEditing() ?? Promise.resolve(false)
    })
    await act(async () => {
      await expect(finished).resolves.toBe(true)
    })

    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Edit Keeper notes' })).toBeInTheDocument()
  })

  it('finishEditing resolves false on conflict and keeps the editor open', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    const ref = createRef<KeeperNotesSectionHandle>()
    setup(ref)

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('Mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    await expect(screen.findByRole('alert')).resolves.toBeInTheDocument()

    await act(async () => {
      await expect(ref.current?.finishEditing()).resolves.toBe(false)
    })
    expect(screen.getByRole('textbox', { name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Keeper notes' })).not.toBeInTheDocument()
  })

  it('announces the confirmed save after keeping mine over newer notes (SP-A11Y-63)', async () => {
    api.saveKeeperNotes.mockRejectedValueOnce(new KeeperNotesConflictError({ keeperNotes: notes('Newer'), notesVersion: 5 }))
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('Mine'), notesVersion: 6 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('Mine')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})
    await screen.findByRole('alert')
    expect(screen.getByRole('status')).toHaveTextContent('')

    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    await act(async () => {})

    expect(screen.getAllByText('All changes saved')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved')
  })

  it('announces the confirmed save after coming back online, clearing the offline text (SP-A11Y-63)', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('The cellar door'), notesVersion: 1 })
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status')).toHaveTextContent("You're offline. Your changes will save when you're back online.")

    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})

    expect(screen.getAllByText('All changes saved')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved')
  })

  it('confirms saves under React StrictMode remounting (dev and E2E mount, cleanup, remount)', async () => {
    api.saveKeeperNotes.mockResolvedValue({ keeperNotes: notes('The cellar door'), notesVersion: 1 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <KeeperNotesSection {...props} />
        </QueryClientProvider>
      </StrictMode>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Edit Keeper notes' }))
    await typeNotes('The cellar door')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    await act(async () => {})

    expect(api.saveKeeperNotes).toHaveBeenCalledTimes(1)
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
  })
})
