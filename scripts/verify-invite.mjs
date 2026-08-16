// Render-verify harness for /invite — real pixels from the local prod
// build, driving the installed Chrome via playwright-core (no browser
// downloads, no real backend).
//
// Usage:
//   pnpm exec next build && PORT=3100 pnpm exec next start &
//   node scripts/verify-invite.mjs http://localhost:3100 <outDir>
//
// Approach notes (hard-won, keep):
//   - The prelaunch middleware gates app routes on the ahavah.authed
//     cookie; seed it via addCookies.
//   - The referrals hook (correctly) skips fetching without a session
//     token, but seeding localStorage via addInitScript breaks Next
//     navigation outright (chrome-error page). Seed it with
//     page.evaluate on a neutral marketing page, then navigate.
//   - The app calls same-origin /api/** (Next proxy). Playwright checks
//     routes LAST-registered-FIRST, so register the generic /api/**
//     catch-all BEFORE the specific /api/referrals/me fixture.
import { chromium } from "playwright-core";

const [, , baseUrl = "http://localhost:3100", outDir = "."] = process.argv;

const FIXTURE = {
  code: "242W67K",
  link: "https://ahavah.app/i/242W67K",
  items: [
    { state: "credited", created_at: "2026-08-04T12:00:00+00:00", display_name: "Rivka" },
    { state: "credited", created_at: "2026-07-28T12:00:00+00:00", display_name: "Daniel" },
    { state: "graduated", created_at: "2026-08-10T12:00:00+00:00", display_name: null },
  ],
  totals: { joined: 3, credited: 2, premium_days_earned: 60, tokens_earned: 10 },
};

const ZERO = {
  ...FIXTURE,
  items: [],
  totals: { joined: 0, credited: 0, premium_days_earned: 0, tokens_earned: 0 },
};

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function shoot({ name, theme, data, interact }) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 1400 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    permissions: ["clipboard-read", "clipboard-write", "notifications"],
  });
  await ctx.addCookies([{ name: "ahavah.authed", value: "1", url: baseUrl }]);
  await ctx.route("**/api/**", (r) => r.fulfill({ json: {} }));
  await ctx.route("**/api/referrals/me", (r) => r.fulfill({ json: data }));
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/faq`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    localStorage.setItem("ahavah.session-token", "fixture-token"));
  await page.goto(`${baseUrl}/invite`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Every friend", { timeout: 10000 });
  await page.waitForTimeout(700);
  if (interact) await interact(page);
  const path = `${outDir}/invite-${theme}-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log("wrote", path);
  await ctx.close();
}

await shoot({ name: "default", theme: "dark", data: FIXTURE });
await shoot({ name: "zero", theme: "dark", data: ZERO });
await shoot({ name: "default", theme: "light", data: FIXTURE });
await shoot({
  name: "copied",
  theme: "dark",
  data: FIXTURE,
  interact: async (page) => {
    await page.locator('button:has-text("Copy")').first().click();
    await page.waitForTimeout(300);
  },
});

await browser.close();
