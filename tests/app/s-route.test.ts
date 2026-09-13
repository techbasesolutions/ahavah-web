import { describe, it, expect } from "vitest";
import { GET } from "@/app/s/[key]/route";

describe("/s/[key]", () => {
  it("forwards to the API click endpoint on the same origin", async () => {
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/s/abc123");
  });
});
