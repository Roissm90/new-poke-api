import { createPokedexData, PAGE_SIZE, TYPE_NAMES } from "./pokedex-data.mjs";

export function usableBattleMoves(moves) {
  return Array.isArray(moves) ? moves.filter((move) => move && Number.isFinite(move.power) && move.power > 0 &&
    ["physical", "special"].includes(move.damage_class) && typeof move.type === "string") : [];
}

export function battleMoveName(move) {
  return (move?.nameES || move?.nameEN || move?.name || "Movimiento").replaceAll("-", " ");
}

export function createBattleData(fetcher = fetch) {
  const data = createPokedexData(fetcher);
  const battles = new Map();

  async function loadBattle(entry) {
    const info = await data.request(entry.url, true);
    const pokemon = await data.pokemon(entry, true);
    const [species, abilities, moves] = await Promise.all([
      data.request(info.species.url, true),
      Promise.all(info.abilities.map(async ({ ability }) => {
        const detail = await data.request(ability.url, true);
        return {
          nameES: detail.names.find(({ language }) => language.name === "es")?.name || ability.name,
          nameEN: ability.name,
        };
      })),
      Promise.all(info.moves.filter((move) =>
        move.version_group_details.some((version) => version.move_learn_method.name === "level-up")
      ).map(async (move) => {
        const detail = await data.request(move.move.url, true);
        const level = move.version_group_details.find((version) => version.move_learn_method.name === "level-up");
        return {
          nameES: detail.names.find(({ language }) => language.name === "es")?.name || detail.name,
          nameEN: detail.name,
          type: detail.type.name,
          power: detail.power,
          pp: detail.pp,
          accuracy: detail.accuracy,
          damage_class: detail.damage_class.name,
          level_learned_at: level?.level_learned_at ?? null,
        };
      })),
    ]);
    return {
      id: pokemon.id,
      name: species.names.find(({ language }) => language.name === "es")?.name || pokemon.name,
      description: species.flavor_text_entries.find(({ language }) => language.name === "es")?.flavor_text || "",
      image: pokemon.image,
      abilities,
      types: info.types.map(({ type }) => ({ nameES: TYPE_NAMES[type.name] || type.name, nameEN: type.name })),
      stats: pokemon.stats,
      totalStats: pokemon.stats.reduce((total, stat) => total + stat.base, 0),
      moves,
    };
  }

  function battle(entry) {
    if (!battles.has(entry.id)) {
      const promise = loadBattle(entry);
      battles.set(entry.id, promise);
      promise.catch(() => battles.delete(entry.id));
    }
    return battles.get(entry.id);
  }

  async function opponent(catalog, player, onProgress = () => {}, isCancelled = () => false) {
    const candidates = catalog.filter((entry) => entry.id !== player.id);
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[target]] = [candidates[target], candidates[index]];
    }
    let fallback = null;
    for (let offset = 0; offset < candidates.length; offset += PAGE_SIZE) {
      if (isCancelled()) throw new Error("Selection cancelled");
      const batch = candidates.slice(offset, offset + PAGE_SIZE);
      const results = await Promise.allSettled(batch.map((entry) => data.pokemon(entry, true)));
      if (isCancelled()) throw new Error("Selection cancelled");
      onProgress(Math.min(offset + PAGE_SIZE, candidates.length), candidates.length);
      for (const [index, result] of results.entries()) {
        if (result.status !== "fulfilled") continue;
        fallback ??= batch[index];
        const total = result.value.stats.reduce((sum, stat) => sum + stat.base, 0);
        if (Math.abs(total - player.totalStats) <= 5) return batch[index];
      }
    }
    if (!fallback) throw new Error("No opponent available");
    return fallback;
  }

  return { ...data, battle, opponent };
}