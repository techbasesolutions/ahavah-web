import { render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";

// Both /legal/* pages are client components that call useRequireSession(),
// which calls next/navigation's useRouter(). That hook throws outside a
// mounted App Router ("invariant expected app router to be mounted"), so
// a plain RTL render needs a router stub, the same shape used wherever else
// these pages' useRouter()-consuming children (e.g. BackButton) run in
// tests. getSessionToken() itself is safe unmocked (falls back to null
// via localStorage in jsdom).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

import PrivacyPage from "@/app/legal/privacy/page";
import TermsPage from "@/app/legal/terms/page";

// LegalArticleShell renders both a mobile and a desktop copy of every
// section in the same DOM (CSS-only breakpoint switching, both live in
// jsdom), so each string below appears more than once. getAllByText
// keeps the assertion's intent (the text is present) without asserting
// on how many times the shell happens to duplicate it.
it("privacy page describes Spotlight and its opt-in", () => {
  render(<PrivacyPage />);
  expect(screen.getAllByText(/Spotlight/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/only if you opt in/i).length).toBeGreaterThan(0);
});
it("terms grant a limited licence only for members who opt in", () => {
  render(<TermsPage />);
  expect(screen.getAllByText(/Spotlight/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/revoke/i).length).toBeGreaterThan(0);
});
