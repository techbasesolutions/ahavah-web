// Vitest setup — extended in later sub-plans (RTL matchers, MSW handlers, etc.).
import "@testing-library/jest-dom"

// jsdom does not implement window.matchMedia — provide a minimal stub.
// The default viewport in jsdom is 1024px wide, which satisfies (min-width: 768px).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query === "(min-width: 768px)" ? true : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
