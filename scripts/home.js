import { initSlickGallery } from "./slick-config.js";
import { reproducirIntroMidi } from "./sounds.js";

$(window).on("load", async function () {
  //await reproducirIntroMidi();
  //localStorage.clear();
  // Inicializar AOS
  AOS.init({
    duration: 800,
    easing: "ease-in-out-sine",
    once: true,
    mirror: false,
  });

  // Función para obtener el nombre de un tipo en español
  async function getTypeNameES(url) {
    const typeData = await $.ajax({ url, method: "GET" });
    return (
      typeData.names.find((n) => n.language.name === "es")?.name ||
      typeData.name
    );
  }

  const inputSearch = $("#searchPokemon");
  async function mostrarPokemon(nombre) {
    const nombreStr = nombre.toString().toLowerCase();

    try {
      const data = await $.ajax({
        url: "https://pokeapi.co/api/v2/pokemon/" + nombreStr,
        method: "GET",
      });

      const speciesData = await $.ajax({
        url: "https://pokeapi.co/api/v2/pokemon-species/" + data.id + "/",
        method: "GET",
      });

      const nombreEsp =
        speciesData.names.find((n) => n.language.name === "es")?.name ||
        data.name;
      inputSearch.val(nombreEsp);

      const descripcion =
        speciesData.flavor_text_entries.find((f) => f.language.name === "es")
          ?.flavor_text || "";

      const abilitiesES = await Promise.all(
        data.abilities.map(async (a) => {
          const abilityData = await $.ajax({
            url: a.ability.url,
            method: "GET",
          });
          return (
            abilityData.names.find((n) => n.language.name === "es")?.name ||
            a.ability.name
          );
        })
      );

      const typesES = await Promise.all(
        data.types.map((t) => getTypeNameES(t.type.url))
      );

      const image = data.sprites.other["official-artwork"].front_default;

      const typeClassPrimary = data.types[0].type.name.toLowerCase();
      const typeClassSecondary = data.types[1]
        ? data.types[1].type.name.toLowerCase()
        : "";

      const pokemonInfo = {
        id: data.id,
        name: nombreEsp,
        abilities: abilitiesES,
        types: typesES,
        classTypePrimary: typeClassPrimary,
        classTypeSecondary: typeClassSecondary,
        weight: data.weight,
        height: data.height,
        image: image,
        description: descripcion,
        cries: data.cries,
        stats: data.stats.map((s) => ({
          name: s.stat.name,
          base: s.base_stat,
        })),
      };

      localStorage.setItem("pokemonSeleccionado", JSON.stringify(pokemonInfo));

      $("#pokemonImage").fadeOut(200, function () {
        $(this).attr("src", image).fadeIn(400);
      });

      $("#pokemonError").text("");
    } catch (error) {
      $("#pokemonError").text("No se encontró ese Pokémon").show();
      $("#pokemonImage").fadeOut(200, function () {
        $(this).attr("src", "./assets/error_image.png").fadeIn(400);
      });
      console.error(error);
    }
  }

  const randomId = Math.floor(Math.random() * 1010) + 1;
  mostrarPokemon(randomId);

  inputSearch.on("click", function () {
    $(this).val("");
    $("#pokemonError").text("");
  });

  inputSearch.on("keypress", function (e) {
    if (e.which === 13) {
      const nombre = $(this).val();
      mostrarPokemon(nombre);
    }
  });

  const $linkButton = $(".link-pokemon-single");

  $linkButton.on("mousemove", function (e) {
    const $btn = $(this);
    const $tooltip = $btn.find(".tooltip-link");

    const offset = $btn.offset();
    const buttonWidth = $btn.innerWidth();
    const buttonHeight = $btn.innerHeight();
    const tooltipWidth = $tooltip.outerWidth();
    const tooltipHeight = $tooltip.outerHeight();

    let x = e.pageX - offset.left - tooltipWidth / 2;
    let y = e.pageY - offset.top - tooltipHeight / 2;

    if (x < 0) x = 0;
    if (x + tooltipWidth > buttonWidth) x = buttonWidth - tooltipWidth;
    if (y < 0) y = 0;
    if (y + tooltipHeight > buttonHeight) y = buttonHeight - tooltipHeight;

    $tooltip.css({ left: x + "px", top: y + "px" });
  });

  $linkButton.on("mouseenter", function () {
    const $btn = $(this);
    const $tooltip = $btn.find(".tooltip-link");
    $(this).find($tooltip).css("opacity", "1");
  });

  $linkButton.on("mouseleave", function () {
    const $btn = $(this);
    const $tooltip = $btn.find(".tooltip-link");
    $(this).find($tooltip).css("opacity", "0");
  });

  // ==============================
  // GALERÍA DE DESTACADOS
  // ==============================
  const $destacadosGrid = $(".sctn-destacados .container-grid");

  // NUEVA FUNCIÓN: Obtener los 10 Pokémon más poderosos
  async function getTopPokemon() {
    try {
      const allPokemon = await $.ajax({
        url: "https://pokeapi.co/api/v2/pokemon?limit=1010",
        method: "GET",
      });

      // Pedir todos los datos en paralelo
      const allData = await Promise.all(
        allPokemon.results.map((p) => $.ajax({ url: p.url, method: "GET" }))
      );

      // Mapear stats y calcular potencia total
      const pokemons = await Promise.all(
        allData.map(async (data) => {
          const speciesData = await $.ajax({
            url: `https://pokeapi.co/api/v2/pokemon-species/${data.id}/`,
            method: "GET",
          });

          const nombreEsp =
            speciesData.names.find((n) => n.language.name === "es")?.name ||
            data.name;

          return {
            id: data.id,
            name: nombreEsp,
            image: data.sprites.other["official-artwork"].front_default,
            types: data.types.map((t) => t.type),
            totalStats: data.stats.reduce((acc, s) => acc + s.base_stat, 0),
          };
        })
      );

      // Ordenar de mayor a menor y devolver los 10 más poderosos
      return pokemons
        .filter(Boolean)
        .sort((a, b) => b.totalStats - a.totalStats)
        .slice(0, 10);
    } catch (err) {
      console.error("Error obteniendo Pokémon poderosos:", err);
      return [];
    }
  }

  // Cargar Pokémon destacados en la galería
  async function cargarPokemonDestacados() {
    $destacadosGrid.empty();

    const pokemons = await getTopPokemon();

    for (const p of pokemons) {
      if (!p) continue;

      const types = await Promise.all(
        p.types.map(async (t) => ({
          nameES: await getTypeNameES(t.url),
          classEN: t.name.toLowerCase(),
        }))
      );

      const typesHTML = types
        .map(
          (t) =>
            `<span class="pokemon-type text-color-light type-${t.classEN}">${t.nameES}</span>`
        )
        .join("");

      const card = $(`
        <div class="pokemon-card" data-id="${p.id}">
          <img class="img-slide" src="${p.image}" alt="${p.name}">
          <div class="wrapper-name-id">
            <h3 class="pokemon-name bg-color-light text-color-dark">${p.name}</h3>
            <span class="pokemon-id bg-color-light text-color-dark">#${p.id}</span>
          </div>
          <div class="pokemon-types">${typesHTML}</div>
          <!--<span class="pokemon-power">Poder: ${p.totalStats}</span>-->
        </div>
      `);

      $destacadosGrid.append(card);
    }

    initSlickGallery($destacadosGrid);

    $destacadosGrid.on("afterChange", function (event, slick, currentSlide) {
      const $slides = $(slick.$slides);
      $slides.removeClass("is-center");
      $($slides[currentSlide]).addClass("is-center");
    });
  }

  // Ejecutar la galería
  cargarPokemonDestacados();
});
