import { createPokedexData } from "./pokedex-data.mjs";
import { compareMoves } from "./catalog-order.mjs";

const normalize = (value) => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterMoves(catalog, search) {
  const query = normalize(search);
  const numeric = /^(?:mt\s*)?(\d+)$/.exec(query);
  return catalog.filter(move => !query ||
    (numeric ? move.machineNumber === Number(numeric[1]) :
      normalize(move.name).includes(query) || normalize(move.nameEN).includes(query)));
}

export function createMovesData(fetcher = fetch) {
  const loader = createPokedexData(fetcher);
  return {
    async catalog() {
      const index = await loader.request(new URL("../data/moves-index.json", import.meta.url).href, true);
      if (!Array.isArray(index.moves)) throw new Error("Invalid moves index");
      return { ...index, moves: [...index.moves].sort(compareMoves) };
    },
    async detail(entry) {
      const detail = await loader.request(`https://pokeapi.co/api/v2/move/${entry.id}/`, true);
      return {
        ...entry,
        name: detail.names?.find(name => name.language.name === "es")?.name || entry.name,
        type: detail.type.name, power: detail.power, pp: detail.pp, accuracy: detail.accuracy,
        damage_class: detail.damage_class.name,
        effect: detail.effect_entries?.find(effect => effect.language.name === "es")?.effect ||
          detail.flavor_text_entries?.find(text => text.language.name === "es")?.flavor_text?.replace(/\s+/g, " ") || "",
      };
    },
  };
}