import { compareAbilities } from "./catalog-order.mjs";
import { reveal } from "./motion.js";

$(document).ready(async function () {
  //Limpia saltos de línea y espacios sobrantes
  const cleanText = (text) => text ? text.replace(/[\n\f]/g, " ").replace(/\s+/g, " ").trim() : "";

  //Quita cualquier cosa después del primer guion en el nombre de Pokémon
  const cleanPokemonName = (name) => name.split("-")[0];

  //Elimina duplicados del array de Pokémon
  const removeDuplicates = (array) => [...new Set(array)];

  const abilitiesUrl = "https://pokeapi.co/api/v2/ability?limit=1000";
  const $summary = $('<p class="catalog-summary" role="status">Cargando habilidades…</p>').insertBefore(".list-abilities");
  const $empty = $('<p class="catalog-empty" hidden>No hay habilidades con ese nombre.</p>').insertAfter(".list-abilities");

  try {
    const response = await fetch(abilitiesUrl);
    const data = await response.json();
    const abilities = data.results;

    const abilityDetails = await Promise.all(
      abilities.map(async (ability) => {
        const res = await fetch(ability.url);
        const abilityData = await res.json();

        // Buscar nombre en español
        const spanishNameObj = abilityData.names.find((n) => n.language.name === "es");
        if (!spanishNameObj) return null;

        const name = spanishNameObj.name;

        // Buscar descripción larga en español
        const spanishEffectObj = abilityData.effect_entries.find((e) => e.language.name === "es");
        const effect = spanishEffectObj ? spanishEffectObj.effect : "No hay descripción disponible";

        // Buscar descripción corta en español
        const spanishFlavorObj = abilityData.flavor_text_entries.find((f) => f.language.name === "es");
        const shortEffect = spanishFlavorObj ? spanishFlavorObj.flavor_text : "No hay descripción disponible";

        // Limpiar nombres de Pokémon y eliminar duplicados
        const pokemonList = removeDuplicates(
          abilityData.pokemon.map((p) => cleanPokemonName(p.pokemon.name))
        );

        return {
          id: abilityData.id,
          nombre: name,
          efecto: cleanText(effect),
          efecto_corto: cleanText(shortEffect),
          pokemons: pokemonList,
        };
      })
    );

    const filteredAbilities = abilityDetails.filter((ability) => ability !== null).sort(compareAbilities);

    //Pintar lista de habilidades
    const $listContainer = $(".list-abilities");
    $listContainer.empty();

    filteredAbilities.forEach((ability) => {
      const $li = $('<li class="ability-item" role="button" tabindex="0">')
        .attr("data-id", ability.id)
        .append($("<span class='catalog-item-name'>").text(ability.nombre))
        .append($("<span class='catalog-item-meta'>").text(`#${String(ability.id).padStart(3, "0")}`));
      $li.on("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $li.trigger("click"); }
      });
      $listContainer.append($li);

      // Evento para abrir modal con la info de la habilidad
      $li.on("click", function () {
        const $modal = $(".modal-ability");
        $modal.find("h2").text(ability.nombre);
        $modal.find("p").text(ability.efecto_corto);

        const $listPokemons = $modal.find(".list-abilities-pokemon");
        $listPokemons.empty();

        if (ability.pokemons.length > 0) {
          ability.pokemons.forEach((poke) => {
            $listPokemons.append(`<li class="bg-color-light-third text-color-dark">${poke}</li>`);
          });
        } else {
          $listPokemons.append(`<li>Ningún Pokémon conocido con esta habilidad</li>`);
        }

        $modal.addClass("show");
      });
    });

    //FILTRO DE BÚSQUEDA DINÁMICO
    reveal($listContainer);
    $summary.text(`${filteredAbilities.length} habilidades`);
    $("#search-ability").on("input", function () {
      const filter = $(this).val().trim().toLowerCase();

      $(".ability-item").each(function () {
        const text = $(this).find(".catalog-item-name").text().toLowerCase();
        $(this).toggle(text.includes(filter));
      });
      const visible = $(".ability-item").filter(function () { return this.style.display !== "none"; }).length;
      $summary.text(`${visible} habilidades`);
      $empty.prop("hidden", visible > 0);
    }).trigger("input");

    // ❌ Cerrar modal clic fuera
    const $modal = $(".modal-ability");
    $modal.on("click", function (e) {
      if (e.target === this) {
        $modal.removeClass("show");
      }
    });

    // ❌ Botón para cerrar modal
    $(".close-modal").on("click", function () {
      $modal.removeClass("show");
    });

    // ❌ Cerrar modal con Escape
    $(document).on("keydown", function (e) {
      if (e.key === "Escape") $modal.removeClass("show");
    });

  } catch (error) {
    $summary.text("No se pudieron cargar las habilidades. Recarga para reintentar.");
    console.error("❌ Error al obtener las habilidades:", error);
  }
});
