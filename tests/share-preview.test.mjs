import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const cheerio = require("cheerio");
const { addSharePreview } = require("../scripts/share-preview.cjs");
const html = '<!DOCTYPE html><html lang="es"><head><title>Original</title><meta property="og:title" content="Old"><meta name="twitter:image" content="old.png"></head><body><h1>Keep this</h1><script type="module" src="./scripts/index.js"></script></body></html>';

test("share preview is readable without JavaScript with brand, description and the selected Pokemon", () => {
  const $ = cheerio.load(addSharePreview(html, { origin: "https://pokeatlas.example", pathname: "/index.html", pokemonId: 25 }));
  assert.equal($('meta[property="og:title"]').length, 1);
  assert.equal($('meta[property="og:title"]').attr("content"), "Pok\u00e9Atlas");
  assert.match($('meta[property="og:description"]').attr("content"), /Explora la Pok/);
  assert.equal($('meta[property="og:url"]').attr("content"), "https://pokeatlas.example/");
  assert.equal($('link[rel="canonical"]').attr("href"), "https://pokeatlas.example/");
  assert.match($('meta[property="og:image"]').attr("content"), /official-artwork\/25\.png$/);
  assert.equal($('meta[name="twitter:image"]').attr("content"), $('meta[property="og:image"]').attr("content"));
  assert.equal($('meta[name="twitter:card"]').attr("content"), "summary_large_image");
  assert.equal($("h1").text(), "Keep this");
  assert.equal($('script[type="module"]').attr("src"), "./scripts/index.js");
});

test("share preview preserves page paths and replaces old metadata on every response", () => {
  const first = addSharePreview(html, { origin: "https://pokeatlas.example", pathname: "/pages/pokedex.html", pokemonId: 1 });
  const $ = cheerio.load(addSharePreview(first, { origin: "https://pokeatlas.example", pathname: "/pages/pokedex.html", pokemonId: 384 }));
  assert.equal($('meta[property="og:url"]').attr("content"), "https://pokeatlas.example/pages/pokedex.html");
  assert.equal($('meta[property="og:image"]').length, 1);
  assert.equal($('meta[name="twitter:image"]').length, 1);
  assert.match($('meta[property="og:image"]').attr("content"), /\/384\.png$/);
});

test("share preview chooses varied Pokemon within the current catalog and rejects invalid origins", () => {
  const ids = new Set();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const $ = cheerio.load(addSharePreview(html, { origin: "https://pokeatlas.example", pathname: "/" }));
    const id = Number($('meta[property="og:image"]').attr("content").match(/\/(\d+)\.png$/)[1]);
    assert.ok(id >= 1 && id <= 1025);
    ids.add(id);
  }
  assert.ok(ids.size > 1);
  assert.throws(() => addSharePreview(html, { origin: "javascript:alert(1)", pathname: "/" }), /HTTP or HTTPS/);
});