/* One-off: optimize the 6 Ahavah marketing app-screen mockups
   -> public/marketing/feature-*.webp.
   Run: node scripts/optimize-features.cjs
   sharp is a transitive dep (not hoisted), so require it from the pnpm path. */
const path = require("path");
const fs = require("fs");

const sharp = require(
  path.join(__dirname, "..", "node_modules/.pnpm/sharp@0.34.5/node_modules/sharp"),
);

const SRC = "C:/Users/Ehud/Documents/Ahavah Stock";
const DEST = path.join(__dirname, "..", "public", "marketing");
fs.mkdirSync(DEST, { recursive: true });

// Phone-mockup app screens (portrait) -> resized webp.
const screens = [
  ["ahavah-01-discover.png", "feature-discover.webp"],
  ["ahavah-02-map.png", "feature-map.webp"],
  ["ahavah-03-match.png", "feature-match.webp"],
  ["ahavah-04-chat.png", "feature-chat.webp"],
  ["ahavah-05-matches.png", "feature-matches.webp"],
  ["ahavah-06-community.png", "feature-community.webp"],
];

(async () => {
  for (const [from, to] of screens) {
    const out = path.join(DEST, to);
    const meta = await sharp(path.join(SRC, from)).metadata();
    await sharp(path.join(SRC, from))
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(out);
    console.log(
      `${to}: ${meta.width}x${meta.height} -> ${(fs.statSync(out).size / 1024).toFixed(0)}KB`,
    );
  }
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
