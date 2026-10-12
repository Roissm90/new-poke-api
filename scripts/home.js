import { initSlickGallery } from "./slick-config.js";
import { reproducirIntroMidi } from "./sounds.js";
import { createPokedexData } from "./pokedex-data.mjs";
import { reveal } from "./motion.js";
import { typeBadgeMarkup } from "./type-badges.mjs";
import { icon } from "./icons.js";

$(function () {
  const block = document.querySelector(".hero-index");
  if (!block) return;
  const data = createPokedexData();
  const status = document.querySelector("#heroCounterStatus");
  const labels = { pokemon: "Pokémon", generations: "generaciones", types: "tipos" };
  const formatter = new Intl.NumberFormat("es", { useGrouping: "always" });
  let loading = false;

  async function loadCounters() {
    if (loading) return;
    loading = true;
    block.setAttribute("aria-busy", "true");
    status.hidden = true;
    $(status).empty();
    try {
      const totals = await data.totals();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const counters = [...block.querySelectorAll("[data-counter]")].map(element => {
        const target = totals[element.dataset.counter];
        const formatted = formatter.format(target);
        element.dataset.count = String(target);
        element.style.setProperty("--counter-digits", String(formatted.length));
        element.parentElement.setAttribute("aria-label", `${formatted} ${labels[element.dataset.counter]}`);
        if (reduced || !window.Odometer) {
          element.textContent = formatted;
          return null;
        }
        return {
          target,
          instance: element.odometer || new window.Odometer({ el: element, value: 0, format: "(.ddd)", duration: 2000, theme: "default" }),
        };
      }).filter(Boolean);
      if (!counters.length) return;
      const start = () => {
        setTimeout(() => counters.forEach(({ instance, target }) => instance.update(target)), 150);
      };
      const bounds = block.getBoundingClientRect();
      if ((bounds.top < window.innerHeight && bounds.bottom > 0) || typeof IntersectionObserver === "undefined") {
        start();
      } else {
        const observer = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer.disconnect();
          start();
        });
        observer.observe(block);
      }
    } catch {
      block.querySelectorAll("[data-counter]").forEach(element => {
        element.parentElement.setAttribute("aria-label", `Total de ${labels[element.dataset.counter]} no disponible`);
      });
      const $retry = $('<button type="button">').append(icon("restart"), "Reintentar").on("click", loadCounters);
      $(status).append("No se pudieron cargar los totales. ", $retry);
      status.hidden = false;
    } finally {
      loading = false;
      block.setAttribute("aria-busy", "false");
    }
  }
  loadCounters();
});

$(window).on("load", async function () {
  //await reproducirIntroMidi();
  //localStorage.clear();
  // Función para obtener el nombre de un tipo en español
  const typeCache = new Map();
  async function getTypeNameES(url) {
    if (!typeCache.has(url)) typeCache.set(url, $.ajax({ url, method: "GET" }));
    const typeData = await typeCache.get(url);
    return (
      typeData.names.find((n) => n.language.name === "es")?.name ||
      typeData.name
    );
  }

  const inputSearch = $("#searchPokemon");
  let searchRevision = 0;
  async function mostrarPokemon(nombre) {
    const token = ++searchRevision;
    const nombreStr = nombre.toString().trim().toLowerCase();
    if (!nombreStr) return;
    $(".link-pokemon-single").attr("aria-disabled", "true");

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

      if (token !== searchRevision) return;
      inputSearch.val(nombreEsp);
      localStorage.setItem("pokemonSeleccionado", JSON.stringify(pokemonInfo));
      $(".link-pokemon-single").removeAttr("aria-disabled");

      reveal($("#pokemonImage").attr("src", image));
      reveal($(".section-search > .container-grid"));

      $("#pokemonError").text("");
    } catch (error) {
      if (token !== searchRevision) return;
      $(".link-pokemon-single").attr("aria-disabled", "true");
      $("#pokemonError").text("No se encontró ese Pokémon").show();
      $("#pokemonImage").stop(true, true).hide();
      console.error(error);
    }
  }

  const randomId = Math.floor(Math.random() * 1010) + 1;
  mostrarPokemon(randomId);

  inputSearch.on("click", function () {
    $(this).val("");
    $("#pokemonError").text("");
  });

  $("#pokemonSearchForm").on("submit", function (event) {
    event.preventDefault();
    mostrarPokemon(inputSearch.val());
  });

  const $linkButton = $(".link-pokemon-single");
  $linkButton.on("click", function (event) {
    if ($(this).attr("aria-disabled") === "true") event.preventDefault();
  });

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
      const loader = createPokedexData();
      const ids = [493, 150, 384, 383, 382, 483, 484, 487, 249, 250];
      const results = await Promise.allSettled(ids.map((id) => loader.pokemon({ url: `https://pokeapi.co/api/v2/pokemon/${id}/` })));
      return results.filter((result) => result.status === "fulfilled").map(({ value }) => ({
        ...value,
        types: [value.classTypePrimary, value.classTypeSecondary].filter(Boolean).map((name) => ({ name, url: `https://pokeapi.co/api/v2/type/${name}/` })),
        totalStats: value.stats.reduce((total, stat) => total + stat.base, 0),
      })).sort((first, second) => second.totalStats - first.totalStats);
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

      const typesHTML = p.types
        .map((type) => typeBadgeMarkup(type.name))
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
    reveal($destacadosGrid.closest(".sctn-destacados"));

    $destacadosGrid.on("afterChange", function (event, slick, currentSlide) {
      const $slides = $(slick.$slides);
      $slides.removeClass("is-center");
      $($slides[currentSlide]).addClass("is-center");
    });
  }

  // Ejecutar la galería
  cargarPokemonDestacados();
});
