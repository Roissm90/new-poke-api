$(window).on("load", function () {
    window.location.href = "../index.html";
});

/*
// ../scripts/teams.js
// Team Builder Pokémon usando JSON local de sets
let equipo = [];
let smogonData = {};

// Tabla de efectividades por tipo (simplificada)
const tablaTipos = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, ghost: 0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5, psychic: 2, dark: 2 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, fairy: 0.5, dark: 0.5 },
  steel: { rock: 2, ice: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
};

$(window).on("load", function () {
  // Cargar JSON local de sets
  $.getJSON("../data/gen9.json", function (data) {
    smogonData = data;
  }).fail(function () {
    alert("No se pudo cargar el archivo gen9.json");
  });

  // Añadir Pokémon al equipo
  $("#add-pokemon").on("click", function () {
    const nombre = $("#pokemon-search").val().trim();
    if (!nombre) return alert("Introduce un Pokémon");
    if (equipo.length >= 6) return alert("Máximo 6 Pokémon por equipo");
    agregarPokemon(nombre);
  });

  // Analizar equipo
  $("#analyze-team").on("click", analizarEquipo);

  // Limpiar equipo
  $("#clear-team").on("click", limpiarEquipo);

  // Enter para buscar Pokémon
  $("#pokemon-search").on("keypress", function (e) {
    if (e.which === 13) $("#add-pokemon").click();
  });
});

// ===============================
// Funciones principales
// ===============================
function agregarPokemon(nombre) {
  const nombreNormalizado = normalizePokemonName(nombre);
  const normalizedId = nombreNormalizado.replace(/[^a-zA-Z0-9_-]/g, "_");

  if (equipo.includes(nombreNormalizado)) return alert("Ya está en tu equipo");
  equipo.push(nombreNormalizado);

  // Mostrar tarjeta del Pokémon
  const card = $(`
    <div class="pokemon-card" data-name="${nombreNormalizado}">
      <h3>${nombreNormalizado}</h3>
      <div id="strategy-${normalizedId}">Cargando sets competitivos...</div>
      <button class="btn-remove" data-name="${nombreNormalizado}">Eliminar</button>
    </div>
  `);
  $("#team-container").append(card);

  card.find(".btn-remove").on("click", function () {
    eliminarPokemon($(this).data("name"));
  });

  mostrarSets(nombreNormalizado);
}

function eliminarPokemon(nombre) {
  equipo = equipo.filter((p) => p !== nombre);
  const normalizedId = nombre.replace(/[^a-zA-Z0-9_-]/g, "_");
  $(`.pokemon-card[data-name="${nombre}"]`).remove();
  $(`#strategy-${normalizedId}`).remove();
}

function limpiarEquipo() {
  equipo = [];
  $("#team-container").empty();
  $("#analysis-container").empty();
}

// ===============================
// Mostrar sets competitivos
// ===============================
function mostrarSets(nombre) {
  const normalizedId = nombre.replace(/[^a-zA-Z0-9_-]/g, "_");
  const contenedor = $(`#strategy-${normalizedId}`);
  contenedor.empty();

  const nombreNormalizado = normalizePokemonName(nombre);

  if (!smogonData[nombreNormalizado]) {
    contenedor.html("<p>No se encontraron sets competitivos para este Pokémon.</p>");
    return;
  }

  const setsPorTier = smogonData[nombreNormalizado];

  for (const tier in setsPorTier) {
    const sets = setsPorTier[tier];
    for (const setName in sets) {
      const set = sets[setName];
      const moves = set.moves
        .map(m => Array.isArray(m) ? m.join(" / ") : m)
        .join(", ");
      const evs = set.evs
        ? `HP: ${set.evs.hp || 0}, Atk: ${set.evs.atk || 0}, Def: ${set.evs.def || 0}, Spa: ${set.evs.spa || 0}, Spd: ${set.evs.spd || 0}, Spe: ${set.evs.spe || 0}`
        : "—";

      const items = Array.isArray(set.item) ? set.item.join(" / ") : set.item || "—";

      const html = `
        <div class="set bg-color-dark" style="margin-bottom: 1rem;">
          <h4 class="text-color-light-third">${setName} (${tier})</h4>
          <p class="text-color-light-two"><strong>Habilidad:</strong> ${set.ability || "—"}</p>
          <p class="text-color-light-two"><strong>Objeto:</strong> ${items}</p>
          <p class="text-color-light-two"><strong>Naturaleza:</strong> ${set.nature || "—"}</p>
          <p class="text-color-light-two"><strong>EVs:</strong> ${evs}</p>
          <p class="text-color-light-two"><strong>Movimientos:</strong> ${moves}</p>
        </div>
      `;
      contenedor.append(html);
    }
  }
}

// ===============================
// Analizar debilidades del equipo
// ===============================
function analizarEquipo() {
  if (!equipo.length) return alert("Añade Pokémon primero");

  let debilidadesGlobales = {};
  let resumen = "<h2>Análisis del equipo</h2>";

  const promesas = equipo.map(nombre => {
    return fetch(`https://pokeapi.co/api/v2/pokemon/${nombre.toLowerCase()}`)
      .then(res => res.json())
      .then(data => {
        const tipos = data.types.map(t => t.type.name);

        let debilidades = {};
        Object.keys(tablaTipos).forEach(tipoAtaque => {
          let mult = 1;
          tipos.forEach(tipoDef => {
            mult *= tablaTipos[tipoAtaque][tipoDef] || 1;
          });
          if (mult > 1) debilidades[tipoAtaque] = mult;
        });

        Object.keys(debilidades).forEach(tipo => {
          debilidadesGlobales[tipo] = (debilidadesGlobales[tipo] || 0) + 1;
        });

        resumen += `<div><h3>${nombre}</h3>`;
        resumen += `<p>Tipos: ${tipos.join(", ")}</p>`;
        resumen += `<p><strong>Debilidades:</strong> ${Object.keys(debilidades).join(", ")}</p>`;
        resumen += "</div>";
      });
  });

  Promise.all(promesas).then(() => {
    resumen += "<h3>Debilidades acumuladas del equipo</h3><ul>";
    for (const [tipo, cnt] of Object.entries(debilidadesGlobales)) {
      resumen += `<li>${tipo}: ${cnt} Pokémon débiles</li>`;
    }
    resumen += "</ul>";
    $("#analysis-container").html(resumen);
  });
}

// ===============================
// Normalización de nombres
// ===============================
function normalizePokemonName(text) {
  if (!text) return "";
  let name = text.trim().toLowerCase();
  name = name.replace(/\s+/g, "-");
  name = name.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("-");
  return name;
}
*/