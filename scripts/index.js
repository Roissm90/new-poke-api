import {
  reproducirIntroMidi,
  reproducirBattleMidi,
  //detenerBattleMidi,
  detenerMidi,
} from "./sounds.js";
/**** AOS INIT ****/
$(document).ready(function () {
  AOS.init({
    duration: 800,
    easing: "ease-in-out-sine",
    once: true,
    mirror: false,
  });
});

/**** CONTROLAR QUE ITEMS SALEN DEL MENU */
$(document).ready(function () {
  const path = window.location.pathname.split("/").pop();
  console.log("Current path:", path);

  $(".nav-list li").each(function () {
    const page = $(this).data("page");
    if ((path === "" || path === "index.html") && page === "home") {
      $(this).hide();
    } else if (page && path.includes(page)) {
      $(this).hide();
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
  if ($(window).width() <= 768) {
    if (!$(".menu-toggle").hasClass("active")) {
      $(".nav-list").removeClass("active");
    }
  } else {
    $(".nav-list").addClass("active");
    // cerrar menu y quitar el active al botón si estaba abierto
    $(".menu-toggle").removeClass("active");
  }
}
$(document).ready(function () {
  $(".menu-toggle").on("click", function () {
    $(this).toggleClass("active");
    $(".nav-list").toggleClass("active", $(this).hasClass("active"));
  });

  // Control inicial y en resize
  handleNavListDisplay();
  $(window).on("resize", function () {
    // cerrar el menu y quitar el active al botón al hacer resize
    if ($(window).width() > 768) {
      $(".menu-toggle").removeClass("active");
      $(".nav-list").removeClass("active");
    }
    handleNavListDisplay();
  });
});

/*** HANDLER PARA SCROLL ANCHOR ****/
$(document).ready(function () {
  const btnScroll = $(".btn-scroll");
  btnScroll.on("click", function (e) {
    e.preventDefault();

    const target = $(this).attr("href");
    if (!target.startsWith("#")) return;

    let screenWidth = $(window).width();
    let marginTop = screenWidth <= 768 ? 89 : 129;

    let targetSection = $(`${target}`);
    if (targetSection.length) {
      let offsetTop = targetSection.offset().top - marginTop;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  });
});

const modalObserver = new MutationObserver(() => {
  const anyModalShown = document.querySelector("body .modal.show");
  if (anyModalShown) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
});

// Configuración del observer
modalObserver.observe(document.body, {
  childList: true, // nodos añadidos o eliminados
  subtree: true, // todos los descendientes
  attributes: true, // cambios de atributos (como class)
  attributeFilter: ["class"], // solo cuando cambie la clase
});

// Estado para saber si la música está sonando
let sonidoActivo = false;

// Función para crear el botón
function crearBotonSonido() {
  const $btn = $(`
    <button class="btn-sound">
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z"></path><path d="M13.5 12c0-1.1-.9-2-2-2v4c1.1 0 2-.9 2-2z"></path><path d="M15.5 12c0-2.2-1.8-4-4-4v8c2.2 0 4-1.8 4-4z"></path></svg>
    </button>
  `);

  $("nav.nav .container-grid .wrapper-image-header").append($btn);

  $btn.on("click", async function () {
    if (!sonidoActivo) {
      // Activar música
      if (window.location.href.includes("battlegame.html")) {
        await reproducirBattleMidi();
      } else {
        await reproducirIntroMidi();
      }
      sonidoActivo = true;
      $(this).addClass('sound-active');
    } else {
      // Detener música
      /*if (window.location.href.includes("battlegame.html")) {
        detenerBattleMidi();
      } else {*/
        detenerMidi();
      //}
      sonidoActivo = false;
      $(this).removeClass('sound-active')
    }
  });
}

// Inicializar botón al cargar el DOM
$(document).ready(function () {
  crearBotonSonido();
});
