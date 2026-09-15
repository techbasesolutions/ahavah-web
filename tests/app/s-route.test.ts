import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/s/[key]/route";
import { apiOrigin } from "@/lib/api-origin";

const RECEIPT = "R".repeat(32);

function upstream(headers: Record<string, string> = {}): Response {
  return { headers: new Headers(headers) } as Response;
}

describe("/s/[key]", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to the API's Location and sets the cookie to the receipt when one is minted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        upstream({ location: "https://target.example/deep-link", "x-spotlight-receipt": RECEIPT }),
      ),
    );
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://target.example/deep-link");
    expect(res.headers.get("set-cookie") ?? "").toContain(`ahavah.spotlight_ref=${RECEIPT}`);
  });

  it("still redirects but sets no cookie when the API mints no receipt (a bot click)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => upstream({ location: "https://target.example/deep-link" })));
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://target.example/deep-link");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("falls back to the same-origin proxy without a cookie when the upstream call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/s/abc123");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("falls back to the same-origin proxy without a cookie when the upstream call times out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" })));
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/s/abc123");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("falls back to the same-origin proxy when the upstream response carries no Location", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => upstream({ "x-spotlight-receipt": RECEIPT })));
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/s/abc123");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("falls back to the same-origin proxy when the upstream Location can't be parsed as a URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => upstream({ location: "http://", "x-spotlight-receipt": RECEIPT })));
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ahavah.app/api/s/abc123");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("forwards the incoming User-Agent to the upstream call so the API can classify bots", async () => {
    const crawlerUA = "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)";
    let sentHeaders: Headers | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        sentHeaders = new Headers(init?.headers);
        return upstream({ location: "https://target.example/x" });
      }),
    );
    await GET(new Request("https://ahavah.app/s/abc123", { headers: { "user-agent": crawlerUA } }), {
      params: Promise.resolve({ key: "abc123" }),
    });
    expect(sentHeaders?.get("user-agent")).toBe(crawlerUA);
  });

  it("forwards a valid platform to the upstream call", async () => {
    let calledUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        calledUrl = String(input);
        return upstream({ location: "https://target.example/x" });
      }),
    );
    await GET(new Request("https://ahavah.app/s/abc123?p=facebook"), { params: Promise.resolve({ key: "abc123" }) });
    expect(calledUrl).toContain("/s/abc123?p=facebook");
  });

  it("forwards the other allowed platform, instagram", async () => {
    let calledUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        calledUrl = String(input);
        return upstream({ location: "https://target.example/x" });
      }),
    );
    await GET(new Request("https://ahavah.app/s/abc123?p=instagram"), { params: Promise.resolve({ key: "abc123" }) });
    expect(calledUrl).toContain("/s/abc123?p=instagram");
  });

  it("drops a platform that isn't facebook or instagram", async () => {
    let calledUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        calledUrl = String(input);
        return upstream({ location: "https://target.example/x" });
      }),
    );
    await GET(new Request("https://ahavah.app/s/abc123?p=twitter"), { params: Promise.resolve({ key: "abc123" }) });
    expect(calledUrl).not.toContain("p=twitter");
    expect(calledUrl).not.toContain("?p=");
  });

  it("pins cache: no-store on the upstream call", async () => {
    // A cached 302 would hand one receipt to many visitors: the first sign-up
    // consumes the single-use receipt and everyone else silently earns no
    // credit. Uncached is the Next 16 default for route handlers, but this
    // property is load-bearing, so it is stated on the request and asserted
    // here rather than inherited.
    let init: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, got?: RequestInit) => {
        init = got;
        return upstream({ location: "https://target.example/x" });
      }),
    );
    await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("manual");
  });

  it("calls the origin from the shared api-origin module, the one next.config also imports", async () => {
    // The route used to repeat next.config.ts's origin expression character
    // for character. If the two drifted, the direct call would fail, every
    // click would fall back to the proxy and mint no receipt, and clicks
    // would keep rising while sign-ups went to zero. Both now reference one
    // module, and this asserts the route really uses it.
    let calledUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        calledUrl = String(input);
        return upstream({ location: "https://target.example/x" });
      }),
    );
    await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(calledUrl).toBe(`${apiOrigin()}/s/abc123`);
  });

  it("sets a 7-day ahavah.spotlight_ref cookie scoped to the whole site", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => upstream({ location: "https://target.example/x", "x-spotlight-receipt": RECEIPT })),
    );
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`ahavah.spotlight_ref=${RECEIPT}`);
    expect(setCookie).toContain("Max-Age=604800");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/samesite=lax/i);
  });

  it("marks the cookie Secure when the request origin is https", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => upstream({ location: "https://target.example/x", "x-spotlight-receipt": RECEIPT })),
    );
    const res = await GET(new Request("https://ahavah.app/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    expect(res.headers.get("set-cookie") ?? "").toContain("Secure");
  });

  it("omits Secure when the request origin is http", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => upstream({ location: "https://target.example/x", "x-spotlight-receipt": RECEIPT })),
    );
    const res = await GET(new Request("http://localhost:3000/s/abc123"), { params: Promise.resolve({ key: "abc123" }) });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`ahavah.spotlight_ref=${RECEIPT}`);
    expect(setCookie).not.toContain("Secure");
  });
});
