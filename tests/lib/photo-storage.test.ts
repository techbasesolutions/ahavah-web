import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import {
  adaptProfileInfoPhotos,
  blobToBase64DataUrl,
  cdnUrlFor,
  deletePhoto,
  getQuota,
  listPhotos,
  MAX_PHOTOS,
  moderationStateFromScore,
  reorderPhotos,
  stripDataUrlPrefix,
  uploadPhoto,
} from "@/lib/photo-storage";
import type { ProfileInfoResponse } from "@/lib/api-types";

// Mock the api-client so we can intercept the wire calls without spinning
// up a real backend. `apiClient.delete` doesn't accept a body, so the
// implementation falls back to a raw fetch() for DELETE — we mock that too.
vi.mock("@/lib/api-client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      postMultipart: vi.fn(),
    },
  };
});

import { apiClient } from "@/lib/api-client";

const mockGet = apiClient.get as Mock;
const mockPatch = apiClient.patch as Mock;

describe("photo-storage / moderationStateFromScore", () => {
  it("null score → pending-review", () => {
    expect(moderationStateFromScore(null)).toBe("pending-review");
  });
  it("undefined score → pending-review", () => {
    expect(moderationStateFromScore(undefined)).toBe("pending-review");
  });
  it("score 0.2 → approved", () => {
    expect(moderationStateFromScore(0.2)).toBe("approved");
  });
  it("score 0 → approved (boundary)", () => {
    expect(moderationStateFromScore(0)).toBe("approved");
  });
  it("score 0.39 → approved (just under 0.40)", () => {
    expect(moderationStateFromScore(0.39)).toBe("approved");
  });
  it("score 0.40 → pending-review (boundary)", () => {
    expect(moderationStateFromScore(0.4)).toBe("pending-review");
  });
  it("score 0.5 → pending-review (manual review zone)", () => {
    expect(moderationStateFromScore(0.5)).toBe("pending-review");
  });
  it("score 0.749 → pending-review (just under 0.75)", () => {
    expect(moderationStateFromScore(0.749)).toBe("pending-review");
  });
  it("score 0.75 → rejected (boundary)", () => {
    expect(moderationStateFromScore(0.75)).toBe("rejected");
  });
  it("score 0.85 → rejected", () => {
    expect(moderationStateFromScore(0.85)).toBe("rejected");
  });
  it("score 1.0 → rejected (upper boundary)", () => {
    expect(moderationStateFromScore(1.0)).toBe("rejected");
  });
});

describe("photo-storage / stripDataUrlPrefix", () => {
  it("strips data:image/jpeg;base64, prefix", () => {
    expect(stripDataUrlPrefix("data:image/jpeg;base64,abcDEF")).toBe("abcDEF");
  });
  it("strips data:image/png;base64, prefix", () => {
    expect(stripDataUrlPrefix("data:image/png;base64,xyz")).toBe("xyz");
  });
  it("returns raw base64 unchanged", () => {
    expect(stripDataUrlPrefix("rawBase64NoPrefix")).toBe("rawBase64NoPrefix");
  });
  it("handles empty string", () => {
    expect(stripDataUrlPrefix("")).toBe("");
  });
});

describe("photo-storage / cdnUrlFor", () => {
  it("defaults to 450 size", () => {
    expect(cdnUrlFor("abc123")).toMatch(/\/450-abc123\.jpg$/);
  });
  it("honours explicit size", () => {
    expect(cdnUrlFor("abc123", 900)).toMatch(/\/900-abc123\.jpg$/);
  });
  it("supports original size", () => {
    expect(cdnUrlFor("abc123", "original")).toMatch(/\/original-abc123\.jpg$/);
  });
});

describe("photo-storage / adaptProfileInfoPhotos", () => {
  it("maps position-keyed photo map to PhotoRecord[]", () => {
    const payload: ProfileInfoResponse = {
      photo: { "1": "uuid-aaa", "2": "uuid-bbb" },
    };
    const result = adaptProfileInfoPhotos(payload);
    expect(result).toHaveLength(2);
    expect(result[0]?.position).toBe(1);
    expect(result[0]?.uuid).toBe("uuid-aaa");
    expect(result[0]?.cdn_url).toContain("450-uuid-aaa.jpg");
    expect(result[1]?.position).toBe(2);
    expect(result[1]?.uuid).toBe("uuid-bbb");
  });

  it("returns empty array when photo map is null", () => {
    expect(adaptProfileInfoPhotos({ photo: null })).toEqual([]);
  });

  it("returns empty array when photo map is missing", () => {
    expect(adaptProfileInfoPhotos({} as ProfileInfoResponse)).toEqual([]);
  });

  it("sorts photos by position ascending (sparse maps)", () => {
    const payload: ProfileInfoResponse = {
      photo: { "5": "e", "1": "a", "3": "c" },
    };
    const result = adaptProfileInfoPhotos(payload);
    expect(result.map((p) => p.position)).toEqual([1, 3, 5]);
    expect(result.map((p) => p.uuid)).toEqual(["a", "c", "e"]);
  });

  it("synthesizes moderation_state from score map: null → pending-review", () => {
    const payload: ProfileInfoResponse = { photo: { "1": "u" } };
    const [photo] = adaptProfileInfoPhotos(payload, { "1": null });
    expect(photo?.moderation_state).toBe("pending-review");
    expect(photo?.nsfw_score).toBeNull();
  });

  it("synthesizes moderation_state: 0.2 → approved", () => {
    const payload: ProfileInfoResponse = { photo: { "1": "u" } };
    const [photo] = adaptProfileInfoPhotos(payload, { "1": 0.2 });
    expect(photo?.moderation_state).toBe("approved");
    expect(photo?.nsfw_score).toBe(0.2);
  });

  it("synthesizes moderation_state: 0.5 → pending-review (manual queue)", () => {
    const payload: ProfileInfoResponse = { photo: { "1": "u" } };
    const [photo] = adaptProfileInfoPhotos(payload, { "1": 0.5 });
    expect(photo?.moderation_state).toBe("pending-review");
  });

  it("synthesizes moderation_state: 0.85 → rejected", () => {
    const payload: ProfileInfoResponse = { photo: { "1": "u" } };
    const [photo] = adaptProfileInfoPhotos(payload, { "1": 0.85 });
    expect(photo?.moderation_state).toBe("rejected");
  });

  it("treats empty-string uuid as null + empty cdn_url", () => {
    const payload = { photo: { "1": "" } } as unknown as ProfileInfoResponse;
    const [photo] = adaptProfileInfoPhotos(payload);
    expect(photo?.uuid).toBeNull();
    expect(photo?.cdn_url).toBe("");
  });
});

