import { createBattleData } from "./game-data.mjs";
import { filterCatalog, PAGE_SIZE } from "./pokedex-data.mjs";
import { icon } from "./icons.js";
import { typeBadgeMarkup } from "./type-badges.mjs";
import { reveal } from "./motion.js";

$(function () {
  const data = createBattleData();
  const $list = $(".list-pokemon");
  const $status = $("#battleCatalogStatus");
  const $pagination = $(".pokedex-pagination");
  const $modal = $(".modal-pokemon");
  const $battleButton = $("#battleBtn");
  const $battleStatus = $("#battleSelectionStatus");
  const statsES = {
    hp: "PS", attack: "Ataque", defense: "Defensa",
    "special-attack": "Ataque Especial", "special-defense": "Defensa Especial", speed: "Velocidad",
  };
  let catalog = [];
  let filtered = [];
  let page = 1;
  let revision = 0;
  let searchTimer;
  let currentEntry = null;
  let currentPokemon = null;
  let selecting = false;
  let selectionRevision = 0;

  function pagination() {
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = Math.max(1, Math.min(page - 1, total - 2));
    const end = Math.min(total, start + 2);
    $pagination.empty();
    function button(label, target, disabled, accessibleLabel, iconName = null) {
      const $button = $("<button type='button'>").text(label).attr({ "aria-label": accessibleLabel, title: accessibleLabel })
        .prop("disabled", disabled).toggleClass("current", target === page && !disabled);
      if (iconName) $button.empty().append(icon(iconName));
      if (target === page && !disabled) $button.attr("aria-current", "page");
      $button.on("click", () => {
        page = target;
        render();
        document.querySelector(".sctn-game").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      $pagination.append($button);
    }
    button("", page - 1, page === 1, "Página anterior", "previous");
    if (start > 1) button("1", 1, false, "Página 1");
    if (start > 2) $pagination.append('<span class="pagination-gap" aria-hidden="true">…</span>');
    for (let number = start; number <= end; number += 1) button(String(number), number, false, `Página ${number}`);
    if (end < total - 1) $pagination.append('<span class="pagination-gap" aria-hidden="true">…</span>');
    if (end < total) button(String(total), total, false, `Página ${total}`);
    button("", page + 1, page === total, "Página siguiente", "next");
    $("#battlePageSummary").text(`Página ${page} de ${total}`);
  }

  function closeModal() {
    selectionRevision += 1;
    selecting = false;
    currentEntry = null;
    currentPokemon = null;
    $modal.removeClass("show");
    $battleStatus.empty();
    $battleButton.text("Entrenar").attr("aria-disabled", "false");
  }

  function openModal(entry, pokemon) {
    currentEntry = entry;
    currentPokemon = pokemon;
    $modal.find(".title").text(pokemon.name.replaceAll("-", " "));
    $modal.find(".image").attr({ src: pokemon.image, alt: pokemon.name });
    const $types = $modal.find(".type").empty();
    pokemon.types.forEach((name) => {
      $types.append($("<li class='type-item'>").append(typeBadgeMarkup(name)));
    });
    pokemon.stats.forEach((stat) => $modal.find(`.stat-item.${stat.name}`).text(`${statsES[stat.name]}: ${stat.base}`));
    $modal.addClass("show");
  }

  async function render() {
    const token = ++revision;
    const entries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    $list.empty().attr("aria-busy", "true");
    pagination();
    $status.text(entries.length ? "Cargando Pokémon…" : "No hay Pokémon con esa búsqueda.");
    if (!entries.length) {
      $list.attr("aria-busy", "false");
      return;
    }
    entries.forEach(() => $list.append('<div class="pokemon-skeleton" aria-hidden="true"></div>'));
    const results = await Promise.allSettled(entries.map((entry) => data.pokemon(entry, true)));
    if (token !== revision) return;
    $list.empty().attr("aria-busy", "false");
    let failures = 0;
    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        failures += 1;
        $list.append($("<button type='button' class='pokemon-retry'>").text(`Reintentar ${entries[index].name}`).on("click", render));
        return;
      }
      const pokemon = result.value;
      const $item = $("<button type='button' class='pokemon-item btn btn-light'>")
        .attr({ "data-id": pokemon.id, "aria-label": `Seleccionar ${pokemon.name}, número ${pokemon.id}` });
      $item.append($("<img>").attr({ src: pokemon.image, alt: pokemon.name, width: 40, height: 40, decoding: "async" }));
      $item.append($("<span class='pokemon-name'>").text(pokemon.name.replaceAll("-", " ")));
      $item.on("click", () => openModal(entries[index], pokemon));
      $list.append($item);
    });
    const first = (page - 1) * PAGE_SIZE + 1;
    reveal($list);
    reveal($pagination);
    $status.text(failures ? `${failures} Pokémon no se han podido cargar. Puedes reintentarlos.` : `Mostrando ${first}–${first + entries.length - 1} de ${filtered.length}`);
    filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((entry) => {
      data.pokemon(entry).then((pokemon) => {
        const image = new Image();
        image.src = pokemon.image;
      }).catch(() => {});
    });
  }

  $("#searchInputPokedex").on("input", function () {
    clearTimeout(searchTimer);
    revision += 1;
    searchTimer = setTimeout(() => {
      filtered = filterCatalog(catalog, this.value);
      page = 1;
      render();
    }, 180);
  });
  $modal.on("click", function (event) {
    if (event.target === this) closeModal();
  });
  $modal.find(".close-modal").on("click", closeModal);
  $(document).on("keydown", (event) => {
    if (event.key === "Escape" && $modal.hasClass("show")) closeModal();
  });
  $battleButton.on("click", async (event) => {
    event.preventDefault();
    if (!currentEntry || selecting) return;
    selecting = true;
    const entry = currentEntry;
    const token = ++selectionRevision;
    const isCancelled = () => token !== selectionRevision;
    const playerStats = {
      id: currentPokemon.id,
      totalStats: currentPokemon.stats.reduce((total, stat) => total + stat.base, 0),
    };
    $battleButton.text("Preparando…").attr("aria-disabled", "true");
    $battleStatus.text("Buscando un rival de nivel similar…");
    try {
      const cpuEntry = await data.opponent(catalog, playerStats, (checked, total) => {
        $battleStatus.text(`Buscando rival: ${checked} de ${total} Pokémon comprobados…`);
      }, isCancelled);
      if (isCancelled()) return;
      $battleStatus.text("Cargando movimientos de ambos Pokémon…");
      const [player, cpu] = await Promise.all([data.battle(entry), data.battle(cpuEntry)]);
      if (isCancelled()) return;
      localStorage.setItem("pokemonToFight", JSON.stringify(player));
      localStorage.setItem("pokemonToFightCPU", JSON.stringify(cpu));
      window.location.href = "./battleground.html";
    } catch {
      if (!isCancelled()) $battleStatus.text("No se pudo preparar el combate. Vuelve a pulsar Entrenar para reintentar.");
    } finally {
      if (!isCancelled()) {
        selecting = false;
        $battleButton.text("Entrenar").attr("aria-disabled", "false");
      }
    }
  });

  async function initialize() {
    $status.text("Cargando catálogo…");
    try {
      catalog = await data.catalog();
      filtered = filterCatalog(catalog, $("#searchInputPokedex").val());
      page = 1;
      render();
    } catch {
      $status.empty().append("No se pudo conectar con PokéAPI. ", $("<button type='button'>").text("Reintentar").on("click", initialize));
    }
  }
  initialize();
});
