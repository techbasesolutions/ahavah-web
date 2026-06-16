import { describe, it, expect, vi, beforeEach } from "vitest";
import { cropImageToBlob } from "@/lib/crop-image";

describe("cropImageToBlob", () => {
  beforeEach(() => {
    // jsdom has no real canvas, and Image doesn't auto-fire onload from a
    // blob: URL. Stub Image so onload fires with known natural dimensions.
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 1000;
        height = 800;
        set src(_v: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
  });

  it("sizes the output canvas to the crop region and draws that region", async () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: (b: Blob) => void) =>
      cb(new Blob(["x"], { type: "image/jpeg" })),
    );
    const canvas: Record<string, unknown> = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob,
    };
    vi.spyOn(document, "createElement").mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const blob = await cropImageToBlob("blob:fake", {
      x: 100,
      y: 50,
      width: 400,
      height: 400,
    });

    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(400);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      100,
      50,
      400,
      400,
      0,
      0,
      400,
      400,
    );
    expect(blob.type).toBe("image/jpeg");
  });
});
