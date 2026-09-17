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
    photos: [{ uuid: "photo-abc", url: "https://example.com/p1.jpg" }],
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

it("Approve POSTs the photo_uuid and revision from the GET once and shows the approved heading", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true, result: "approved" });
  await renderPage();
  const button = await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(button);
  await screen.findByText("Approved. We will email you when it is live.");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/spotlight/card/t1", {
    decision: "approve",
    photo_uuid: "photo-abc",
    revision: 1,
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
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
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
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
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

// Fix wave item 1. `approve_card` answers with one of three results, and
// only two of them mean the member consented. The third, `new_revision`,
// means the server made a different card and recorded nothing; reporting
// that as "Approved" claimed a consent the server never took.

it("Approve lands on the approved state when the result is approved", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true, result: "approved" });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("Approved. We will email you when it is live.");
});

it("Approve lands on the approved state when the result is already", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true, result: "already" });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("Approved. We will email you when it is live.");
});

it("a new_revision result re-reads the card and asks again instead of reporting success", async () => {
  api.get
    .mockResolvedValueOnce(baseCard())
    .mockResolvedValue(baseCard({ revision: 2, photo_uuid: "photo-def", image_url: "https://example.com/card-2.png" }));
  api.post.mockResolvedValue({ ok: true, result: "new_revision", revision: 2 });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText(
    "This card changed, so nothing has been approved yet. Look at the new one and approve it if you are happy with it.",
  );
  expect(screen.queryByText("Approved. We will email you when it is live.")).not.toBeInTheDocument();
  // The second GET is the re-read, and the new card is what is on screen.
  expect(api.get).toHaveBeenCalledTimes(2);
  const newImg = screen.getByRole("img", { name: "Your Spotlight card" });
  expect(newImg).toHaveAttribute("src", "https://example.com/card-2.png");
  // The re-read mounted a fresh <img>: consent must be to these new bytes,
  // so Approve is disabled again until this image loads too.
  expect(screen.getByRole("button", { name: "Approve this card" })).toBeDisabled();
  fireEvent.load(newImg);
  await waitFor(() => expect(screen.getByRole("button", { name: "Approve this card" })).toBeEnabled());
});

it("an unrecognised approve result lands on the error state", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true, result: "something_else" });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("We could not reach Ahavah.");
});

it("a replayed token that reports already skipped lands on the skipped state", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockResolvedValue({ ok: true, already: true, status: "skipped" });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("Skipped. Nothing will be posted.");
});

// Fix wave, also-fix items: the POST refusals that are not connection
// failures no longer read as one.

it("a 409 preview_unavailable shows the unavailable copy", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockRejectedValue(new ApiError(409, { error: "preview_unavailable" }));
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("Your card is still being prepared.");
});

