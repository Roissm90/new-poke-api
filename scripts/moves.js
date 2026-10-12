import { typeBadgeMarkup } from "./type-badges.mjs";
import { createMovesData, filterMoves } from "./moves-data.mjs";
import { PAGE_SIZE } from "./pokedex-data.mjs";
import { icon } from "./icons.js";
import { reveal } from "./motion.js";

$(document).ready(async function () {
  const data = createMovesData();
  const $list = $(".list-moves");
  const $modal = $(".modal-move");
  let catalog = [];
  let filtered = [];
  let page = 1;
  let selectionRevision = 0;
  let versionLabel = "Escarlata/Púrpura";
  const $reference = $('<p class="catalog-reference">').insertBefore($list);
  $('<p class="machine text-color-dark-two">').insertAfter(".modal-move .title");
  const $summary = $('<p class="catalog-summary" role="status" aria-live="polite">Cargando movimientos…</p>').insertBefore($list);
  const $pagination = $('<nav class="pokedex-pagination" aria-label="Páginas de movimientos">').insertAfter($list).hide();

  function machineLabel(move) {
    return move.machineNumber === null ? "Sin MT" : `MT${String(move.machineNumber).padStart(3, "0")}`;
  }

  function closeModal() {
    selectionRevision += 1;
    $modal.removeClass("show").attr("aria-busy", "false");
  }

  async function openMove(entry) {
    const revision = ++selectionRevision;
    $modal.find(".title").text(entry.name);
    $modal.find(".machine").text(`${machineLabel(entry)} · ${versionLabel}`);
    $modal.find(".damage-class, .power, .accuracy, .pp").text("-");
    $modal.find(".list-moves-types").empty().append($("<li>").append(typeBadgeMarkup(entry.type)));
    $modal.find(".description").text("Cargando detalle…").show();
    $modal.attr("aria-busy", "true").addClass("show");
    try {
      const move = await data.detail(entry);
      if (revision !== selectionRevision || !$modal.hasClass("show")) return;
      $modal.find(".damage-class").text({ physical: "Físico", special: "Especial", status: "Estado" }[move.damage_class] || move.damage_class);
      $modal.find(".power").text(move.power ?? "-");
      $modal.find(".accuracy").text(move.accuracy === null ? "-" : `${move.accuracy}%`);
      $modal.find(".pp").text(move.pp ?? "-");
      $modal.find(".description").text(move.effect ? `Efecto: ${move.effect}` : "").toggle(Boolean(move.effect));
    } catch {
      if (revision !== selectionRevision || !$modal.hasClass("show")) return;
      const $retry = $('<button type="button" class="btn btn-light">').text("Reintentar").prepend(icon("restart")).on("click", () => openMove(entry));
      $modal.find(".description").empty().append("No se pudo cargar el detalle. ", $retry).show();
    } finally {
      if (revision === selectionRevision) $modal.attr("aria-busy", "false");
    }
  }

  function pagination() {
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = Math.max(1, Math.min(page - 1, total - 2));
    const end = Math.min(total, start + 2);
    $pagination.empty().show();
    function button(label, target, disabled, accessibleLabel, iconName = null) {
      const $button = $('<button type="button">').text(label).attr({ "aria-label": accessibleLabel, title: accessibleLabel })
        .prop("disabled", disabled).toggleClass("current", target === page && !disabled);
      if (iconName) $button.empty().append(icon(iconName));
      if (target === page && !disabled) $button.attr("aria-current", "page");
      $button.on("click", () => {
        page = target;
        render();
        document.querySelector(".sctn-moves").scrollIntoView({ behavior: "smooth", block: "start" });
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
  }

  function render() {
    const entries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    $list.empty().attr("aria-busy", "false");
    for (const move of entries) {
      const $card = $('<li class="move-item" role="button" tabindex="0">')
        .attr({ "data-mt": move.machineNumber ?? "", "data-id": move.id })
        .append($("<span class='catalog-item-name'>").text(move.name))
        .append($("<span class='catalog-item-meta'>")
          .append($("<strong class='mt-number'>").text(machineLabel(move)))
          .append(typeBadgeMarkup(move.type)));
      $card.on("click", () => openMove(move)).on("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $card.trigger("click"); }
      });
      $list.append($card);
    }
    pagination();
    reveal($list);
    reveal($pagination);
    const first = (page - 1) * PAGE_SIZE + 1;
    $summary.text(entries.length ? `Mostrando ${first}–${first + entries.length - 1} de ${filtered.length} · Página ${page} de ${Math.ceil(filtered.length / PAGE_SIZE)}` : "No hay movimientos con ese nombre o MT.");
  }

  function search() {
    filtered = filterMoves(catalog, $("#search-move").val());
    page = 1;
    render();
  }

  async function initialize() {
    $list.attr("aria-busy", "true");
    $summary.text("Cargando movimientos…");
    try {
      const index = await data.catalog();
      catalog = index.moves;
      versionLabel = index.versionLabel;
      $reference.text(`Orden: número de MT · ${versionLabel}`);
      search();
    } catch {
      $list.attr("aria-busy", "false");
      $summary.empty().append("No se pudo cargar el catálogo. ", $('<button type="button">').text("Reintentar").on("click", initialize));
    }
  }

  $("#search-move").on("input", search);
  $modal.on("click", function (event) { if (event.target === this) closeModal(); });
  $modal.find(".close-modal").on("click", closeModal);
  $(document).on("keydown", event => { if (event.key === "Escape") closeModal(); });
  await initialize();
});
