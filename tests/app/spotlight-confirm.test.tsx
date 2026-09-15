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
import SpotlightConfirmPage from "@/app/spotlight/confirm/[token]/page";

// `params` is a Promise in this Next 16 client component, unwrapped via
// React's `use`. A fresh promise per render (never a shared, already-
// consumed one) and a Suspense boundary around it, since `use()`
// genuinely suspends the first time a given promise is read and there is
// no route-level Suspense boundary in a bare RTL render to catch it.
async function renderPage(token = "t1") {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <SpotlightConfirmPage params={Promise.resolve({ token })} />
      </Suspense>,
    );
    // Flush the microtask the fresh `params` promise needs to settle so
    // `use()`'s first (real) suspension resolves inside this `act` call
    // rather than leaking past it (see the "component suspended inside
    // an act scope" warning without this).
    await Promise.resolve();
  });
}

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
});

it("renders the default state from the GET and never POSTs on load", async () => {
  api.get.mockResolvedValue({ email_masked: "r••••a@gmail.com", already: false, stale: false });
  await renderPage();
  // The heading's "Spotlight" is wrapped in its own <em>, so the full
  // sentence is split across text nodes; match on the heading element's
  // combined textContent instead of RTL's default (single-node) text match.
  await screen.findByRole("heading", { name: "Feature me in Spotlight." });
  expect(screen.getByText("r••••a@gmail.com")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Feature me in Spotlight" })).toBeInTheDocument();
  expect(screen.getByText("This page has not changed anything yet.")).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

it("POSTs once on click and shows the success state, with the button gone", async () => {
  api.get.mockResolvedValue({ email_masked: "r••••a@gmail.com", already: false, stale: false });
  api.post.mockResolvedValue({ ok: true, already: false });
  await renderPage();
  const button = await screen.findByRole("button", { name: "Feature me in Spotlight" });
  fireEvent.click(button);
  await screen.findByText("You are in. We will email you before anything is posted.");
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/spotlight/confirm/t1");
  expect(screen.queryByRole("button", { name: "Feature me in Spotlight" })).not.toBeInTheDocument();
});

it("renders the already state when the GET reports already opted in", async () => {
  api.get.mockResolvedValue({ email_masked: "r••••a@gmail.com", already: true, stale: false });
  await renderPage();
  await screen.findByText("You are already in Spotlight.");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("renders the expired state when the GET reports stale", async () => {
  api.get.mockResolvedValue({ email_masked: "r••••a@gmail.com", already: false, stale: true });
  await renderPage();
  await screen.findByText("This link has expired.");
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

it("renders the error state when the GET rejects with a network error", async () => {
  api.get.mockRejectedValue(new Error("network down"));
  await renderPage();
  await screen.findByText("We could not reach Ahavah.");
});

it("renders the expired state when the POST rejects with a 410", async () => {
  api.get.mockResolvedValue({ email_masked: "r••••a@gmail.com", already: false, stale: false });
  api.post.mockRejectedValue(new ApiError(410, { error: "stale" }));
  await renderPage();
  const button = await screen.findByRole("button", { name: "Feature me in Spotlight" });
  fireEvent.click(button);
  await screen.findByText("This link has expired.");
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
});
