// /resources/rss.xml: updates feed. Hand-rolled XML (no extra dep).
import { getUpdates } from "@/lib/content";

const BASE = "https://ahavah.app";

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function GET() {
  const updates = getUpdates();
  const items = updates
    .map(
      (u) => `    <item>
      <title>${escape(u.title)}</title>
      <link>${BASE}/resources/updates/${u.slug}</link>
      <guid>${BASE}/resources/updates/${u.slug}</guid>
      <pubDate>${new Date(u.date).toUTCString()}</pubDate>
      <description>${escape(u.description)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ahavah Updates</title>
    <link>${BASE}/resources/updates</link>
    <description>Announcements and product updates from the Ahavah team.</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
