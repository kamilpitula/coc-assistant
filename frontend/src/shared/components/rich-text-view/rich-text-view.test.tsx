import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'
import type { RichTextDocument } from '@/shared/types/RichText'

import { RichTextView } from './rich-text-view'

// specs/scenario-preparation/ux.md section 15; SP-UX-18, SP-UX-19, SP-A11Y-10. The document is the fixture that holds
// every allowed node. Lexical renders bold as strong and italic as em; underline and strikethrough are theme classes.
const fixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), '../specs/scenario-preparation/rich-text-fixtures.json'), 'utf-8'),
) as { cases: Array<{ name: string; document: RichTextDocument }> }
const everyNode = fixtures.cases.find((fixtureCase) => fixtureCase.name === 'every allowed node')!.document

describe('RichTextView', () => {
  it('renders every allowed node with its element', () => {
    const { container } = render(<RichTextView document={everyNode} />)

    expect(container.querySelector('strong')).not.toBeNull()
    expect(container.querySelector('em')).not.toBeNull()
    expect(container.querySelector('.underline')).not.toBeNull()
    expect(container.querySelector('.line-through')).not.toBeNull()
    expect(container.querySelector('h3')).toHaveTextContent('Heading')
    expect(container.querySelector('h4')).toHaveTextContent('Subheading')
    expect(container.querySelector('blockquote')).toHaveTextContent('Quote')
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelector('ol')).not.toBeNull()
    expect(container.querySelector('br')).not.toBeNull()
  })

  it('opens links in a new tab with rel noopener noreferrer', () => {
    const { container } = render(<RichTextView document={everyNode} />)

    const links = [...container.querySelectorAll('a')]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('is read-only', () => {
    const { container } = render(<RichTextView document={everyNode} />)

    expect(container.querySelector('[contenteditable="true"]')).toBeNull()
    expect(container.querySelector('[contenteditable="false"]')).not.toBeNull()
  })

  it('renders Heading and Subheading as h4 and h5 when the heading offset is 1 and does not render an h3', () => {
    const { container } = render(<RichTextView document={everyNode} headingOffset={1} />)

    expect(container.querySelector('h4')).toHaveTextContent('Heading')
    expect(container.querySelector('h5')).toHaveTextContent('Subheading')
    expect(container.querySelector('h3')).toBeNull()
  })

  it('keeps the other nodes and the read-only state when the heading offset is 1', () => {
    const { container } = render(<RichTextView document={everyNode} headingOffset={1} />)

    expect(container.querySelector('blockquote')).toHaveTextContent('Quote')
    expect(container.querySelector('strong')).not.toBeNull()
    expect(container.querySelector('[contenteditable="true"]')).toBeNull()
  })

  it('renders Heading and Subheading as h5 and h6 when the heading offset is 2', () => {
    const { container } = render(<RichTextView document={everyNode} headingOffset={2} />)

    expect(container.querySelector('h5')).toHaveTextContent('Heading')
    expect(container.querySelector('h6')).toHaveTextContent('Subheading')
    expect(container.querySelector('h4')).toBeNull()
  })

  it('adds the provider offset to its own offset', () => {
    const { container } = render(
      <HeadingOffsetProvider value={1}>
        <RichTextView document={everyNode} headingOffset={1} />
      </HeadingOffsetProvider>,
    )

    expect(container.querySelector('h5')).toHaveTextContent('Heading')
    expect(container.querySelector('h6')).toHaveTextContent('Subheading')
  })

  it('clamps the combined offset at h6', () => {
    const { container } = render(
      <HeadingOffsetProvider value={3}>
        <RichTextView document={everyNode} headingOffset={2} />
      </HeadingOffsetProvider>,
    )

    expect(container.querySelector('h6')).toHaveTextContent('Heading')
    expect(container.querySelector('h5')).toBeNull()
  })
})
