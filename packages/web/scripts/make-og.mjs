// Generates packages/web/public/og.png (1200x630) from an inline SVG.
// Run once and commit the PNG: `npm --workspace @flashkarte/web run make-og`.
import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0f172a"/>
  <circle cx="170" cy="200" r="220" fill="#4f46e5" opacity="0.35"/>
  <circle cx="1050" cy="470" r="240" fill="#a21caf" opacity="0.25"/>
  <rect x="90" y="250" width="120" height="120" rx="28" fill="#4f46e5"/>
  <text x="150" y="332" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">fk</text>
  <text x="250" y="300" font-family="Arial, sans-serif" font-size="84" font-weight="bold" fill="#ffffff">flashkarte</text>
  <text x="252" y="372" font-family="Arial, sans-serif" font-size="40" fill="#cbd5e1">Learn anything, faster.</text>
  <text x="252" y="430" font-family="Arial, sans-serif" font-size="30" fill="#94a3b8">Spaced-repetition flashcards · web &amp; Android</text>
</svg>`;

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "..", "public", "og.png");
const meta = await sharp(Buffer.from(svg)).png().toFile(out);
if (meta.width !== 1200 || meta.height !== 630) {
  throw new Error(`unexpected og.png size: ${meta.width}x${meta.height}`);
}
console.log(`wrote ${out} (${meta.width}x${meta.height})`);
