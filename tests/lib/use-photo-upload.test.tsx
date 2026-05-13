import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// Mock both image-compress and photo-storage BEFORE importing the hook.
// compressImage uses canvas (no jsdom support), so we stub it to return
// a fixed compressed-blob shape. uploadPhoto is stubbed to delay so the
// "uploading" state is observable before the resolution.
vi.mock("@/lib/image-compress", () => ({
  compressImage: vi.fn(),
  base64Bytes: vi.fn(() => 1000),
  fitWithin: vi.fn(() => ({ width: 100, height: 100 })),
}));

vi.mock("@/lib/photo-storage", () => ({
  uploadPhoto: vi.fn(),
  listPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  reorderPhotos: vi.fn(),
  getQuota: vi.fn(),
}));

import { compressImage } from "@/lib/image-compress";
import { uploadPhoto } from "@/lib/photo-storage";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import type { PhotoRecord } from "@/lib/photo-types";

const mockCompress = compressImage as unknown as Mock;
const mockUpload = uploadPhoto as unknown as Mock;

const FAKE_FILE = new File([new Uint8Array([0x42, 0x43])], "test.jpg", {
  type: "image/jpeg",
});

// A 1x1 transparent PNG in base64 — produces a valid Blob via the
// hook's dataUrlToBlob helper.
const TINY_DATA_URL = "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpwf//Z";

