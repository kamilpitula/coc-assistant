import { createContext, useContext } from 'react'

/** A heading level of an extracted body as written for its full page. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** A rendered heading tag. */
export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const HEADING_TAGS: HeadingTag[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

/** Shifts a heading level by the offset, clamped to h1 at the top and h6 at the bottom. */
export function headingTag(level: HeadingLevel, offset: number): HeadingTag {
  const shifted = level + offset
  if (shifted <= 1) {
    return 'h1'
  }
  if (shifted >= 6) {
    return 'h6'
  }
  return HEADING_TAGS[shifted - 1]
}

const HeadingOffsetContext = createContext<number>(0)

export { HeadingOffsetContext }

/** The tag for a heading written at the given level, shifted by the enclosing provider's offset. */
export function useHeadingTag(level: HeadingLevel): HeadingTag {
  return headingTag(level, useContext(HeadingOffsetContext))
}
