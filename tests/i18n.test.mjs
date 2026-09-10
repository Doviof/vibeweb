import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const load = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const source = await load("../src/content/journal.json");
const zh = await load("../src/i18n/locales/zh.json");
const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

for (const language of ["zh", "en", "ja"]) {
  const messages = await load(`../src/i18n/locales/${language}.json`);
  test(`${language}: UI messages are complete and interpolation parameters match`, () => {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(zh).sort());
    for (const [key, text] of Object.entries(messages)) {
      assert.equal(typeof text, "string", key);
      assert.ok(text.trim(), key);
      assert.deepEqual(placeholders(text), placeholders(zh[key]), key);
    }
  });
}

for (const language of ["en", "ja"]) {
  const translation = await load(
    `../src/content/translations/${language}.json`,
  );
  test(`${language}: every record, note, category and site paragraph is translated`, () => {
    assert.deepEqual(
      Object.keys(translation.entries).sort(),
      source.entries.map((item) => item.id).sort(),
    );
    assert.deepEqual(
      Object.keys(translation.notes).sort(),
      source.notes.map((item) => item.id).sort(),
    );
    assert.deepEqual(
      Object.keys(translation.categories).sort(),
      [...new Set(source.entries.map((item) => item.category))].sort(),
    );
    assert.deepEqual(Object.keys(translation.site).sort(), [
      "about",
      "name",
      "tagline",
    ]);
    assert.equal(translation.site.about.length, source.site.about.length);
    for (const kind of ["entries", "notes"]) {
      for (const original of source[kind]) {
        const translated = translation[kind][original.id];
        const fields =
          kind === "entries"
            ? ["title", "place", "alt", "body"]
            : original.image
              ? ["title", "body", "alt"]
              : ["title", "body"];
        assert.deepEqual(
          Object.keys(translated).sort(),
          fields.sort(),
          `${kind}/${original.id}`,
        );
        assert.equal(translated.body.length, original.body.length, original.id);
      }
    }
    const inspect = (value) => {
      if (typeof value === "string") {
        assert.ok(value.trim(), "Empty translation");
        assert.ok(!/TODO|TBD|\{\w+\}/.test(value), "Unfinished translation");
        if (language === "en")
          assert.ok(
            !/\p{Script=Han}/u.test(value),
            "Chinese text in English content",
          );
      } else Object.values(value).forEach(inspect);
    };
    inspect(translation);
  });
}
