import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { formatSceneTime } from '@/scenario-preparation/services/sceneTime'

import { SceneTimes } from './scene-times'

// specs/scenario-preparation/ux.md section 12; SP-UX-21, SP-A11Y-11.
const STARTED = '2026-10-12T19:40:00Z'
const FINISHED = '2026-10-12T21:05:00Z'

describe('SceneTimes', () => {
  it('shows nothing before the Scene is played', () => {
    const { container } = render(<SceneTimes startedAt={null} finishedAt={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the start once the Scene is Active, in a time element with the ISO value', () => {
    render(<SceneTimes startedAt={STARTED} finishedAt={null} />)

    expect(screen.getByText(/Started/)).toBeInTheDocument()
    expect(screen.queryByText(/Finished/)).not.toBeInTheDocument()
    const time = screen.getByText(formatSceneTime(STARTED))
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', STARTED)
  })

  it('shows the start and the finish once the Scene is Finished', () => {
    render(<SceneTimes startedAt={STARTED} finishedAt={FINISHED} />)

    expect(screen.getByText(formatSceneTime(FINISHED))).toHaveAttribute('datetime', FINISHED)
    expect(screen.getByText(/Finished/)).toBeInTheDocument()
  })
})
