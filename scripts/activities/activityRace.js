// activityRace.js
import { createPokedexData, PAGE_SIZE } from "../pokedex-data.mjs";

const data = createPokedexData();
let disposeRace = () => {};

export async function initRace($gameboard, $startBtn, $statusNode) {
  const $ = window.jQuery;
  disposeRace();
  let cancelled = false;
  let running = false;

  const POKEMON_COUNT = 4;
  const OBSTACLES_PER_LANE = 3;
  const TICK_BASE = 0.1;

  let pokemons = [];
  let runners = [];
  let refs = {};
  let selectedPokemon = null;
  let rafId = null;
  disposeRace = () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    $startBtn.off("click.race");
  };
  $startBtn.prop("disabled", true);
  $gameboard.empty();

  function setStatus(text) {
    if (!cancelled) $statusNode.text(text);
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }

  async function fetchPokemon(id) {
    return data.request(`https://pokeapi.co/api/v2/pokemon/${id}`);
  }

  // Pokémon equilibrados con velocidad ±1
  async function getBalancedPokemons(count = POKEMON_COUNT) {
    const maxId = 898;
    const selected = [];
    const available = [];
    const ids = Array.from({ length: maxId }, (_, index) => index + 1);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [ids[index], ids[target]] = [ids[target], ids[index]];
    }
    const baseSpeed = 50 + 5 * Math.floor(Math.random() * 11);
    const minSpeed = baseSpeed - 1;
    const maxSpeed = baseSpeed + 1;
    for (let offset = 0; offset < ids.length; offset += PAGE_SIZE) {
      if (cancelled) return [];
      const results = await Promise.allSettled(ids.slice(offset, offset + PAGE_SIZE).map(fetchPokemon));
      if (cancelled) return [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const pokemon = result.value;
        const speed = pokemon.stats.find(stat => stat.stat.name === "speed").base_stat;
        const runner = { id: pokemon.id, name: pokemon.name, sprite: pokemon.sprites.back_default || pokemon.sprites.front_default || pokemon.sprites.other["official-artwork"].front_default, speed };
        available.push(runner);
        if (speed >= minSpeed && speed <= maxSpeed) {
          selected.push(runner);
          if (selected.length === count) return selected;
        }
      }
      setStatus(`Cargando corredores: ${selected.length}/${count}`);
    }
    if (available.length < count) throw new Error("Not enough runners");
    return available.sort((first, second) => Math.abs(first.speed - baseSpeed) - Math.abs(second.speed - baseSpeed)).slice(0, count);
  }

  function buildTrack() {
    $gameboard.empty();
    refs = {};

    pokemons.forEach(p => {
      const $lane = $('<div class="lane" role="button" tabindex="0" aria-pressed="false"></div>').attr("aria-label", `Elegir ${capitalize(p.name)}`).appendTo($gameboard);
      const $runner = $(`<div class="runner"><img src="${p.sprite}" alt="${p.name}"></div>`).appendTo($lane);
      const $overlay = $('<div class="fallen-overlay">CAÍDO</div>').appendTo($lane);

      const obstacles = [];
      for (let i = 0; i < OBSTACLES_PER_LANE; i++) {
        const pos = Math.random() * 70 + 10;
        const $obs = $('<div class="obstacle"></div>').appendTo($lane).css({ bottom: `${pos}%` });
        obstacles.push({ pos, $el: $obs, hit: false });
      }

      // Selección de Pokémon por clic
      $lane.on("click", () => {
        if (running || cancelled) return;
        $gameboard.find(".lane").removeClass("selected").attr("aria-pressed", "false");
        $lane.addClass("selected").attr("aria-pressed", "true");
        selectedPokemon = p.id;
        $startBtn.prop("disabled", false);
        setStatus(`Seleccionado: ${capitalize(p.name)}`);
      });
      $lane.on("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $lane.trigger("click"); }
      });

      refs[p.id] = { $lane, $runner, $overlay, obstacles };
    });
  }

  function createGame() {
    const maxSpeed = Math.max(...pokemons.map(p => p.speed));
    let finishLine = 80;

    function tick() {
      if (cancelled || !running) return;
      let finished = false;

      runners.forEach(r => {
        const ref = refs[r.id];

        if (r.fallen) {
          if (performance.now() >= r.recoverUntil) r.fallen = false;
          else return;
        }

        // Obstáculos
        const hit = ref.obstacles.some(o => !o.hit && Math.abs(r.y - o.pos) < 3);
        if (hit && Math.random() < 0.6) {
          r.fallen = true;
          r.recoverUntil = performance.now() + 700 + Math.random() * 800;
          ref.$runner.addClass("fallen");
          ref.$overlay.show();
          ref.obstacles.forEach(o => { if (Math.abs(r.y - o.pos) < 3) o.hit = true; });
          setTimeout(() => { ref.$runner.removeClass("fallen"); ref.$overlay.hide(); }, r.recoverUntil - performance.now());
          return;
        }

        r.y += (r.speed / maxSpeed) * TICK_BASE;
        if (r.y >= finishLine) { r.y = finishLine; finished = true; }
        ref.$runner.css("bottom", `${r.y}%`);
      });

      if (finished) {
        running = false;
        cancelAnimationFrame(rafId);
        const winner = runners.reduce((a, b) => (a.y >= b.y ? a : b));
        const winnerName = pokemons.find(p => p.id === winner.id).name;
        setStatus(`¡Ganador: ${capitalize(winnerName)}!`);

        if (selectedPokemon && +selectedPokemon === +winner.id) {

        }
        else if (selectedPokemon) {
            
        }

        $startBtn.prop("disabled", false);
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    return {
      start() {
        finishLine = Math.min(90, 100 - 60 / $gameboard.height() * 100 - 3);
        runners = pokemons.map(pokemon => ({ id: pokemon.id, y: 0, speed: pokemon.speed, fallen: false, recoverUntil: 0 }));
        Object.values(refs).forEach(ref => {
          ref.$runner.css("bottom", "0%").removeClass("fallen");
          ref.$overlay.hide();
          ref.obstacles.forEach(obstacle => { obstacle.hit = false; });
        });
        running = true;
        rafId = requestAnimationFrame(tick);
      },
    };
  }

  setStatus("Cargando Pokémon...");
  try {
    pokemons = await getBalancedPokemons();
  } catch {
    setStatus("No se pudieron cargar los corredores. Pulsa Reiniciar para reintentar.");
    return;
  }
  if (cancelled) return;
  buildTrack();

  const game = createGame();

  $startBtn.off("click.race").on("click.race", () => {
    if (!selectedPokemon || running || cancelled) return;
    game.start();
    setStatus("Carrera en curso...");
    $startBtn.prop("disabled", true);
  });

  $startBtn.prop("disabled", true);
  setStatus("Carrera lista");
}
