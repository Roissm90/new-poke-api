import {
  reproducirIntroMidi,
  reproducirBattleMidi,
  detenerMidi,
  isMusicEnabled,
  setMusicEnabled,
  getMusicState,
  subscribeMusic,
} from "./sounds.js";
import { initializeMotion } from "./motion.js";
import { icon, iconMarkup } from "./icons.js";
/**** AOS INIT ****/
$(document).ready(function () {
  initializeMotion();
});

/**** CONTROLAR QUE ITEMS SALEN DEL MENU */
$(document).ready(function () {
  const path = window.location.pathname.split("/").pop();
  const base = path === "" || path === "index.html" ? "." : "..";
  const labels = { home: "Inicio", pokedex: "Pokédex", abilities: "Habilidades", moves: "Movimientos", game: "Combate", activities: "Actividades", teams: "Equipos" };
  const current = path.replace(".html", "") || "home";
  const navigationPage = ["battleground", "battlegame"].includes(current) ? "game" : current === "pokemon" ? "pokedex" : current;
  const titles = { ...labels, index: "Inicio", pokemon: "Ficha Pokémon", battleground: "Arena", battlegame: "Combate" };
  document.documentElement.lang = "es";
  document.title = `${titles[current] || "Pokémon"} | PokéAtlas`;
  $(".wrapper-image-header").prepend(`<a class="atlas-brand" href="${base}/index.html" aria-label="PokéAtlas: inicio" title="PokéAtlas: inicio">${iconMarkup("brand")}</a>`);
  $(".menu-toggle").empty().append(icon("menu"), icon("close")).attr({ title: "Abrir menú", "aria-controls": "primaryNavigation" });
  $(".nav-list").attr("id", "primaryNavigation");

  $(".nav-list li").each(function () {
    const page = $(this).data("page");
    const $link = $(this).find("a");
    $link.text(labels[page] || $link.text());
    if (((path === "" || path === "index.html") && page === "home") || navigationPage === page) {
      $link.attr("aria-current", "page");
    }
  });
  const section = document.querySelector("section");
  if (section) {
    section.id ||= "mainContent";
    section.setAttribute("tabindex", "-1");
    $("body").prepend($("<a class='skip-link'>").attr("href", `#${section.id}`).text("Saltar al contenido"));
    const heading = { abilities: "Habilidades", moves: "Movimientos", game: "Elige tu equipo", teams: "Tus equipos", activities: "Actividades", battleground: "Arena de combate", battlegame: "Combate" }[current];
    if (heading && !section.querySelector("h1")) {
      const $intro = $("<div class='page-intro'>");
      $intro.append($("<p class='eyebrow'>").text(["abilities", "moves"].includes(current) ? "EL CATÁLOGO · POKÉATLAS" : "ZONA DE JUEGO · POKÉATLAS"));
      $intro.append($("<h1 class='section-heading'>").text(heading));
      $(section).find(".container-grid").first().prepend($intro);
    }
  }
  $("body").append(`<footer class="atlas-footer"><span>PokéAtlas · Generaciones I–IX</span><span>Proyecto no oficial · Datos de <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer">PokéAPI</a></span></footer>`);
  $("[data-aos-delay]").attr("data-aos-delay", "0");
  $(".close-modal").empty().append(() => icon("close")).attr({ "aria-label": "Cerrar", title: "Cerrar" });
  $(".close-modal").on("click", function () { $(this).closest(".modal").removeClass("show"); });
  $(".modal").on("click", function (event) {
    if (event.target === this) $(this).find(".close-modal").trigger("click");
  });
  $(".play-cry").append(icon("sound")).attr({ "aria-label": "Escuchar Pokémon", title: "Escuchar Pokémon" });
  const actionIcons = {
    "#pokemonSearchForm button": "search",
    "#nextPokemonBtn, #restartBtnActivityTwo, #resetBtn": "restart",
    "#startBtn, #btnStart": "play",
  };
  Object.entries(actionIcons).forEach(([selector, name]) => {
    $(selector).prepend(() => icon(name));
  });
  $(".modal").attr({ role: "dialog", "aria-modal": "true", "aria-hidden": "true", tabindex: "-1" }).each(function (index) {
    const heading = this.querySelector("h2, h4");
    if (heading) {
      heading.id ||= `dialogTitle${index}`;
      this.setAttribute("aria-labelledby", heading.id);
    }
  });
});

/**** ACTUALIZAR BG POR IMPAR/PAR ****/
$(document).ready(function () {
  const sections = $("section");
  sections.each(function (index) {
    if (index % 2 === 0) {
      $(this).addClass("bg-odd");
    } else {
      $(this).addClass("bg-even");
    }
  });
});

