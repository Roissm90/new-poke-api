const { randomInt } = require("node:crypto");
const cheerio = require("cheerio");

function addSharePreview(html, { origin, pathname, pokemonId = randomInt(1, 1026) }) {
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("PUBLIC_URL must use HTTP or HTTPS");
  const title = "Pok\u00e9Atlas";
  const description = "Cada generaci\u00f3n. Cada descubrimiento. Un nuevo favorito por encontrar. Explora la Pok\u00e9dex, descubre movimientos y entra en combate.";
  const image = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
  const url = new URL(pathname === "/index.html" ? "/" : pathname, base.origin).href;
  const imageAlt = `Un Pok\u00e9mon por descubrir en ${title}`;
  const $ = cheerio.load(html);
  $('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"], link[rel="canonical"]').remove();
  const head = $("head");
  const metadata = [
    ["name", "description", description],
    ["property", "og:type", "website"],
    ["property", "og:locale", "es_ES"],
    ["property", "og:site_name", title],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", url],
    ["property", "og:image", image],
    ["property", "og:image:secure_url", image],
    ["property", "og:image:type", "image/png"],
    ["property", "og:image:alt", imageAlt],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", image],
    ["name", "twitter:image:alt", imageAlt],
  ];
  metadata.forEach(([attribute, key, content]) => {
    head.append($("<meta>").attr({ [attribute]: key, content }));
  });
  head.append($("<link>").attr({ rel: "canonical", href: url }));
  return $.html();
}

module.exports = { addSharePreview };