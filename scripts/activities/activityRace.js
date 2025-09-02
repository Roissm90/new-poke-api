// activityRace.js
export async function initRace($gameboard, $startBtn, $statusNode) {
  const $ = window.jQuery;

  const POKEMON_COUNT = 4;
  const OBSTACLES_PER_LANE = 3;
  const FINISH_LINE = 90;
  const TICK_BASE = 0.1;

  let pokemons = [];
  let runners = [];
  let refs = {};
  let selectedPokemon = null;
  let rafId = null;

  function setStatus(text) {
    $statusNode.text(text);
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }

  async function fetchPokemon(id) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) throw new Error(`Error al obtener Pokémon ${id}`);
    return res.json();
  }

  // Pokémon equilibrados con velocidad ±1
  async function getBalancedPokemons(count = POKEMON_COUNT) {
    const maxId = 898;
    const selected = [];
    const usedIds = new Set();

    const baseSpeed = 50 + Math.random() * 50; // velocidad base
    const minSpeed = baseSpeed - 1;
    const maxSpeed = baseSpeed + 1;

    while (selected.length < count) {
      const id = 1 + Math.floor(Math.random() * maxId);
      if (usedIds.has(id)) continue;
      try {
        const p = await fetchPokemon(id);
        const speed = p.stats.find(s => s.stat.name === "speed").base_stat;
        if (speed >= minSpeed && speed <= maxSpeed) {
          selected.push({
            id: p.id,
            name: p.name,
            sprite: p.sprites.back_default,
            speed: speed
          });
          usedIds.add(id);
        }
      } catch {}
    }

    console.log("Pokémon seleccionados y velocidades equilibradas:");
    selected.forEach(p => console.log(`${p.name} - ${p.speed}`));

    return selected;
  }

  function buildTrack() {
    $gameboard.empty();
    refs = {};

    pokemons.forEach(p => {
      const $lane = $('<div class="lane"></div>').appendTo($gameboard);
      const $runner = $(`<div class="runner"><img src="${p.sprite}"></div>`).appendTo($lane);
      const $overlay = $('<div class="fallen-overlay">CAÍDO</div>').appendTo($lane);

      const obstacles = [];
      for (let i = 0; i < OBSTACLES_PER_LANE; i++) {
        const pos = Math.random() * 70 + 10;
        const $obs = $('<div class="obstacle"></div>').appendTo($lane).css({ bottom: `${pos}%` });
        obstacles.push({ pos, $el: $obs, hit: false });
      }

      // Selección de Pokémon por clic
      $lane.on("click", () => {
        $(".lane").removeClass("selected");
        $lane.addClass("selected");
        selectedPokemon = p.id;
        $startBtn.prop("disabled", false);
        setStatus(`Seleccionado: ${capitalize(p.name)}, pulsa Iniciar carrera.`);
      });

      refs[p.id] = { $lane, $runner, $overlay, obstacles };
    });
  }

  function createGame() {
    const maxSpeed = Math.max(...pokemons.map(p => p.speed));

    runners = pokemons.map(p => ({
      id: p.id,
      y: 0,
      speed: p.speed,
      fallen: false,
      recoverUntil: 0
    }));

    function tick() {
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
        if (r.y >= FINISH_LINE) { r.y = FINISH_LINE; finished = true; }
        ref.$runner.css("bottom", `${r.y}%`);
      });

      if (finished) {
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

    return { start: () => { rafId = requestAnimationFrame(tick); }, stop: () => cancelAnimationFrame(rafId) };
  }

  setStatus("Cargando Pokémon...");
  pokemons = await getBalancedPokemons();
  buildTrack();

  const game = createGame();

  $startBtn.on("click", () => {
    if (!selectedPokemon) return;
    game.start();
    setStatus("Carrera en curso...");
    $startBtn.prop("disabled", true);
  });

  $startBtn.prop("disabled", true);
  setStatus("Selecciona un Pokémon haciendo clic en su carril");
}
