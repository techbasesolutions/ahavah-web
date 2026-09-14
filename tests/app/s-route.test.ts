import { describe, it, expect } from "vitest";
import { GET } from "@/app/s/[key]/route";

describe("/s/[key]", () => {
  it("forwards to the API click endpoint on the same origin", async () => {
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/s/abc123");
  });

  it("sets a 7-day ahavah.spotlight_ref cookie scoped to the whole site", async () => {
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("ahavah.spotlight_ref=abc123");
    expect(setCookie).toContain("Max-Age=604800");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/samesite=lax/i);
  });

  it("marks the cookie Secure when the request origin is https", async () => {
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("Secure");
  });

  it("omits Secure when the request origin is http", async () => {
    const res = await GET(new Request("http://localhost:3000/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("ahavah.spotlight_ref=abc123");
    expect(setCookie).not.toContain("Secure");
  });
});
