// slick-config.js
export function initSlickGallery($grid) {
  if (!$grid.hasClass("slick-initialized")) {
    $grid.slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      centerPadding: "2rem",
      infinite: true,
      arrows: true,
      dots: false,
      centerMode: true,
      responsive: [
        {
          breakpoint: 991,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1,
            centerPadding: "1rem",
            infinite: true,
            arrows: false,
            dots: true,
            centerMode: true,
          },
        },
        {
          breakpoint: 769,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            centerPadding: "1rem",
            infinite: true,
            arrows: false,
            dots: true,
            centerMode: true,
          },
        },
        {
          breakpoint: 430,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            centerPadding: "1rem",
            infinite: true,
            arrows: false,
            dots: true,
            centerMode: true,
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
