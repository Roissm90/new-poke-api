$(document).ready(async function () {
  // Inicializar AOS
  AOS.init({
    duration: 800,
    easing: "ease-in-out-sine",
    once: true,
    mirror: false,
  });

  //Limpia saltos de línea y espacios sobrantes
  const cleanText = (text) => text ? text.replace(/[\n\f]/g, " ").replace(/\s+/g, " ").trim() : "";

  //Quita cualquier cosa después del primer guion en el nombre de Pokémon
  const cleanPokemonName = (name) => name.split("-")[0];

  //Elimina duplicados del array de Pokémon
  const removeDuplicates = (array) => [...new Set(array)];

  const abilitiesUrl = "https://pokeapi.co/api/v2/ability?limit=1000";

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

    const filteredAbilities = abilityDetails.filter((ability) => ability !== null);

    //Pintar lista de habilidades
    const $listContainer = $(".list-abilities");
    $listContainer.empty();

    filteredAbilities.forEach((ability) => {
      const $li = $(`<li data-aos="fade-up" data-aos-delay="300" class="ability-item text-color-dark" data-id="${ability.id}">${ability.nombre}</li>`);
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
    $("#search-ability").on("keyup", function () {
      const filter = $(this).val().toLowerCase();

      $(".ability-item").each(function () {
        const text = $(this).text().toLowerCase();
        $(this).toggle(text.includes(filter));
      });
    });

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
    console.error("❌ Error al obtener las habilidades:", error);
  }
});
