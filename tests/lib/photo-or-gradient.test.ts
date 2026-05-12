import { describe, it, expect } from "vitest";
import { photoOrGradient } from "@/lib/photo-or-gradient";

describe("photoOrGradient", () => {
  it("returns gradient when profile has no photos", () => {
    const result = photoOrGradient({ firstName: "Adina" });
    expect(result.kind).toBe("gradient");
    if (result.kind === "gradient") {
      expect(result.css).toMatch(/linear-gradient/);
    }
  });

  it("returns photo when photos[0] is set", () => {
    const result = photoOrGradient({
      firstName: "Adina",
      photos: ["data:image/jpeg;base64,abc"],
    });
    expect(result.kind).toBe("photo");
    if (result.kind === "photo") {
      expect(result.src).toBe("data:image/jpeg;base64,abc");
    }
  });

  it("returns gradient when slotIndex points past array end", () => {
    const result = photoOrGradient(
      { firstName: "Adina", photos: ["data:image/jpeg;base64,abc"] },
      2,
    );
    expect(result.kind).toBe("gradient");
  });

  it("treats empty string photo entries as missing", () => {
    const result = photoOrGradient(
      { firstName: "Adina", photos: ["", "data:image/jpeg;base64,xyz"] },
      0,
    );
    expect(result.kind).toBe("gradient"); // slot 0 is empty
  });
});