it("a 409 photo_not_owned says the photo could not be used", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockRejectedValue(new ApiError(409, { error: "photo_not_owned" }));
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("We could not use that photo.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

it("a 403 says the decision was not recorded rather than blaming the connection", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockRejectedValue(new ApiError(403, { error: "forbidden" }));
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("We could not record that decision.");
  expect(screen.queryByText("We could not reach Ahavah.")).not.toBeInTheDocument();
});

it("an unnamed 409 says the decision was not recorded rather than blaming the connection", async () => {
  api.get.mockResolvedValue(baseCard());
  api.post.mockRejectedValue(new ApiError(409, { error: "not_subject" }));
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("We could not record that decision.");
});

// Wave 3d Task 2: consent binds to the revision on screen. A tab left open
// on revision 1 while an operator's caption edit rendered revision 2 used
// to approve revision 2. The POST now names the revision the page showed;
// the API answers a stale one with `new_revision` and records nothing.

it("a stale approve shows the new card with the notice, never Approved, and the next approve names the new revision", async () => {
  api.get
    .mockResolvedValueOnce(baseCard())
    .mockResolvedValue(baseCard({ revision: 2, image_url: "https://example.com/card-2.png" }));
  api.post
    .mockResolvedValueOnce({ ok: true, result: "new_revision", revision: 2 })
    .mockResolvedValue({ ok: true, result: "approved" });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  expect(api.post).toHaveBeenLastCalledWith("/spotlight/card/t1", {
    decision: "approve",
    photo_uuid: "photo-abc",
    revision: 1,
  });
  await screen.findByText(
    "This card changed, so nothing has been approved yet. Look at the new one and approve it if you are happy with it.",
  );
  expect(screen.queryByText("Approved. We will email you when it is live.")).not.toBeInTheDocument();
  const newImg = screen.getByRole("img", { name: "Your Spotlight card" });
  expect(newImg).toHaveAttribute("src", "https://example.com/card-2.png");
  expect(screen.getByRole("button", { name: "Approve this card" })).toBeDisabled();
  fireEvent.load(newImg);
  await waitFor(() => expect(screen.getByRole("button", { name: "Approve this card" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Approve this card" }));
  await screen.findByText("Approved. We will email you when it is live.");
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenLastCalledWith("/spotlight/card/t1", {
    decision: "approve",
    photo_uuid: "photo-abc",
    revision: 2,
  });
});

it("Approve is disabled when the card carries no revision", async () => {
  api.get.mockResolvedValue(baseCard({ revision: null }));
  await renderPage();
  const approve = await screen.findByRole("button", { name: "Approve this card" });
  expect(approve).toBeDisabled();
  expect(screen.getByRole("button", { name: "Skip this card" })).toBeEnabled();
  fireEvent.click(approve);
  expect(api.post).not.toHaveBeenCalled();
});

it("Approve is disabled when the card carries no photo_uuid", async () => {
  api.get.mockResolvedValue(baseCard({ photo_uuid: null }));
  await renderPage();
  const approve = await screen.findByRole("button", { name: "Approve this card" });
  expect(approve).toBeDisabled();
  expect(screen.getByRole("button", { name: "Skip this card" })).toBeEnabled();
  expect(api.post).not.toHaveBeenCalled();
});

// Fix wave item 3. Approve used to enable as soon as photo_uuid and
// revision existed, which is before the browser has painted a single
// pixel of the image those fields describe. On a slow connection, or
// right after a `new_revision` re-read unmounts the old <img> and mounts
// a fresh one, a member could tap Approve while the image area is still
// blank. Consent must be to the bytes actually shown.

it("Approve is disabled until the card image fires load, then enables", async () => {
  api.get.mockResolvedValue(baseCard());
  await renderPage();
  const approve = await screen.findByRole("button", { name: "Approve this card" });
  expect(approve).toBeDisabled();
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  await waitFor(() => expect(approve).toBeEnabled());
});

it("after a new_revision re-read, Approve is disabled again until the new image loads", async () => {
  api.get
    .mockResolvedValueOnce(baseCard())
    .mockResolvedValue(baseCard({ revision: 2, image_url: "https://example.com/card-2.png" }));
  api.post.mockResolvedValue({ ok: true, result: "new_revision", revision: 2 });
  await renderPage();
  await screen.findByRole("button", { name: "Approve this card" });
  fireEvent.load(screen.getByRole("img", { name: "Your Spotlight card" }));
  const approve = await screen.findByRole("button", { name: "Approve this card" });
  await waitFor(() => expect(approve).toBeEnabled());
  fireEvent.click(approve);
  await screen.findByText(
    "This card changed, so nothing has been approved yet. Look at the new one and approve it if you are happy with it.",
  );
  const newImg = screen.getByRole("img", { name: "Your Spotlight card" });
  expect(newImg).toHaveAttribute("src", "https://example.com/card-2.png");
  expect(screen.getByRole("button", { name: "Approve this card" })).toBeDisabled();
  fireEvent.load(newImg);
  await waitFor(() => expect(screen.getByRole("button", { name: "Approve this card" })).toBeEnabled());
});

it("Approve is enabled without a load event when the image is already complete on mount (cached)", async () => {
  const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
  const originalNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "naturalWidth");
  Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 800 });
  try {
    api.get.mockResolvedValue(baseCard());
    await renderPage();
    const approve = await screen.findByRole("button", { name: "Approve this card" });
    await waitFor(() => expect(approve).toBeEnabled());
  } finally {
    if (originalComplete) Object.defineProperty(HTMLImageElement.prototype, "complete", originalComplete);
    if (originalNaturalWidth) {
      Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", originalNaturalWidth);
    }
  }
});
