$(document).ready(async function () {
  const tiposEspañol = {
    normal: "Normal",
    fire: "Fuego",
    water: "Agua",
    electric: "Eléctrico",
    grass: "Planta",
    ice: "Hielo",
    fighting: "Lucha",
    poison: "Veneno",
    ground: "Tierra",
    flying: "Volador",
    psychic: "Psíquico",
    bug: "Bicho",
    rock: "Roca",
    ghost: "Fantasma",
    dragon: "Dragón",
    dark: "Siniestro",
    steel: "Acero",
    fairy: "Hada",
    shadow: "Siniestro", // Algunos movimientos shadow se pueden mapear a Siniestro
  };

  const url = "https://pokeapi.co/api/v2/move?limit=1000"; // Obtener todos los movimientos
  let movimientosData;
  try {
    movimientosData = await $.get(url);
    console.log(movimientosData);
  } catch (error) {
    console.error("Error al cargar la lista de movimientos:", error);
    return;
  }

  const movimientosEnEspañol = [];

  for (let i = 0; i < movimientosData.results.length; i++) {
    const movimiento = movimientosData.results[i];
    try {
      const detalle = await $.get(movimiento.url);
      const nombreEsp = detalle.names.find((n) => n.language.name === "es");
      if (nombreEsp) {
        const efectoEsp =
          detalle.effect_entries.find((e) => e.language.name === "es")
            ?.effect || "";
        const movObj = {
          name: nombreEsp.name,
          type: detalle.type.name,
          power: detalle.power,
          accuracy: detalle.accuracy,
          pp: detalle.pp,
          effect: efectoEsp,
          damage_class: detalle.damage_class.name,
        };
        movimientosEnEspañol.push(movObj);

        // Crear el <li> y añadirlo al UL
        const li = $(
          `<li class="move-item text-color-dark" data-aos="fade-up" data-aos-delay="300">${movObj.name}</li>`
        );
        li.css("cursor", "pointer"); // opcional, para que parezca clicable

        // Añadir evento click para abrir el modal
        li.on("click", function () {
          $(".modal-move").addClass("show");
          $(".modal-move .title").text(movObj.name);
          const damageEsp =
            {
              physical: "Físico",
              special: "Especial",
              status: "Estado",
            }[movObj.damage_class] || movObj.damage_class;
          $(".modal-move .damage-class").text(`Tipo de daño: ${damageEsp}`);
          $(".modal-move .power").text(
            `Poder: ${movObj.power ? movObj.power : "-"}`
          );
          if (movObj.effect !== "") {
            $(".modal-move .description").text(`Efecto: ${movObj.effect}`);
          } else {
            $(".modal-move .description").hide();
          }

          $(".modal-move .accuracy").text(
            `Precisión: ${movObj.accuracy ? movObj.accuracy : 100}`
          );
          $(".modal-move .pp").text(`PP: ${movObj.pp ? movObj.pp : 5}`);
          const tipoEsp = tiposEspañol[movObj.type] || movObj.type;
          $(".modal-move .list-moves-types")
            .empty()
            .append(
              `<li class="type-${
                movObj.type === "shadow" ? "dark" : movObj.type
              }">${movObj.type === "shadow" ? "Siniestro" : tipoEsp}</li>`
            );
        });

        $(".list-moves").append(li);
      }
    } catch (e) {
      console.error(`Error cargando movimiento ${movimiento.name}:`, e);
    }
  }

  console.log(movimientosEnEspañol);

  //FILTRO DE BÚSQUEDA DINÁMICO
  $("#search-move").on("keyup", function () {
    const filter = $(this).val().toLowerCase();

    $(".move-item").each(function () {
      const text = $(this).text().toLowerCase();
      $(this).toggle(text.includes(filter));
    });
  });

  //Cerrar modal clic fuera
  const $modal = $(".modal-move");
  $modal.on("click", function (e) {
    if (e.target === this) {
      $modal.removeClass("show");
    }
  });

  //Botón para cerrar modal
  $(".close-modal").on("click", function () {
    $modal.removeClass("show");
  });

  //Cerrar modal con Escape
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") $modal.removeClass("show");
  });
});
