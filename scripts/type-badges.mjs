import { TYPE_NAMES } from "./pokedex-data.mjs";

const assetRoot = new URL("../assets/types/", import.meta.url);
const normalized = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const typeKeys = new Map(Object.entries(TYPE_NAMES).flatMap(([key, label]) => [[key, key], [normalized(label), key]]));
typeKeys.set("shadow", "dark");

export function typeKey(value) {
  return typeKeys.get(normalized(value)) || null;
}

export function typeBadgeMarkup(value) {
  const key = typeKey(value);
  if (!key) return "";
  const label = TYPE_NAMES[key];
  const source = new URL(`${key}.svg`, assetRoot).href;
  return `<span class="type-icon" data-type="${key}" role="img" aria-label="${label}" title="${label}"><img src="${source}" alt="" aria-hidden="true" width="24" height="24" decoding="async"></span>`;
}