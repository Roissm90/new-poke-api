// Traducción de tipos de Pokémon
const tiposES = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  grass: "Planta",
  electric: "Eléctrico",
  ice: "Hielo",
  fighting: "Lucha",
  poison: "Veneno",
  ground: "Tierra",
  flying: "Volador",
  psychic: "Psíquico",
  bug: "Bicho",
  rock: "Roca",
  ghost: "Fantasma",
  dragon: "Dragón",
  dark: "Siniestro",
  steel: "Acero",
  fairy: "Hada",
  shadow: "Siniestro",
};

window.onload = function () {
  const container = $(".sctn-prepare .container-grid");
  container.empty();

  const pkmnStr = localStorage.getItem("pokemonToFight");
  const pkmnCPUstr = localStorage.getItem("pokemonToFightCPU");

  if (!pkmnStr || !pkmnCPUstr) {
    container.append("<p>No hay Pokémon seleccionados.</p>");
    return;
  }

  const player = JSON.parse(pkmnStr);
  const cpu = JSON.parse(pkmnCPUstr);

  console.log("Jugador:", player);
  console.log("CPU:", cpu);

  // -------------------- Jugador --------------------
  const playerDiv = $(`
    <div class="pokemon-container player">
      <h2>${player.name}</h2>
      <img src="${player.image}" alt="${player.name}" />
      <p class="tooltip text-color-dark-third">Elige 4 ataques</p>
      <div class="moves moves-player"></div>
    </div>
  `);
  container.append(playerDiv);

  renderMoves(player, playerDiv.find(".moves-player"), true);

  // -------------------- CPU --------------------
  const cpuDiv = $(`
    <div class="pokemon-container cpu">
      <h2>${cpu.name}</h2>
      <img src="${cpu.image}" alt="${cpu.name}" />
      <div class="moves moves-cpu"></div>
    </div>
  `);
  container.append(cpuDiv);

  renderMoves(cpu, cpuDiv.find(".moves-cpu"), false);
};

function renderMoves(pokemon, container, isPlayer) {
  container.empty();

  // Solo movimientos físicos o especiales
  let moves = pokemon.moves.filter(
    (m) =>
      (m.power !== null && m.damage_class === "physical") ||
      m.damage_class === "special"
  );

  if (moves.length === 0) {
    container.append(
      "<p>Este Pokémon no tiene movimientos físicos ni especiales.</p>"
    );
    return;
  }

  if (!isPlayer) {
    // CPU: elegir 4 aleatorios
    moves = moves.sort(() => 0.5 - Math.random()).slice(0, 4);
    console.log(`Movimientos CPU (${pokemon.name}):`, moves);
  }

  let selected = [];

  moves.forEach((move) => {
    if (move.power) {
      const moveDiv = $(`
        <div class="move move-item bg-color-dark-third">
        <h4 class="text-color-light-third">${move.nameES}</h4>
            <ul class="list-stats-move">
                <li class="text-color-light-third">Potencia: ${
                  move.power ?? "—"
                }</li>
                <li class="text-color-light-third">PP: ${move.pp}</li>
                <li class="text-color-light-third">Precisión: ${
                  move.accuracy ?? "No falla"
                }</li>
                <li class="text-color-light-third">Tipo: ${
                  move.type ? tiposES[move.type] || move.type : "Normal"
                }</li>
            </ul>
        </div>
      `);

      // Guardamos el objeto completo en data
      moveDiv.data("moveObject", move);

      moveDiv.find(".list-stats-move").show();

      if (isPlayer) {
        moveDiv.on("click", function () {
          const moveSelected = $(this).hasClass("selected");

          if (moveSelected) {
            selected = selected.filter((m) => m !== move);
            $(this).removeClass("selected");
          } else {
            if (selected.length >= 4) return;
            selected.push(move);
            $(this).addClass("selected");

            if (selected.length === 4) {
              mostrarModal(pokemon, selected);
            }
          }

          console.log("Movimientos seleccionados jugador:", selected);
        });
      }

      container.append(moveDiv);
    }
  });
}

function mostrarModal(pokemon, selectedMoves) {
  const modal = $(".modal-prepare");

  modal.find(".title").text(pokemon.name);
  modal.find(".picture").attr("src", pokemon.image).attr("alt", pokemon.name);

  const listMoves = modal.find(".list-moves-selected");
  listMoves.empty();

  selectedMoves.forEach((move) => {
    if (move.power) {
      const moveItem = $(`
      <li>
        <ul class="bg-color-light list-move-modal">
          <li class="text-color-dark-third">${move.nameES}</li>
          <li class="first-hide text-color-dark-third">Potencia: ${
            move.power ?? "—"
          }</li>
          <li class="first-hide text-color-dark-third">PP: ${move.pp}</li>
          <li class="first-hide text-color-dark-third">Precisión: ${
            move.accuracy ?? "No falla"
          }</li>
          <li class="first-hide text-color-dark-third type-${
            move.type
          } type"> ${tiposES[move.type] ? tiposES[move.type] : "-"}</li>
        </ul>
      </li>
    `);
      listMoves.append(moveItem);

      moveItem.find(".first-hide").hide();
      moveItem.find(".list-move-modal").click(function () {
        $(this).children().not(".first-hide").toggleClass('rotate-arrow');
        $(this).children(".first-hide").slideToggle(500);
      });
    }
  });

  const statsList = modal.find(".list-stats");
  statsList.empty();

  if (pokemon.stats && Array.isArray(pokemon.stats)) {
    pokemon.stats.forEach((stat) => {
      const statsES = {
        hp: "PS",
        attack: "Ataque",
        defense: "Defensa",
        "special-attack": "At. Esp.",
        "special-defense": "Def. Esp.",
        speed: "Velocidad",
      };
      const statName = statsES[stat.name] || stat.name;
      const statItem = $(
        `<li class="text-color-dark-third">${statName}: <strong>${stat.base}</strong></li>`
      );
      statsList.append(statItem);
    });
  } else {
    statsList.append("<li>No hay estadísticas disponibles.</li>");
  }

  modal.addClass("show");

  modal.on("click", function (e) {
    if (e.target === this) {
      modal.removeClass("show");
    }
  });

  $(".close-modal").on("click", function () {
    modal.removeClass("show");
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape") modal.removeClass("show");
  });
}

function guardarMovimientosYComenzar() {
  const selectedPlayerMoves = [];
  $(".moves-player .move.selected").each(function () {
    selectedPlayerMoves.push($(this).data("moveObject"));
  });

  const selectedCPUMoves = [];
  $(".moves-cpu .move").each(function () {
    selectedCPUMoves.push($(this).data("moveObject"));
  });

  localStorage.setItem("playerMoves", JSON.stringify(selectedPlayerMoves));
  localStorage.setItem("cpuMoves", JSON.stringify(selectedCPUMoves));

  window.location.href = "battlegame.html";
}

// Asociar la función al botón de comenzar
$("#btnStart").on("click", function (e) {
  e.preventDefault();
  guardarMovimientosYComenzar();
});