/**** HANDLER DEL MENU ****/
function handleNavListDisplay() {
  if ($(window).width() <= 1024) {
    if (!$(".menu-toggle").hasClass("active")) {
      $(".nav-list").removeClass("active");
      $(".menu-toggle").attr("aria-expanded", "false");
    }
  } else {
    $(".nav-list").addClass("active");
    // cerrar menu y quitar el active al botón si estaba abierto
    $(".menu-toggle").removeClass("active");
    $(".menu-toggle").attr("aria-expanded", "false");
  }
  const label = $(".menu-toggle").hasClass("active") ? "Cerrar menú" : "Abrir menú";
  $(".menu-toggle").attr({ "aria-label": label, title: label });
}
$(document).ready(function () {
  $(".menu-toggle").on("click", function () {
    $(this).toggleClass("active");
    $(this).attr("aria-expanded", $(this).hasClass("active"));
    $(".nav-list").toggleClass("active", $(this).hasClass("active"));
    handleNavListDisplay();
  });

  $(document).on("click", function (event) {
    if ($(window).width() > 1024 || !$(".menu-toggle").hasClass("active")) return;
    if ($(event.target).closest(".nav-list, .menu-toggle").length) return;
    $(".menu-toggle").removeClass("active").attr("aria-expanded", "false");
    handleNavListDisplay();
  });

  // Control inicial y en resize
  handleNavListDisplay();
  $(window).on("resize", function () {
    // cerrar el menu y quitar el active al botón al hacer resize
    if ($(window).width() > 1024) {
      $(".menu-toggle").removeClass("active");
      $(".nav-list").removeClass("active");
    }
    handleNavListDisplay();
  });
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      activeModal?.querySelector(".close-modal")?.click();
      $(".menu-toggle").removeClass("active").attr("aria-expanded", "false");
      handleNavListDisplay();
    }
  });
});

/*** HANDLER PARA SCROLL ANCHOR ****/
$(document).ready(function () {
  const btnScroll = $(".btn-scroll");
  btnScroll.on("click", function (e) {
    e.preventDefault();

    const target = $(this).attr("href");
    if (!target.startsWith("#")) return;

    const marginTop = document.querySelector("nav.nav").getBoundingClientRect().height + 20;

    let targetSection = $(`${target}`);
    if (targetSection.length) {
      let offsetTop = targetSection.offset().top - marginTop;
      window.scrollTo({
        top: offsetTop,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  });
});

let activeModal = null;
let previousFocus = null;
const modalObserver = new MutationObserver(() => {
  const anyModalShown = document.querySelector("body .modal.show");
  document.querySelectorAll("body > header, body > section, body > footer").forEach((element) => { element.inert = Boolean(anyModalShown); });
  document.querySelectorAll(".modal").forEach((modal) => modal.setAttribute("aria-hidden", String(modal !== anyModalShown)));
  if (anyModalShown !== activeModal) {
    if (anyModalShown) {
      previousFocus = document.activeElement;
      requestAnimationFrame(() => {
        if (anyModalShown.classList.contains("show")) {
          (anyModalShown.querySelector(".close-modal") || anyModalShown).focus();
        }
      });
    } else if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    activeModal = anyModalShown;
  }
  if (anyModalShown) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || !activeModal) return;
  const elements = [...activeModal.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
    .filter((element) => !element.disabled && element.getClientRects().length);
  if (!elements.length) { event.preventDefault(); activeModal.focus(); return; }
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

// Configuración del observer
modalObserver.observe(document.body, {
  childList: true, // nodos añadidos o eliminados
  subtree: true, // todos los descendientes
  attributes: true, // cambios de atributos (como class)
  attributeFilter: ["class"], // solo cuando cambie la clase
});

// Función para crear el botón
function crearBotonSonido() {
  const $btn = $('<button type="button" class="btn-sound">');
  $("nav.nav .container-grid .wrapper-image-header").append($btn);

  function updateButton({ status, error }) {
    const controls = {
      off: ["Activar música", "sound-off"],
      loading: ["Cancelar carga de música", "play"],
      blocked: ["Reanudar música", "play"],
      playing: ["Desactivar música", "sound"],
      error: ["Reintentar música", "restart"],
    };
    const [label, name] = controls[status];
    const playing = status === "playing";
    $btn.toggleClass("sound-active", playing).empty().append(icon(name));
    $btn.attr({ "aria-label": label, title: error ? `${label}: ${error.message}` : label,
      "aria-pressed": String(playing), "aria-busy": String(status === "loading"), "data-music-state": status });
  }

  function startMusic() {
    const play = window.location.pathname.endsWith("/battlegame.html") ? reproducirBattleMidi : reproducirIntroMidi;
    void play().catch(() => {});
  }

  $btn.on("click", function () {
    const { status } = getMusicState();
    if (status === "playing" || status === "loading") setMusicEnabled(false);
    else {
      setMusicEnabled(true);
      startMusic();
    }
  });

  function resumeMusic(event) {
    if (!event.isTrusted || event.target.closest?.(".btn-sound") || !isMusicEnabled()) return;
    if (getMusicState().status === "blocked") startMusic();
  }
  document.addEventListener("pointerdown", resumeMusic);
  document.addEventListener("keydown", resumeMusic);
  window.addEventListener("pagehide", detenerMidi);
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    if (isMusicEnabled()) startMusic();
  });
  window.addEventListener("storage", event => {
    if (event.key !== "pokeatlas:music" && event.key !== null) return;
    if (isMusicEnabled()) startMusic();
    else detenerMidi();
  });
  subscribeMusic(updateButton);
  if (isMusicEnabled()) startMusic();
}

// Inicializar botón al cargar el DOM
$(document).ready(function () {
  crearBotonSonido();
});
