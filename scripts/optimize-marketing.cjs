/* One-off: optimize Ahavah Stock images -> public/marketing/*.webp.
   Run: node scripts/optimize-marketing.cjs
   sharp is a transitive dep (not hoisted), so require it from the pnpm path. */
const path = require("path");
const fs = require("fs");

const sharp = require(
  path.join(__dirname, "..", "node_modules/.pnpm/sharp@0.34.5/node_modules/sharp"),
);

const SRC = "C:/Users/Ehud/Documents/Ahavah Stock";
const DEST = path.join(__dirname, "..", "public", "marketing");
fs.mkdirSync(DEST, { recursive: true });

// Large JPGs -> resized webp.
const photos = [
  ["portrait-african-american-woman.jpg", "woman-1.webp"],
  ["medium-shot-smiley-african-couple.jpg", "couple-1.webp"],
  ["portrait-happy-smiley-couple.jpg", "couple-2.webp"],
  ["close-up-portrait-stylish-african-couple.jpg", "couple-3.webp"],
  ["happy-couple-beach.jpg", "couple-4.webp"],
  ["couple-enjoying-some-street-food-together.jpg", "couple-5.webp"],
  ["medium-shot-smiley-couple-outdoors.jpg", "couple-6.webp"],
  ["pexels-ab-pixels-ng-33931282.jpg", "avatar-1.webp"],
  ["pexels-iamdanzor-7492430.jpg", "avatar-2.webp"],
  ["pexels-sayantan-dhar-2154335308-37319357.jpg", "avatar-3.webp"],
  ["happy-romantic-couple-hugging-summer-field.jpg", "auth-couple.webp"],
];

// Already-optimized app-screen webps -> copy as-is.
const copies = [
  ["discover.webp", "step-discover.webp"],
  ["map.webp", "step-map.webp"],
  ["match.webp", "step-match.webp"],
];

(async () => {
  for (const [from, to] of photos) {
    const out = path.join(DEST, to);
    await sharp(path.join(SRC, from))
      .rotate() // honour EXIF orientation
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(out);
    console.log(`${to}: ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
  }
  for (const [from, to] of copies) {
    fs.copyFileSync(path.join(SRC, from), path.join(DEST, to));
    console.log(`${to}: copied`);
  }
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
