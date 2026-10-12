import { iconMarkup } from "./icons.js";

// slick-config.js
export function initSlickGallery($grid) {
  if (!$grid.hasClass("slick-initialized")) {
    $grid.slick({
      slidesToShow: 3,
      slidesToScroll: 1,
      centerPadding: "0",
      infinite: true,
      arrows: true,
      dots: false,
      prevArrow: `<button type="button" class="slick-prev" aria-label="Pokémon anterior" title="Pokémon anterior">${iconMarkup("previous")}</button>`,
      nextArrow: `<button type="button" class="slick-next" aria-label="Pokémon siguiente" title="Pokémon siguiente">${iconMarkup("next")}</button>`,
      customPaging: (slider, index) => `<button type="button" aria-label="Ir al Pokémon ${index + 1}">${iconMarkup("dot")}</button>`,
      centerMode: true,
      responsive: [
        {
          breakpoint: 991,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
            centerPadding: "0",
            infinite: true,
            arrows: false,
            dots: false,
            centerMode: true,
          },
        },
        {
          breakpoint: 640,
          settings: {
            slidesToShow: 1,
            arrows: false,
            dots: false,
          },
        },
      ],
    });
  }
}

export function destroySlickGallery($grid) {
  if ($grid.hasClass("slick-initialized")) {
    $grid.slick("unslick");
  }
}

export function handleResponsiveSlick($grid) {
  function checkWidth() {
    if ($(window).width() <= 991) {
      console.log($(window).width());
      initSlickGallery($grid);
    } else {
      destroySlickGallery($grid);
    }
  }

  checkWidth();
  $(window).on("resize", checkWidth);
}
