import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const journal = JSON.parse(
  await readFile(resolve(root, "src/content/journal.json"), "utf8"),
);

test("site identity and at least one featured record exist", () => {
  assert.ok(journal.site.name && journal.site.englishName);
  assert.ok(journal.entries.some((entry) => entry.featured));
  assert.ok(journal.site.about.length > 0);
});

test("record IDs and dates are valid, required fields are populated", () => {
  const ids = new Set();
  for (const item of [...journal.entries, ...journal.notes]) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!ids.has(item.id), `Duplicate ID: ${item.id}`);
    ids.add(item.id);
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(
      new Date(`${item.date}T00:00:00Z`).toISOString().slice(0, 10),
      item.date,
    );
    assert.ok(item.title.trim());
    assert.ok(
      item.body.length &&
        item.body.every((p) => typeof p === "string" && p.trim()),
    );
  }
  for (const entry of journal.entries) {
    assert.ok(entry.category && entry.place && entry.alt);
    assert.equal(typeof entry.featured, "boolean");
  }
});

test("all photos are local, accessible, and have alternative text", async () => {
  for (const item of [...journal.entries, ...journal.notes]) {
    if (!item.image) continue;
    assert.match(item.image, /^images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/);
    assert.ok(item.alt?.trim());
    await access(resolve(root, "public", item.image));
  }
});

test("contact address is optional but must be a plain email if supplied", () => {
  if (journal.site.email)
    assert.match(journal.site.email, /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/);
});
