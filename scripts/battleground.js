import { reveal } from "./motion.js";
import { iconMarkup } from "./icons.js";
import { usableBattleMoves, battleMoveName } from "./game-data.mjs";
import { typeBadgeMarkup } from "./type-badges.mjs";

window.onload = function () {
  const container = $(".sctn-prepare .container-grid");
  container.empty();
  container.append('<div class="page-intro"><p class="eyebrow">ZONA DE JUEGO · POKÉATLAS</p><h1 class="section-heading">Arena de combate</h1></div>');

  const pkmnStr = localStorage.getItem("pokemonToFight");
  const pkmnCPUstr = localStorage.getItem("pokemonToFightCPU");

  if (!pkmnStr || !pkmnCPUstr) {
    container.append('<p>No hay Pokémon seleccionados.</p><a href="./game.html" class="btn btn-dark">Elegir Pokémon</a>');
    return;
  }

  const player = JSON.parse(pkmnStr);
  const cpu = JSON.parse(pkmnCPUstr);
  if (!usableBattleMoves(player.moves).length || !usableBattleMoves(cpu.moves).length) {
    container.append('<p>No hay ataques utilizables para este enfrentamiento.</p><a href="./game.html" class="btn btn-dark">Elegir Pokémon</a>');
    return;
  }

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
  let moves = usableBattleMoves(pokemon.moves);

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
  const requiredMoves = Math.min(4, moves.length);
  const $counter = container.parent().find(".tooltip");
  const $confirm = isPlayer ? $('<button type="button" class="btn btn-dark confirm-moves" disabled>Confirmar ataques</button>').appendTo(container.parent()) : null;
  if (isPlayer) {
    $counter.text(`Ataques: 0/${requiredMoves}`);
    $confirm.on("click", () => mostrarModal(pokemon, selected));
  }

  moves.forEach((move) => {
    if (move.power) {
      const moveDiv = $(`
        <div class="move move-item bg-color-dark-third" role="${isPlayer ? "button" : "article"}" tabindex="${isPlayer ? "0" : "-1"}" ${isPlayer ? 'aria-pressed="false"' : ""}>
        <h4 class="text-color-light-third">${battleMoveName(move)}</h4>
            <ul class="list-stats-move">
                <li class="text-color-light-third">Potencia: ${
                  move.power ?? "—"
                }</li>
                <li class="text-color-light-third">PP: ${move.pp}</li>
                <li class="text-color-light-third">Precisión: ${
                  move.accuracy ?? "No falla"
                }</li>
                <li>${typeBadgeMarkup(move.type)}</li>
            </ul>
        </div>
      `);

      // Guardamos el objeto completo en data
      moveDiv.data("moveObject", move);

      moveDiv.find(".list-stats-move").show();

      if (isPlayer) {
        moveDiv.on("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); moveDiv.trigger("click"); }
        });
        moveDiv.on("click", function () {
          const moveSelected = $(this).hasClass("selected");

          if (moveSelected) {
            selected = selected.filter((m) => m !== move);
            $(this).removeClass("selected").attr("aria-pressed", "false");
          } else {
            if (selected.length >= requiredMoves) return;
            selected.push(move);
            $(this).addClass("selected").attr("aria-pressed", "true");
          }
          $counter.text(`Ataques: ${selected.length}/${requiredMoves}`);
          $confirm.prop("disabled", selected.length !== requiredMoves);
          if (selected.length === requiredMoves) mostrarModal(pokemon, selected);

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
          <li><button type="button" class="move-toggle" aria-expanded="false">${battleMoveName(move)}${iconMarkup("expand")}</button></li>
          <li class="first-hide text-color-dark-third">Potencia: ${
            move.power ?? "—"
          }</li>
          <li class="first-hide text-color-dark-third">PP: ${move.pp}</li>
          <li class="first-hide text-color-dark-third">Precisión: ${
            move.accuracy ?? "No falla"
          }</li>
          <li class="first-hide type">${typeBadgeMarkup(move.type)}</li>
        </ul>
      </li>
    `);
      listMoves.append(moveItem);

      moveItem.find(".first-hide").hide();
      moveItem.find(".move-toggle").click(function () {
        $(this).toggleClass("rotate-arrow");
        const $details = moveItem.find(".first-hide");
        $(this).attr("aria-expanded", !$details.first().is(":visible"));
        if ($details.first().is(":visible")) $details.hide();
        else reveal($details);
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

  if (!selectedPlayerMoves.length || !selectedCPUMoves.length) {
    $(".modal-prepare .title").text("Faltan ataques para comenzar");
    return;
  }

  localStorage.setItem("playerMoves", JSON.stringify(selectedPlayerMoves));
  localStorage.setItem("cpuMoves", JSON.stringify(selectedCPUMoves));

  window.location.href = "battlegame.html";
}

// Asociar la función al botón de comenzar
$("#btnStart").on("click", function (e) {
  e.preventDefault();
  guardarMovimientosYComenzar();
});
