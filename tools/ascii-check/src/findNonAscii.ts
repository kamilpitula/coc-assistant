export interface NonAsciiCharacter {
  path: string
  line: number
  column: number
  codePoint: string
}

const byteOrderMark = '\uFEFF'
const lastAsciiCodePoint = 0x7f

export function findNonAscii(path: string, content: string): NonAsciiCharacter[] {
  const text = content.startsWith(byteOrderMark) ? content.slice(byteOrderMark.length) : content
  return text.split('\n').flatMap((lineText, lineIndex) => nonAsciiInLine(path, lineText, lineIndex + 1))
}

function nonAsciiInLine(path: string, lineText: string, line: number): NonAsciiCharacter[] {
  return Array.from(lineText).flatMap((character, columnIndex) => {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint <= lastAsciiCodePoint) {
      return []
    }
    return [{ path, line, column: columnIndex + 1, codePoint: formatCodePoint(codePoint) }]
  })
}

function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}
