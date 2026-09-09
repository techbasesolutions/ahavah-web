// Verify the built privacy page using synthetic API responses and installed Chrome.
// Run: node scripts/verify-review.mjs http://localhost:3107 <screenshot-directory>
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const [, , base = "http://localhost:3107", output = "test-results/review"] = process.argv;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: "block" });
    let visible = true;
    let rejectSave = true;
    let patches = 0;
    const advertising = [];
    await context.addCookies([{ name: "ahavah.authed", value: "1", url: base }]);
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (/facebook|fbevents/.test(url.href)) advertising.push(url.href);
      if (url.pathname.endsWith("/profile-info")) {
        if (request.method() === "PATCH") {
          patches++;
          if (rejectSave) return route.fulfill({ status: 500, json: { error: "Synthetic failure" } });
          visible = request.postDataJSON().ahavah_extra.showOnMap;
        }
        return route.fulfill({ json: { "show my location": "Yes", "show my age": "Yes", ahavah_extra: { showOnMap: visible } } });
      }
      if (url.pathname.endsWith("/me")) return route.fulfill({ json: { citySet: true } });
      if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {} });
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    await context.routeWebSocket("**/*", socket => socket.close());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/faq`);
    await page.evaluate(() => localStorage.setItem("ahavah.session-token", "synthetic-review-session"));
    await page.goto(`${base}/settings/privacy`);
    const toggle = page.getByRole("switch", { name: "Show me on the map", exact: true });
    await page.getByText("Showing your saved privacy settings.", { exact: true }).filter({ visible: true }).waitFor();
    assert.equal(await toggle.getAttribute("aria-checked"), "true");
    await toggle.click();
    await page.getByText("Could not save. Your previous visibility still applies. Please try again.", { exact: true }).filter({ visible: true }).waitFor();
    assert.equal(await toggle.getAttribute("aria-checked"), "true");
    await page.screenshot({ path: `${output}/privacy-failed-${width}.png`, fullPage: true });
    rejectSave = false;
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Show me on the map"]')?.getAttribute("aria-checked") === "false");
    await page.reload();
    await page.getByText("Showing your saved privacy settings.", { exact: true }).filter({ visible: true }).waitFor();
    assert.equal(await toggle.getAttribute("aria-checked"), "false");
    assert.equal(patches, 2);
    assert.deepEqual(advertising, []);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/privacy-saved-${width}.png`, fullPage: true });
    await context.close();
    console.log(`PASS ${width}px: rejected save, confirmed save, reload, no advertising requests or page errors`);
  }
} finally {
  await browser.close();
}
