import { describe, it, expect } from "vitest";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import type { PhotoRecord } from "@/lib/photo-types";

function rec(overrides: Partial<PhotoRecord> = {}): PhotoRecord {
  return {
    uuid: "uuid-1",
    cdn_url: "https://cdn.example.com/450-uuid-1.jpg",
    position: 1,
    moderation_state: "approved",
    nsfw_score: 0.1,
    created_at: "2026-05-12T00:00:00Z",
    ...overrides,
  };
}

describe("photoOrGradient", () => {
  it("returns gradient when profile has no photos", () => {
    const result = photoOrGradient({ firstName: "Adina" });
    expect(result.kind).toBe("gradient");
    if (result.kind === "gradient") {
      expect(result.css).toMatch(/linear-gradient/);
    }
  });

  it("returns photo when photos[0].cdn_url is set", () => {
    const result = photoOrGradient({
      firstName: "Adina",
      photos: [rec()],
    });
    expect(result.kind).toBe("photo");
    if (result.kind === "photo") {
      expect(result.src).toBe("https://cdn.example.com/450-uuid-1.jpg");
    }
  });

  it("returns gradient when slotIndex points past array end", () => {
    const result = photoOrGradient(
      { firstName: "Adina", photos: [rec()] },
      2,
    );
    expect(result.kind).toBe("gradient");
  });

  it("treats photos with empty cdn_url as missing", () => {
    const result = photoOrGradient(
      {
        firstName: "Adina",
        photos: [rec({ cdn_url: "" }), rec({ position: 2 })],
      },
      0,
    );
    expect(result.kind).toBe("gradient"); // slot 0's photo has no CDN URL
  });

  it("returns photo from a later slot when its cdn_url is set", () => {
    const result = photoOrGradient(
      {
        firstName: "Adina",
        photos: [
          rec({ position: 1 }),
          rec({
            position: 2,
            uuid: "uuid-2",
            cdn_url: "https://cdn.example.com/450-uuid-2.jpg",
          }),
        ],
      },
      1,
    );
    expect(result.kind).toBe("photo");
    if (result.kind === "photo") {
      expect(result.src).toContain("uuid-2");
    }
  });
});
