import { reproducirIntroMidi } from "./sounds.js";
import { typeBadgeMarkup } from "./type-badges.mjs";
import { reveal } from "./motion.js";

$(window).on("load", async function () {
  //await reproducirIntroMidi();
  // Recuperar datos del localStorage
  const pokemonData = localStorage.getItem("pokemonSeleccionado");

  // Si no hay datos, redirigir al index.html
  if (!pokemonData) {
    console.warn("No se encontró información del Pokémon. Redirigiendo...");
    window.location.href = "../index.html";
    return;
  }

  const pokemon = JSON.parse(pokemonData);

  // Elementos del DOM
  const $title = $(".pokemon-single-title");
  const $id = $(".pokemon-single-id");
  const $description = $(".pokemon-single-description");
  const $typesList = $(".pokemon-single-types");
  const $abilitiesList = $(".pokemon-single-abilities");
  const $statNameList = $(".stat-name-list");
  const $statValueList = $(".stat-value-list");
  const $image = $(".image-pokemon");
  const $cryButton = $(".play-cry");
  const $tooltip = $(".tooltip-cry");

  // Pintar nombre y ID
  $title.text(pokemon.name.replace(/-/g, " "));
  if( pokemon.classTypePrimary && pokemon.classTypeSecondary) {
    $id.addClass(`type-${pokemon.classTypePrimary}-${pokemon.classTypeSecondary}`);
  } else if (pokemon.classTypePrimary) {
    $id.addClass(`type-${pokemon.classTypePrimary}`);
  }
  $id.text(`Nº ${pokemon.id}`);

  if (pokemon.description) {
    $description.text(pokemon.description.replace(/-/g, " "));
  } else {
    $description.hide();
  }

  // Pintar tipos
  $typesList.empty();
  $.each(pokemon.types, function (index, type) {
    const $li = $("<li class='type-badge'>").append(typeBadgeMarkup(type));

    $typesList.append($li);
  });

  // Pintar habilidades
  $abilitiesList.empty();
  if (pokemon.abilities && pokemon.abilities.length > 0) {
    $.each(pokemon.abilities, function (index, ability) {
      const $li = $("<li>").text(ability.replace(/-/g, " "));
      $abilitiesList.append($li);
    });
  }

  // Pintar estadísticas
  $statNameList.empty();
  $statValueList.empty();
  $.each(pokemon.stats, function (index, stat) {
    const $liName = $("<li>").text(traduceNameStats(stat.name));
    const $liValue = $("<li>").text(stat.base).css("--stat-strength", `${Math.min(100, stat.base / 255 * 100)}%`);

    $statNameList.append($liName);
    $statValueList.append($liValue);
  });

  // Pintar imagen oficial
  $image.attr("src", pokemon.image);
  $image.attr("alt", pokemon.name);
  reveal($(".sctn-pokemon-single .container-grid > .col-left, .sctn-pokemon-single .container-grid > .col-right"));

  // Reproducir cry al hacer clic en "Escuchar"
  if (pokemon.cries && pokemon.cries.latest) {
    $cryButton.on("click", function (e) {
      e.preventDefault();
      const audio = new Audio(pokemon.cries.latest);
      audio
        .play()
        .catch((err) => console.error("Error al reproducir audio:", err));
    });
  } else {
    $cryButton.hide();
  }

  // Posicionar tooltip dinámicamente
  // Posicionar tooltip dinámicamente
  $cryButton.on("mousemove", function (e) {
    const $btn = $(this);
    const $tooltip = $btn.find(".tooltip-cry"); // tooltip del botón actual

    const offset = $btn.offset();
    const buttonWidth = $btn.innerWidth();
    const buttonHeight = $btn.innerHeight();
    const tooltipWidth = $tooltip.outerWidth();
    const tooltipHeight = $tooltip.outerHeight();

    let x = e.pageX - offset.left - tooltipWidth / 2;
    let y = e.pageY - offset.top - tooltipHeight / 2;

    // Limitar X
    if (x < 0) x = 0;
    if (x + tooltipWidth > buttonWidth) x = buttonWidth - tooltipWidth;

    // Limitar Y
    if (y < 0) y = 0;
    if (y + tooltipHeight > buttonHeight) y = buttonHeight - tooltipHeight; // <-- corregido

    $tooltip.css({ left: x + "px", top: y + "px" }); // <-- mover en X e Y
  });

  $cryButton.on("mouseenter", function () {
    $(this).find($tooltip).css("opacity", "1");
  });

  $cryButton.on("mouseleave", function () {
    $(this).find($tooltip).css("opacity", "0");
  });
});

// Función para traducir nombres de estadísticas
function traduceNameStats(stat) {
  switch (stat) {
    case "hp":
      return "PS";
    case "attack":
      return "Ataque";
    case "defense":
      return "Defensa";
    case "special-attack":
      return "At. Especial";
    case "special-defense":
      return "Def. Especial";
    case "speed":
      return "Velocidad";
    default:
      return stat;
  }
}
