import { createPokedexData, filterCatalog, PAGE_SIZE, TYPE_NAMES } from "./pokedex-data.mjs";
import { icon } from "./icons.js";
import { typeBadgeMarkup } from "./type-badges.mjs";
import { reveal } from "./motion.js";

$(async function () {
  const data = createPokedexData();
  const $grid = $(".pokemon-cards-grid");
  const $status = $("#pokedexStatus");
  const $pagination = $(".pokedex-pagination");
  let catalog = [];
  let filtered = [];
  let page = 1;
  let search = "";
  let type = "all";
  let revision = 0;
  let searchTimer;

  function pagination() {
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = Math.max(1, Math.min(page - 1, total - 2));
    const end = Math.min(total, start + 2);
    $pagination.empty();
    const button = (label, target, disabled, accessibleLabel = label, iconName = null) => {
      const $button = $("<button>").text(label).attr("aria-label", accessibleLabel)
        .prop("disabled", disabled).toggleClass("current", target === page && !disabled);
      $button.attr("title", accessibleLabel);
      if (iconName) $button.empty().append(icon(iconName));
      if (target === page && !disabled) $button.attr("aria-current", "page");
      $button.on("click", () => {
        page = target;
        render();
        document.querySelector(".dex-heading").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      $pagination.append($button);
    };
    button("", page - 1, page === 1, "Página anterior", "previous");
    if (start > 1) button("1", 1, false, "Página 1");
    if (start > 2) $pagination.append('<span class="pagination-gap" aria-hidden="true">…</span>');
    for (let number = start; number <= end; number += 1) {
      button(String(number), number, false, `Página ${number}`);
    }
    if (end < total - 1) $pagination.append('<span class="pagination-gap" aria-hidden="true">…</span>');
    if (end < total) button(String(total), total, false, `Página ${total}`);
    button("", page + 1, page === total, "Página siguiente", "next");
    $("#pageSummary").text(`Página ${page} de ${total}`);
  }

  async function render() {
    const token = ++revision;
    const entries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    $grid.attr("aria-busy", "true").empty();
    pagination();
    $("#pokemonCount").text(`${filtered.length.toLocaleString("es")} Pokémon`);
    $status.text(entries.length ? "Cargando Pokémon…" : "No hay Pokémon con estos filtros.");
    if (!entries.length) {
      $grid.attr("aria-busy", "false");
      return;
    }
    entries.forEach(() => $grid.append('<div class="pokemon-skeleton" aria-hidden="true"></div>'));
    const results = await Promise.allSettled(entries.map((entry) => data.pokemon(entry, true)));
    if (token !== revision) return;
    $grid.empty().attr("aria-busy", "false");
    let failures = 0;
    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        failures += 1;
        $grid.append($("<button class='pokemon-retry'>").text(`Reintentar ${entries[index].name}`).on("click", render));
        return;
      }
      const pokemon = result.value;
      const $card = $("<a class='pokemon-card'>").attr("href", "./pokemon.html")
        .attr("aria-label", `Ver ${pokemon.name}, número ${pokemon.id}`)
        .attr("data-pokemon-type", pokemon.classTypePrimary);
      $card.append($("<p class='pokemon-id'>").text(`#${String(pokemon.id).padStart(4, "0")}`));
      $card.append($("<img class='pokemon-img'>").attr({
        src: pokemon.image, alt: pokemon.name, width: 200, height: 200, decoding: "async",
      }));
      $card.append($("<h3 class='pokemon-name'>").text(pokemon.name.replaceAll("-", " ")));
      const $types = $("<div class='pokemon-types'>");
      pokemon.types.forEach((name) => $types.append(typeBadgeMarkup(name)));
      $card.append($types);
      $card.on("click", async (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
          localStorage.setItem("pokemonSeleccionado", JSON.stringify(pokemon));
          return;
        }
        event.preventDefault();
        if ($card.attr("aria-busy") === "true") return;
        $card.attr("aria-busy", "true");
        $status.text(`Abriendo ${pokemon.name}…`);
        try {
          const detail = await data.detail(entries[index]);
          localStorage.setItem("pokemonSeleccionado", JSON.stringify(detail));
          window.location.href = "./pokemon.html";
        } catch {
          $card.attr("aria-busy", "false");
          $status.text("No se pudo abrir la ficha. Vuelve a intentarlo.");
        }
      });
      $grid.append($card);
    });
    const first = (page - 1) * PAGE_SIZE + 1;
    reveal($grid);
    reveal($pagination);
    $status.text(failures ? `${failures} Pokémon no se han podido cargar. Puedes reintentarlos.` : `Mostrando ${first}–${first + entries.length - 1} de ${filtered.length}`);
    filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((entry) => {
      data.pokemon(entry).then((pokemon) => {
        const image = new Image();
        image.src = pokemon.image;
      }).catch(() => {});
    });
  }

  async function applyFilters() {
    const token = ++revision;
    page = 1;
    $status.text("Aplicando filtros…");
    $grid.attr("aria-busy", "true");
    try {
      const ids = type === "all" ? null : await data.typeIds(type);
      if (token !== revision) return;
      filtered = filterCatalog(catalog, search, ids);
      render();
    } catch {
      if (token !== revision) return;
      $grid.attr("aria-busy", "false");
      $status.empty().append("No se pudo cargar el filtro. ", $("<button>").text("Reintentar").on("click", applyFilters));
    }
  }

  $("#searchInputPokedex").on("input", function () {
    search = this.value;
    clearTimeout(searchTimer);
    revision += 1;
    searchTimer = setTimeout(applyFilters, 180);
  });
  const $types = $(".types-filter");
  Object.entries({ all: "Todos", ...TYPE_NAMES }).forEach(([key, name]) => {
    const $button = $("<button class='btn-type'>").html(key === "all" ? name : typeBadgeMarkup(key))
      .attr({ title: name, "aria-label": name }).attr("aria-pressed", key === "all")
      .attr("data-type", key).toggleClass("active", key === "all");
    $button.on("click", () => {
      type = key;
      $types.find("button").removeClass("active").attr("aria-pressed", "false");
      $button.addClass("active").attr("aria-pressed", "true");
      applyFilters();
    });
    $types.append($button);
  });

  async function initialize() {
    $status.text("Cargando catálogo…");
    try {
      catalog = await data.catalog();
      applyFilters();
    } catch {
      $status.empty().append("No se pudo conectar con PokéAPI. ", $("<button>").text("Reintentar").on("click", initialize));
    }
  }
  initialize();
});