describe("photo-storage / listPhotos", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("calls GET /profile-info and adapts the result", async () => {
    mockGet.mockResolvedValueOnce({
      photo: { "1": "uuid-1", "2": "uuid-2" },
    } as ProfileInfoResponse);
    const result = await listPhotos();
    expect(mockGet).toHaveBeenCalledWith("/profile-info");
    expect(result).toHaveLength(2);
    expect(result[0]?.uuid).toBe("uuid-1");
  });
});

describe("photo-storage / getQuota", () => {
  it("returns 0 sentinels for byte counts + 7 for max", () => {
    const quota = getQuota(3);
    expect(quota.maxPhotos).toBe(MAX_PHOTOS);
    expect(quota.maxPhotos).toBe(7);
    expect(quota.currentPhotoCount).toBe(3);
    expect(quota.usedBytes).toBe(0);
    expect(quota.limitBytes).toBe(0);
  });
});

describe("photo-storage / uploadPhoto", () => {
  beforeEach(() => {
    mockPatch.mockReset();
  });

  it("compresses → base64 → PATCH /profile-info with correct payload", async () => {
    mockPatch.mockResolvedValueOnce({});
    // Smallest possible 1-byte JPEG blob mock. FileReader's readAsDataURL
    // produces `data:application/octet-stream;base64,XXX` for arbitrary
    // bytes — good enough for shape testing.
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    });
    const result = await uploadPhoto(blob, { position: 2, top: 10, left: 20 });

    expect(mockPatch).toHaveBeenCalledWith(
      "/profile-info",
      expect.objectContaining({
        base64_file: expect.objectContaining({
          position: 2,
          top: 10,
          left: 20,
          base64: expect.any(String),
        }),
      }),
    );

    // Verify base64 prefix stripping: the wire payload must NOT include
    // the data:image/...;base64, prefix.
    const call = mockPatch.mock.calls[0];
    const payload = call?.[1] as { base64_file: { base64: string } };
    expect(payload.base64_file.base64).not.toMatch(/^data:/);
    expect(payload.base64_file.base64.length).toBeGreaterThan(0);

    // Optimistic result has pending-review state + position from input.
    expect(result.photo.position).toBe(2);
    expect(result.photo.moderation_state).toBe("pending-review");
    expect(result.photo.nsfw_score).toBeNull();
    expect(result.photo.uuid).toBeNull();
  });

  it("defaults top/left to 0 when omitted", async () => {
    mockPatch.mockResolvedValueOnce({});
    const blob = new Blob([new Uint8Array([0x42])], { type: "image/jpeg" });
    await uploadPhoto(blob, { position: 1 });
    const payload = mockPatch.mock.calls[0]?.[1] as {
      base64_file: { top: number; left: number };
    };
    expect(payload.base64_file.top).toBe(0);
    expect(payload.base64_file.left).toBe(0);
  });
});

describe("photo-storage / blobToBase64DataUrl", () => {
  it("reads a Blob into a data URL", async () => {
    const blob = new Blob([new Uint8Array([0x41, 0x42, 0x43])], {
      type: "text/plain",
    });
    const result = await blobToBase64DataUrl(blob);
    expect(result).toMatch(/^data:/);
    expect(result).toContain(";base64,");
  });
});

describe("photo-storage / reorderPhotos", () => {
  beforeEach(() => {
    mockPatch.mockReset();
  });

  it("PATCHes /profile-info with photo_assignments map", async () => {
    mockPatch.mockResolvedValueOnce({});
    await reorderPhotos({ 1: 2, 2: 1 });
    expect(mockPatch).toHaveBeenCalledWith("/profile-info", {
      photo_assignments: { 1: 2, 2: 1 },
    });
  });
});

describe("photo-storage / deletePhoto", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("DELETEs /profile-info with files:[position] body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await deletePhoto(3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/profile-info");
    expect(init.method).toBe("DELETE");
    expect(init.credentials).toBe("include");
    expect(init.body).toBe(JSON.stringify({ files: [3] }));
  });

  it("throws when DELETE returns non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "bad" }),
    } as unknown as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(deletePhoto(1)).rejects.toThrow("bad");
  });
});
