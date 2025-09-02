import { reproducirIntroMidi } from "./sounds.js";

$(window).on("load", async function () {
  //await reproducirIntroMidi();
  // Inicializar AOS
  AOS.init({
    duration: 800,
    easing: "ease-in-out-sine",
    once: true,
    mirror: false,
  });

  const typeMap = {
    Normal: "normal",
    Lucha: "fighting",
    Volador: "flying",
    Veneno: "poison",
    Tierra: "ground",
    Roca: "rock",
    Bicho: "bug",
    Fantasma: "ghost",
    Acero: "steel",
    Fuego: "fire",
    Agua: "water",
    Planta: "grass",
    Eléctrico: "electric",
    Psíquico: "psychic",
    Hielo: "ice",
    Dragón: "dragon",
    Siniestro: "dark",
    Hada: "fairy",
  };

  /*** VARIABLES GLOBALES ***/
  const $section = $(".sctn-pokedex");
  const $grid = $section.find(".pokemon-cards-grid").first(); // solo contenedor de cards
  const $typesContainer = $section.find(".types-filter");
  const $inputSearch = $section.find("#searchInputPokedex");
  const $btnVerMas = $section.find(".btn-ver-mas");

  const apiBase = "https://pokeapi.co/api/v2/pokemon?limit=1025";
  const limit = 20;
  let offset = 0;
  let allPokemons = [];
  let filteredPokemons = [];
  let currentFilterType = "all";
  let currentSearch = "";

  /*** SPINNER DE CARGA ***/
  const $spinner = $(`
    <div class="spinner bg-color-light">
        <div class="wrapper-bounces bg-color-dark"></div>
        <p class="bg-color-dark">Cargando Pokédex...</p>
    </div>
  `);
  $section.prepend($spinner);

  /*** UTILS: obtener nombre de tipo en español ***/
  async function getTypeNameES(url) {
    try {
      const typeData = await $.ajax({ url, method: "GET" });
      return (
        typeData.names.find((n) => n.language.name === "es")?.name ||
        typeData.name
      );
    } catch {
      return "";
    }
  }

  async function getAbilityNameES(url) {
    try {
      const data = await $.ajax({ url, method: "GET" });
      return (
        data.names.find((n) => n.language.name === "es")?.name || data.name
      );
    } catch {
      return "";
    }
  }

  /*** CARGAR TODOS LOS POKÉMON ***/
  async function fetchAllPokemons() {
    try {
      const res = await fetch(apiBase);
      const data = await res.json();

      const promises = data.results.map(async (poke) => {
        try {
          const response = await fetch(poke.url);
          if (!response.ok) throw new Error("No se pudo cargar");
          const info = await response.json();

          const typesES = await Promise.all(
            info.types.map((t) => getTypeNameES(t.type.url))
          );
          const abilitiesES = await Promise.all(
            info.abilities.map((a) => getAbilityNameES(a.ability.url))
          );

          return {
            id: info.id,
            name: info.name,
            image: info.sprites.other["official-artwork"].front_default,
            types: typesES,
            classTypePrimary: info.types[0].type.name,
            classTypeSecondary: info.types[1]?.type.name || null,
            abilities: abilitiesES,
            stats: info.stats.map((s) => ({
              name: s.stat.name,
              base: s.base_stat,
            })),
            weight: info.weight,
            height: info.height,
            description: "", // Podrías completar con species si quieres
            cries: {
              latest: `https://play.pokemonshowdown.com/audio/cries/${info.name.toLowerCase()}.mp3`,
            }, // URL del grito
          };
        } catch (err) {
          console.warn(`Error cargando Pokémon: ${poke.name}`, err);
          return null;
        }
      });

      const allData = await Promise.all(promises);
      allPokemons = allData
        .filter((p) => p !== null)
        .sort((a, b) => a.id - b.id);
      filteredPokemons = [...allPokemons];

      createTypeButtons();
      renderPokemons();

      $spinner.hide();
    } catch (error) {
      console.error("Error al cargar todos los Pokémon:", error);
      $spinner.find("p").text("Error al cargar la Pokédex");
    }
  }

  /*** CREAR BOTONES DE FILTRO POR TIPO ***/
  function createTypeButtons() {
    const allTypes = new Set();
    allPokemons.forEach((p) => p.types.forEach((t) => allTypes.add(t)));
    const sortedTypes = Array.from(allTypes).sort();

    const $btnAll = $(
      '<button class="btn-type active" data-aos="fade-left" data-type="all">Todos</button>'
    );
    $btnAll.on("click", () => handleFilterType("all"));
    $typesContainer.empty().append($btnAll);

    sortedTypes.forEach((type) => {
      const typeEN =
        allPokemons.find((p) => p.types.includes(type))?.classTypePrimary ||
        type;

      const $btn = $(`
        <button data-aos="fade-left" class="text-color-black btn-type type-${typeMap[type]}" data-type="${type}">${type}</button>
     `);

      $btn.on("click", () => handleFilterType(type));
      $typesContainer.append($btn);
    });
  }

  function handleFilterType(type) {
    $(".btn-type").removeClass("active");
    $(`.btn-type[data-type="${type}"]`).addClass("active");
    currentFilterType = type;
    applyFilters();
  }

  /*** FILTRO INPUT ***/
  $inputSearch.on("keyup", function () {
    currentSearch = $(this).val().toLowerCase();
    applyFilters();
  });

  /*** APLICAR FILTROS ***/
  function applyFilters() {
    filteredPokemons = allPokemons.filter((pokemon) => {
      const matchesType =
        currentFilterType === "all" ||
        pokemon.types.includes(currentFilterType);
      const matchesSearch =
        pokemon.name.toLowerCase().includes(currentSearch) ||
        pokemon.id.toString().includes(currentSearch);
      return matchesType && matchesSearch;
    });

    offset = 0;
    $grid.find(".pokemon-card").remove();
    renderPokemons();
  }

  /*** RENDERIZAR TARJETAS ***/
  function renderPokemons() {
    const pokemonsToShow = filteredPokemons.slice(offset, offset + limit);

    pokemonsToShow.forEach((pokemon) => {
      const $card = $(`
        <a href="./pokemon.html" class="pokemon-card" data-aos="fade-up" data-aos-delay="300" >
          <p class="pokemon-id text-color-black type-${pokemon.classTypePrimary.toLowerCase()}${
        pokemon.classTypeSecondary
          ? "-" + pokemon.classTypeSecondary.toLowerCase()
          : ""
      }">Nº ${pokemon.id}</p>

          <img class="pokemon-img" src="${pokemon.image}" alt="${
        pokemon.name
      }" />
          <h3 class="pokemon-name text-color-black">${pokemon.name.toUpperCase()}</h3>
          <!--<div class="pokemon-types"></div>-->
        </a>
      `);

      const $typesContainerCard = $card.find(".pokemon-types");
      pokemon.types.forEach((type) => {
        const $span = $("<span>")
          .addClass(`type-badge type-${type.toLowerCase()}`)
          .text(type);
        $typesContainerCard.append($span);
      });

      $card.on("click", function (e) {
        e.preventDefault();
        // Guardar objeto completo para pokemon.html igual que home.js
        localStorage.setItem("pokemonSeleccionado", JSON.stringify(pokemon));
        window.location.href = "./pokemon.html";
      });

      $grid.append($card);
    });

    offset += limit;
    $btnVerMas.toggle(offset < filteredPokemons.length);
    AOS.refresh();
  }

  $btnVerMas.on("click", renderPokemons);

  // Lanzar carga
  fetchAllPokemons();
});
