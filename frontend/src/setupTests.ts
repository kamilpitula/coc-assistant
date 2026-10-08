import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver; Radix primitives (for example Checkbox inside a form) measure with it.
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= NoopResizeObserver

// jsdom lacks the pointer-capture and scrolling APIs Radix Select calls when it opens.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
