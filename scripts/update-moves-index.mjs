import { parse } from "csv-parse/sync";
import { writeFile } from "node:fs/promises";
import { compareMoves, machineNumber } from "./catalog-order.mjs";

const source = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const files = ["languages", "version_groups", "types", "items", "moves", "move_names", "machines"];
const tables = Object.fromEntries(await Promise.all(files.map(async (name) => {
  const response = await fetch(`${source}${name}.csv`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return [name, parse(await response.text(), { columns: true, skip_empty_lines: true })];
})));
const language = tables.languages.find(row => row.iso639 === "es");
const version = tables.version_groups.find(row => row.identifier === "scarlet-violet");
if (!language || !version) throw new Error("Missing Spanish or Scarlet/Violet catalog");
const names = new Map(tables.move_names.filter(row => row.local_language_id === language.id).map(row => [row.move_id, row.name]));
const types = new Map(tables.types.map(row => [row.id, row.identifier]));
const items = new Map(tables.items.map(row => [row.id, row.identifier]));
const machines = new Map();
for (const row of tables.machines) {
  if (row.version_group_id !== version.id) continue;
  const number = machineNumber(items.get(row.item_id) || "");
  if (number !== null) machines.set(row.move_id, Math.min(machines.get(row.move_id) ?? Infinity, number));
}
const moves = tables.moves.filter(row => names.has(row.id)).map(row => ({
  id: Number(row.id), name: names.get(row.id), nameEN: row.identifier,
  type: types.get(row.type_id), machineNumber: machines.get(row.id) ?? null,
})).sort(compareMoves);
const index = { versionGroup: version.identifier, versionLabel: "Escarlata/P\u00farpura", source, updatedAt: new Date().toISOString(), moves };
await writeFile(new URL("../data/moves-index.json", import.meta.url), `${JSON.stringify(index)}\n`);
console.log(`Generated ${moves.length} Spanish moves, ${machines.size} TM assignments`);