export const PAGE_SIZE = 20;
export const TYPE_NAMES = {
  normal: "Normal", fighting: "Lucha", flying: "Volador", poison: "Veneno",
  ground: "Tierra", rock: "Roca", bug: "Bicho", ghost: "Fantasma",
  steel: "Acero", fire: "Fuego", water: "Agua", grass: "Planta",
  electric: "Eléctrico", psychic: "Psíquico", ice: "Hielo", dragon: "Dragón",
  dark: "Siniestro", fairy: "Hada",
};

export function filterCatalog(catalog, search = "", typeIds = null) {
  const query = search.trim().toLowerCase();
  return catalog.filter((pokemon) =>
    (!typeIds || typeIds.has(pokemon.id)) &&
    (pokemon.name.includes(query) || String(pokemon.id).includes(query))
  );
}

export function createPokedexData(fetcher = fetch, concurrency = 6) {
  const cache = new Map();
  const queue = [];
  let active = 0;

  function drain() {
    while (active < concurrency && queue.length) {
      const job = queue.shift();
      active += 1;
      Promise.resolve().then(job.run).then(job.resolve, job.reject).finally(() => {
        active -= 1;
        drain();
      });
    }
  }

  function request(url, priority = false) {
    if (cache.has(url)) return cache.get(url);
    const promise = new Promise((resolve, reject) => {
      const job = {
        resolve, reject,
        async run() {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          try {
            const response = await fetcher(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
          } finally {
            clearTimeout(timer);
          }
        },
      };
      if (priority) queue.unshift(job);
      else queue.push(job);
      drain();
    });
    cache.set(url, promise);
    promise.catch(() => cache.delete(url));
    return promise;
  }

  async function catalog() {
    const data = await request("https://pokeapi.co/api/v2/pokemon?limit=1025");
    return data.results.map((pokemon) => ({
      ...pokemon,
      id: Number(pokemon.url.split("/").filter(Boolean).pop()),
    }));
  }

  async function totals() {
    const resources = { pokemon: "pokemon-species", generations: "generation", types: "type" };
    const excludedTypes = new Set(["stellar", "unknown", "shadow"]);
    const entries = await Promise.all(Object.entries(resources).map(async ([key, resource]) => {
      let url = `https://pokeapi.co/api/v2/${resource}?limit=${key === "types" ? 100 : 1}`;
      let count = 0;
      do {
        const data = await request(url, true);
        if (!Number.isSafeInteger(data.count) || data.count < 0) {
          cache.delete(url);
          throw new Error(`Invalid ${resource} count`);
        }
        if (key === "types") {
          if (!Array.isArray(data.results) || data.results.some(type => typeof type.name !== "string")) {
            cache.delete(url);
            throw new Error("Invalid type list");
          }
          count += data.results.filter(type => !excludedTypes.has(type.name)).length;
          url = data.next;
        } else {
          count = data.count;
          url = null;
        }
      } while (url);
      return [key, count];
    }));
    return Object.fromEntries(entries);
  }

  async function typeIds(type) {
    const data = await request(`https://pokeapi.co/api/v2/type/${type}`, true);
    return new Set(data.pokemon.map(({ pokemon }) =>
      Number(pokemon.url.split("/").filter(Boolean).pop())
    ));
  }

  async function pokemon(entry, priority = false) {
    const info = await request(entry.url, priority);
    return {
      id: info.id, name: info.name,
      image: info.sprites.other["official-artwork"].front_default || info.sprites.front_default,
      types: info.types.map(({ type }) => TYPE_NAMES[type.name] || type.name),
      classTypePrimary: info.types[0].type.name,
      classTypeSecondary: info.types[1]?.type.name || null,
      abilities: info.abilities.map(({ ability }) => ability.name),
      stats: info.stats.map((stat) => ({ name: stat.stat.name, base: stat.base_stat })),
      weight: info.weight, height: info.height, description: "", cries: info.cries,
      abilityUrls: info.abilities.map(({ ability }) => ability.url),
    };
  }

  async function detail(entry) {
    const result = await pokemon(entry, true);
    const abilities = await Promise.all(result.abilityUrls.map(async (url, index) => {
      try {
        const data = await request(url, true);
        return data.names.find(({ language }) => language.name === "es")?.name || result.abilities[index];
      } catch {
        return result.abilities[index];
      }
    }));
    return { ...result, abilities };
  }

  return { catalog, totals, typeIds, pokemon, detail, request };
}