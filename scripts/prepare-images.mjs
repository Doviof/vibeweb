import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname, parse } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const journal = JSON.parse(
  await readFile(resolve(root, "src/content/journal.json"), "utf8"),
);
const paths = new Set(
  [...journal.entries, ...journal.notes]
    .map((item) => item.image)
    .filter(Boolean),
);
for (const image of paths) {
  const input = resolve(root, "public", image);
  const { name, dir } = parse(input);
  for (const width of [480, 960, 1920]) {
    await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(resolve(dir, `${name}-${width}.webp`));
  }
}
// A small raster asterisk echoes the site's typographic mark.
const size = 64;
const pixels = Buffer.alloc(size * size * 3);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const dx = x - 31.5,
      dy = y - 31.5;
    const inside = Math.hypot(dx, dy) < 21;
    const line =
      inside &&
      (Math.abs(dx) < 1.5 ||
        Math.abs(dy - dx * 0.577) < 1.8 ||
        Math.abs(dy + dx * 0.577) < 1.8);
    const color = line ? [189, 203, 184] : [20, 22, 21];
    for (let c = 0; c < 3; c++) pixels[(y * size + x) * 3 + c] = color[c];
  }
await mkdir(dirname(resolve(root, "public/favicon.png")), { recursive: true });
await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
  .png()
  .toFile(resolve(root, "public/favicon.png"));
console.log(
  `Prepared responsive images for ${paths.size} photos and favicon.png`,
);
