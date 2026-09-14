import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SPOTLIGHT_REF_COOKIE, clearSpotlightRef, readSpotlightRef } from "@/lib/spotlight-ref";

/**
 * document.cookie stub — a minimal cookie jar good enough to exercise
 * readSpotlightRef/clearSpotlightRef without depending on jsdom's own
 * cookie-jar semantics (which vary by test origin/protocol).
 */
function stubDocumentCookie(initial = "") {
  let jar = initial;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => jar,
    set: (raw: string) => {
      const [pair, ...attrs] = raw.split(";").map((s) => s.trim());
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith("max-age="));
      const deleting = maxAgeAttr !== undefined && Number(maxAgeAttr.split("=")[1]) <= 0;
      const remaining = jar
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((c) => !c.startsWith(`${name}=`));
      if (!deleting) remaining.push(`${name}=${value}`);
      jar = remaining.join("; ");
    },
  });
}

describe("spotlight-ref", () => {
  beforeEach(() => {
    stubDocumentCookie("");
  });

  afterEach(() => {
    delete (document as unknown as { cookie?: string }).cookie;
  });

  describe("readSpotlightRef", () => {
    it("returns null when the cookie is absent", () => {
      expect(readSpotlightRef()).toBeNull();
    });

    it("returns the value when the cookie is present and well-formed", () => {
      document.cookie = `${SPOTLIGHT_REF_COOKIE}=abc123`;
      expect(readSpotlightRef()).toBe("abc123");
    });

    it("reads the right cookie among several", () => {
      document.cookie = "other=1";
      document.cookie = `${SPOTLIGHT_REF_COOKIE}=xyz789`;
      document.cookie = "another=2";
      expect(readSpotlightRef()).toBe("xyz789");
    });

    it("returns null when the cookie value is longer than 32 characters", () => {
      document.cookie = `${SPOTLIGHT_REF_COOKIE}=${"a".repeat(33)}`;
      expect(readSpotlightRef()).toBeNull();
    });

    it("returns null when the cookie value contains characters outside the key charset", () => {
      document.cookie = `${SPOTLIGHT_REF_COOKIE}=<script>`;
      expect(readSpotlightRef()).toBeNull();
    });

    it("returns null when the cookie value is empty", () => {
      document.cookie = `${SPOTLIGHT_REF_COOKIE}=`;
      expect(readSpotlightRef()).toBeNull();
    });
  });

  describe("clearSpotlightRef", () => {
    it("removes the cookie so a later read returns null", () => {
      document.cookie = `${SPOTLIGHT_REF_COOKIE}=abc123`;
      expect(readSpotlightRef()).toBe("abc123");
      clearSpotlightRef();
      expect(readSpotlightRef()).toBeNull();
    });

    it("is a no-op when the cookie was never set", () => {
      expect(() => clearSpotlightRef()).not.toThrow();
      expect(readSpotlightRef()).toBeNull();
    });
  });
});
