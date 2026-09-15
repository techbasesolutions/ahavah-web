import { Suspense, act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api-client", () => ({
  apiClient: api,
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `HTTP ${status}`);
      this.status = status;
      this.body = body;
    }
  },
}));

import { ApiError } from "@/lib/api-client";
import SpotlightCardPage from "@/app/spotlight/card/[token]/page";

// Same `use(params)` + Suspense harness as tests/app/spotlight-confirm.test.tsx:
// `use()` genuinely suspends the first time a given promise is read, and a
// bare RTL render has no route-level Suspense boundary to catch it. A fresh
// promise per render (never a shared, already-consumed one).
async function renderPage(token = "t1") {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <SpotlightCardPage params={Promise.resolve({ token })} />
      </Suspense>,
    );
    await Promise.resolve();
  });
}

function baseCard(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Ruth",
    age: 29,
    country: "Jamaica",
    kind: "single",
    caption: "Loves long walks.",
    photos: ["https://example.com/p1.jpg"],
    photo_uuid: "photo-abc",
    revision: 1,
    preview_available: true,
    image_url: "https://example.com/card.png",
    status: "awaiting_member",
    expires_at: "2026-09-22T00:00:00Z",
    stale: false,
    ...overrides,
  };
}

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
});

it("renders the default state with the image and both buttons, and never POSTs on load", async () => {
  api.get.mockResolvedValue(baseCard());
  await renderPage();
  await screen.findByRole("heading", { name: "Your Spotlight card is ready." });
  const img = screen.getByRole("img", { name: "Your Spotlight card" });
  expect(img).toHaveAttribute("src", "https://example.com/card.png");
  expect(screen.getByRole("button", { name: "Approve this card" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Skip this card" })).toBeInTheDocument();
  expect(screen.getByText("This page has not changed anything yet.")).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

it("Approve POSTs the photo_uuid from the GET once and shows the approved heading", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true, result: "approved" });
  await renderPage();
  const button = await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.click(button);
  await screen.findByText("Approved. We will email you when it is live.");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/spotlight/card/t1", {
    decision: "approve",
    photo_uuid: "photo-abc",
  });
});

it("Skip POSTs the skip decision and shows the skipped heading", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true });
  await renderPage();
  const button = await screen.findByRole("button", { name: "Skip this card" });
  fireEvent.click(button);
  await screen.findByText("Skipped. Nothing will be posted.");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/spotlight/card/t1", { decision: "skip" });
});

it("both buttons are disabled while a decision POST is pending", async () => {
  api.get.mockResolvedValue(baseCard());
  let resolvePost: (value: { ok: boolean; result?: string }) => void = () => {};
  api.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));
  await renderPage();
  const approve = await screen.findByRole("button", { name: "Approve this card" });
  const skip = screen.getByRole("button", { name: "Skip this card" });
  fireEvent.click(approve);
  await waitFor(() => expect(approve).toBeDisabled());
  expect(skip).toBeDisabled();
  await act(async () => {
    resolvePost({ ok: true, result: "approved" });
    await Promise.resolve();
  });
});

it("lands on the approved state directly when the GET reports status approved", async () => {
  api.get.mockResolvedValue(baseCard({ status: "approved" }));
  await renderPage();
  await screen.findByText("Approved. We will email you when it is live.");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

it("renders the unavailable state when preview_available is false", async () => {
  api.get.mockResolvedValue(baseCard({ preview_available: false, image_url: null }));
  await renderPage();
  await screen.findByText("Your card is still being prepared.");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("renders the paused state when the POST rejects with 409 approvals_disabled", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockRejectedValue(new ApiError(409, { error: "approvals_disabled" }));
  await renderPage();
  const button = await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.click(button);
  await screen.findByText("Approvals are paused for a moment.");
});

it("renders the expired state when the GET rejects with a 410", async () => {
  api.get.mockRejectedValue(new ApiError(410, { error: "expired" }));
  await renderPage();
  await screen.findByText("This link has expired.");
});

it("renders the invalid state when the GET rejects with a 400", async () => {
  api.get.mockRejectedValue(new ApiError(400, { error: "invalid_token" }));
  await renderPage();
  await screen.findByText("This link is not valid.");
});

it("renders the invalid state when the GET rejects with a 404", async () => {
  api.get.mockRejectedValue(new ApiError(404, { error: "not_found" }));
  await renderPage();
  await screen.findByText("This link is not valid.");
});