// Stable global URL mocks so previewUrl creation doesn't blow up in jsdom.
beforeEach(() => {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview-mock");
  globalThis.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

function approvedRecord(position: number): PhotoRecord {
  return {
    uuid: "real-uuid",
    cdn_url: "https://cdn.example.com/450-real-uuid.jpg",
    position,
    moderation_state: "approved",
    nsfw_score: 0.1,
    created_at: "2026-05-12T00:00:00Z",
  };
}

function rejectedRecord(position: number): PhotoRecord {
  return {
    uuid: "real-uuid",
    cdn_url: "https://cdn.example.com/450-real-uuid.jpg",
    position,
    moderation_state: "rejected",
    nsfw_score: 0.95,
    created_at: "2026-05-12T00:00:00Z",
  };
}

function pendingRecord(position: number): PhotoRecord {
  return {
    uuid: "real-uuid",
    cdn_url: "https://cdn.example.com/450-real-uuid.jpg",
    position,
    moderation_state: "pending-review",
    nsfw_score: 0.5,
    created_at: "2026-05-12T00:00:00Z",
  };
}

describe("usePhotoUpload — state machine", () => {
  it("initial state is idle", () => {
    const { result } = renderHook(() => usePhotoUpload());
    expect(result.current.state.kind).toBe("idle");
  });

  it("idle → compressing → uploading → moderating", async () => {
    // Deferred upload so we can catch the "uploading" state mid-flight.
    let resolveUpload!: (value: { photo: PhotoRecord }) => void;
    const uploadPromise = new Promise<{ photo: PhotoRecord }>((resolve) => {
      resolveUpload = resolve;
    });
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockReturnValueOnce(uploadPromise);

    const { result } = renderHook(() => usePhotoUpload());

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start(FAKE_FILE, { position: 1 });
    });

    // First await tick: hook should be in "compressing" or have moved past.
    await waitFor(() => {
      // After compress resolves but upload pending: uploading
      expect(result.current.state.kind).toBe("uploading");
    });

    // Resolve the upload — should land in moderating.
    await act(async () => {
      resolveUpload({
        photo: {
          uuid: null,
          cdn_url: "",
          position: 1,
          moderation_state: "pending-review",
          nsfw_score: null,
          created_at: "",
        },
      });
      await startPromise;
    });

    expect(result.current.state.kind).toBe("moderating");
  });

  it("moderating + confirmModeration(approved) → ready", async () => {
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockResolvedValueOnce({
      photo: {
        uuid: null,
        cdn_url: "",
        position: 1,
        moderation_state: "pending-review",
        nsfw_score: null,
        created_at: "",
      },
    });

    const { result } = renderHook(() => usePhotoUpload());
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 1 });
    });
    expect(result.current.state.kind).toBe("moderating");

    act(() => {
      result.current.confirmModeration(approvedRecord(1));
    });

    expect(result.current.state.kind).toBe("ready");
    if (result.current.state.kind === "ready") {
      expect(result.current.state.photo.moderation_state).toBe("approved");
      expect(result.current.state.photo.uuid).toBe("real-uuid");
    }
  });

  it("moderating + confirmModeration(pending-review) → stays moderating", async () => {
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockResolvedValueOnce({
      photo: {
        uuid: null,
        cdn_url: "",
        position: 1,
        moderation_state: "pending-review",
        nsfw_score: null,
        created_at: "",
      },
    });

    const { result } = renderHook(() => usePhotoUpload());
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 1 });
    });
    expect(result.current.state.kind).toBe("moderating");

    act(() => {
      result.current.confirmModeration(pendingRecord(1));
    });

    // Still moderating — cron hasn't decided yet.
    expect(result.current.state.kind).toBe("moderating");
  });

  it("moderating + confirmModeration(rejected) → rejected", async () => {
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockResolvedValueOnce({
      photo: {
        uuid: null,
        cdn_url: "",
        position: 1,
        moderation_state: "pending-review",
        nsfw_score: null,
        created_at: "",
      },
    });

    const { result } = renderHook(() => usePhotoUpload());
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 1 });
    });
    act(() => {
      result.current.confirmModeration(rejectedRecord(1));
    });

    expect(result.current.state.kind).toBe("rejected");
    if (result.current.state.kind === "rejected") {
      expect(result.current.state.reason).toMatch(/declined/i);
    }
  });

  it("idle → compressing → uploading → error (on uploadPhoto throw)", async () => {
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockRejectedValueOnce(new Error("Network down"));

    const { result } = renderHook(() => usePhotoUpload());
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 1 });
    });

    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toContain("Network down");
    }
  });

  it("compressImage failure transitions to error", async () => {
    mockCompress.mockRejectedValueOnce(new Error("Not an image file."));

    const { result } = renderHook(() => usePhotoUpload());
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 1 });
    });

    expect(result.current.state.kind).toBe("error");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("reset() returns to idle from any state", async () => {
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockResolvedValueOnce({
      photo: {
        uuid: null,
        cdn_url: "",
        position: 1,
        moderation_state: "pending-review",
        nsfw_score: null,
        created_at: "",
      },
    });
    const { result } = renderHook(() => usePhotoUpload());
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 1 });
    });
    expect(result.current.state.kind).toBe("moderating");
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.kind).toBe("idle");
  });

  it("confirmModeration is a no-op when not in moderating state", () => {
    const { result } = renderHook(() => usePhotoUpload());
    // From idle, confirmModeration should do nothing.
    act(() => {
      result.current.confirmModeration(approvedRecord(1));
    });
    expect(result.current.state.kind).toBe("idle");
  });

  it("start() is a no-op when already uploading (re-entrancy guard)", async () => {
    // Hold the first upload mid-flight so the second start() finds us
    // in 'uploading' state.
    let resolveFirst!: (value: { photo: PhotoRecord }) => void;
    const firstPromise = new Promise<{ photo: PhotoRecord }>((resolve) => {
      resolveFirst = resolve;
    });
    mockCompress.mockResolvedValueOnce({
      dataUrl: TINY_DATA_URL,
      bytes: 100,
      width: 100,
      height: 100,
    });
    mockUpload.mockReturnValueOnce(firstPromise);

    const { result } = renderHook(() => usePhotoUpload());
    let firstStart!: Promise<void>;
    act(() => {
      firstStart = result.current.start(FAKE_FILE, { position: 1 });
    });
    await waitFor(() => expect(result.current.state.kind).toBe("uploading"));

    // Second start() must NOT call compress again.
    await act(async () => {
      await result.current.start(FAKE_FILE, { position: 2 });
    });
    expect(mockCompress).toHaveBeenCalledTimes(1);

    // Cleanup: resolve so the first promise doesn't dangle.
    await act(async () => {
      resolveFirst({
        photo: {
          uuid: null,
          cdn_url: "",
          position: 1,
          moderation_state: "pending-review",
          nsfw_score: null,
          created_at: "",
        },
      });
      await firstStart;
    });
  });
});
