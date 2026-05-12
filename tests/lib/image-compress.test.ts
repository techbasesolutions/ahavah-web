import { describe, expect, it } from "vitest";
import { base64Bytes, fitWithin } from "@/lib/image-compress";

// Note: compressImage requires browser canvas; integration-tested via
// /onboarding/photos smoke walk in T8, not unit-tested here (a jsdom
// canvas mock would test the mock, not the real flow).

describe("fitWithin", () => {
  it("source smaller than max returns source dims unchanged (no enlarge)", () => {
    expect(fitWithin(640, 480, 1080, 1440)).toEqual({ width: 640, height: 480 });
  });

  it("landscape source 4000x2000, max 1080x1440 scales by maxW/srcW", () => {
    // scale = min(1, 1080/4000=0.27, 1440/2000=0.72) = 0.27
    // width = round(4000 * 0.27) = 1080
    // height = round(2000 * 0.27) = 540
    expect(fitWithin(4000, 2000, 1080, 1440)).toEqual({ width: 1080, height: 540 });
  });

  it("portrait source 2000x4000, max 1080x1440 scales by maxH/srcH", () => {
    // scale = min(1, 1080/2000=0.54, 1440/4000=0.36) = 0.36
    // width = round(2000 * 0.36) = 720
    // height = round(4000 * 0.36) = 1440
    expect(fitWithin(2000, 4000, 1080, 1440)).toEqual({ width: 720, height: 1440 });
  });

  it("exact-match source 1080x1440 returns 1080x1440 unchanged", () => {
    expect(fitWithin(1080, 1440, 1080, 1440)).toEqual({ width: 1080, height: 1440 });
  });
});

describe("base64Bytes", () => {
  it("typical JPEG data URL returns approximate byte count", () => {
    // 12 base64 chars after the comma -> floor(12 * 3 / 4) = 9 bytes
    const dataUrl = "data:image/jpeg;base64,QUJDREVGR0hJSktM";
    // "QUJDREVGR0hJSktM" is 16 chars -> floor(16*3/4) = 12 bytes
    expect(base64Bytes(dataUrl)).toBe(12);
  });

  it("raw base64 string (no data: prefix) still returns approximate count", () => {
    // 8 chars -> floor(8*3/4) = 6 bytes
    expect(base64Bytes("QUJDREVG")).toBe(6);
  });

  it("empty after comma returns 0", () => {
    expect(base64Bytes("data:image/jpeg;base64,")).toBe(0);
  });
});
