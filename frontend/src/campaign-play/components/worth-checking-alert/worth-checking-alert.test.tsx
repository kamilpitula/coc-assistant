import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { problem } from '@/campaign-play/test-support/characterSheetFixtures'

import { WorthCheckingAlert } from './worth-checking-alert'

/** specs/character-sheet/ux.md section 5.2: warnings in a non-blocking "Worth checking" Alert, never role="alert". */
describe('WorthCheckingAlert', () => {
  it('lists each warning under "Worth checking" without announcing it', () => {
    render(<WorthCheckingAlert warnings={[problem('PointBuyBelowRecommendation', 'characteristics.SIZ', 'SIZ is below the recommended 40.', 'Warning')]} />)

    expect(screen.getByRole('heading', { name: 'Worth checking' })).toBeInTheDocument()
    expect(screen.getByText('SIZ is below the recommended 40.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('UX-30: lists notes after the warnings, and shows notes without warnings', () => {
    render(<WorthCheckingAlert warnings={[]} notes={['Custom occupation: Bootlegger', '1 custom weapon']} />)

    expect(screen.getByRole('heading', { name: 'Worth checking' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Custom occupation: Bootlegger', '1 custom weapon'])
  })

  it('renders nothing without warnings', () => {
    const { container } = render(<WorthCheckingAlert warnings={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
