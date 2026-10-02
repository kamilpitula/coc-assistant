/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Read from disk (Vitest runs from frontend/): its CSS handling empties `?raw` imports of stylesheets.
const indexCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8')

type Oklch = { lightness: number; chroma: number; hue: number }

function readToken(name: string): Oklch {
  const match = indexCss.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`))
  if (!match) {
    throw new Error(`--${name} is not defined as an oklch colour in index.css`)
  }
  return { lightness: Number(match[1]), chroma: Number(match[2]), hue: Number(match[3]) }
}

// OKLCH -> linear sRGB (Bjorn Ottosson's OKLab matrices), clamped to the sRGB gamut.
function toLinearSrgb({ lightness, chroma, hue }: Oklch): number[] {
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.min(Math.max(channel, 0), 1))
}

function relativeLuminance(colour: Oklch): number {
  const [red, green, blue] = toLinearSrgb(colour)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: Oklch, second: Oklch): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('index.css colour tokens', () => {
  it('maps --destructive into the Tailwind theme so text-destructive resolves', () => {
    expect(indexCss).toMatch(/--color-destructive:\s*var\(--destructive\)/)
  })

  it('gives --destructive at least 4.5:1 contrast against --background (WCAG 2.2 AA text)', () => {
    expect(contrastRatio(readToken('destructive'), readToken('background'))).toBeGreaterThanOrEqual(4.5)
  })

  it('maps --warning into the Tailwind theme so text-warning resolves', () => {
    expect(indexCss).toMatch(/--color-warning:\s*var\(--warning\)/)
  })

  it('gives --warning at least 4.5:1 contrast against --background (WCAG 2.2 AA text)', () => {
    expect(contrastRatio(readToken('warning'), readToken('background'))).toBeGreaterThanOrEqual(4.5)
  })

  it('computes the known 21:1 contrast of black on white', () => {
    const white = { lightness: 1, chroma: 0, hue: 0 }
    const black = { lightness: 0, chroma: 0, hue: 0 }
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1)
  })
})
