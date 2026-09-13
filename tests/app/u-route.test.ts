import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/u/[token]/route";

describe("/u/[token]", () => {
  it("forwards GET to the API unsubscribe endpoint on the same origin", async () => {
    const res = await GET(new Request("https://ahavah.app/u/abc.def.ghi"), {
      params: Promise.resolve({ token: "abc.def.ghi" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/u/abc.def.ghi");
  });

  it("forwards POST to the same API unsubscribe endpoint so the confirmation form re-posts", async () => {
    const res = await POST(new Request("https://ahavah.app/u/abc.def.ghi", { method: "POST" }), {
      params: Promise.resolve({ token: "abc.def.ghi" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/u/abc.def.ghi");
  });

  it("encodes a token containing characters that need encoding exactly once", async () => {
    const res = await GET(new Request("https://ahavah.app/u/a+b/c"), {
      params: Promise.resolve({ token: "a+b/c" }),
    });
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/u/a%2Bb%2Fc");
  });
});
