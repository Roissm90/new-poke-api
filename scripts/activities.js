//import { reproducirBattleMidi, detenerBattleMidi } from "./sounds.js";
import { initGame, resetGame } from "./activities/activityGuess.js";
import { initCardsGame, restartCardsGame } from "./activities/activityCards.js";
import { initPokemonEvolutionGame } from "./activities/activityEvolutions.js";
import { initRace } from "./activities/activityRace.js";
import { reveal } from "./motion.js";
import { icon } from "./icons.js";
import { typeBadgeMarkup } from "./type-badges.mjs";

$(window).on("load", async function () {
  let guessRevision = 0;
  function guessLoadError(revision) {
    if (revision !== guessRevision) return;
    $(".msg-guess").text("No se pudo cargar el Pokémon. Vuelve a seleccionar la generación.");
    $(".input-guess").prop("disabled", true);
    $("#nextPokemonBtn").hide();
  }
  //await reproducirBattleMidi();
  //ACTIVITY ONE
  $.getJSON("https://pokeapi.co/api/v2/generation?limit=1000", function (data) {
    const generations = data.results;
    const listGenerations = $(
      ".container-grid-gameboard .wrapper-activity-one .gameboard .list-generations .item-gemeration"
    );

    listGenerations.each(function (index) {
      const gen = generations[index];
      if (gen) {
        const genNumber = index + 1;
        const textGen = `${genNumber}ª Generación`;

        // Ponemos texto y URL
        $(this).text(textGen);
        $(this).attr("data-url", gen.url);
      } else {
        // Si hay más <li> que generaciones
        $(this).text("No disponible");
        $(this).attr("data-url", "");
      }
    });

    // Evento click para seleccionar generación y obtener Pokémon aleatorio
    listGenerations.attr({ role: "button", tabindex: "0", "aria-pressed": "false" }).on("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $(this).trigger("click"); }
    });
    listGenerations.click(function () {
      const revision = ++guessRevision;
      listGenerations.removeClass("active").attr("aria-pressed", "false");
      $(this).toggleClass("active").attr("aria-pressed", "true");
      resetGame();
      $(".input-guess").prop("disabled", true);
      $(".msg-guess").text("Cargando Pokémon…");
      const genUrl = $(this).data("url");

      if (genUrl) {
        $.getJSON(genUrl, function (genData) {
          if (revision !== guessRevision) return;
          const species = genData.pokemon_species;
          if (species && species.length > 0) {
            // Elegir Pokémon aleatorio primero
            const randomIndex = Math.floor(Math.random() * species.length);
            const randomSpecies = species[randomIndex];

            // Petición al endpoint principal del Pokémon
            $.getJSON(
              `https://pokeapi.co/api/v2/pokemon/${randomSpecies.name}/`,
              function (pokemonData) {
                if (revision !== guessRevision) return;
                // Obtenemos datos básicos
                const pokemonId = pokemonData.id;
                const sprite =
                  pokemonData.sprites.other["official-artwork"].front_default;
                const cry =
                  pokemonData.cries.latest || pokemonData.cries.legacy;
                const types = pokemonData.types.map((t) => t.type.name);

                // Creamos objeto para almacenar los datos
                let pkmnToGuess = {
                  id: pokemonId,
                  name: pokemonData.name,
                  sprite: sprite,
                  cry: cry,
                  description: "",
                  types: types,
                };

                // Segunda petición para obtener descripción en español
                $.getJSON(
                  `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`,
                  function (speciesData) {
                    if (revision !== guessRevision) return;
                    const entryEs = speciesData.flavor_text_entries.find(
                      (entry) => entry.language.name === "es"
                    );
                    pkmnToGuess.description = entryEs
                      ? entryEs.flavor_text.replace(/\n|\f/g, " ")
                      : "Descripción no disponible";

                    // Consoleamos el objeto completo del Pokémon a adivinar
                    console.log("Pokémon a adivinar:", pkmnToGuess);

                    let wrapperActGuess = $("#activityOne");
                    let namePkmnGuess = wrapperActGuess.find(
                      ".name-pkmn-to-guess"
                    );
                    namePkmnGuess.text(pkmnToGuess.name);
                    let imgPkmnGuess = wrapperActGuess.find(
                      ".pkmn-to-guess-picture"
                    );
                    imgPkmnGuess.attr("src", sprite);
                    let hintOne = wrapperActGuess.find(".hint-one .hint-info");
                    hintOne.empty();
                    hintOne.append(icon("sound"));
                    let hintTwo = wrapperActGuess.find(".hint-two .hint-info");
                    hintTwo.text(pkmnToGuess.id);
                    let hintThree = wrapperActGuess.find(
                      ".hint-three .hint-info"
                    );
                    hintThree.removeClass(function (index, className) {
                      return (className.match(/(^|\s)type-\S+/g) || []).join(
                        " "
                      );
                    });
                    hintThree.html(pkmnToGuess.types.map(typeBadgeMarkup).join(""));
                    let hintFour = wrapperActGuess.find(
                      ".hint-four .hint-info"
                    );
                    hintFour.text(pkmnToGuess.description);
                    initGame(pkmnToGuess, species, onNextPokemon);
                  }
                ).fail(() => guessLoadError(revision));

                // Definimos la función onNextPokemon ANTES de usarla
                function onNextPokemon() {
                  if (revision !== guessRevision) return;
                  const randomIndex = Math.floor(
                    Math.random() * species.length
                  );
                  const randomSpecies = species[randomIndex];

                  $.getJSON(
                    `https://pokeapi.co/api/v2/pokemon/${randomSpecies.name}/`,
                    function (pokemonData) {
                      if (revision !== guessRevision) return;
                      const pokemonId = pokemonData.id;
                      const sprite =
                        pokemonData.sprites.other["official-artwork"]
                          .front_default;
                      const cry =
                        pokemonData.cries.latest || pokemonData.cries.legacy;
                      const types = pokemonData.types.map((t) => t.type.name);

                      let newPkmn = {
                        id: pokemonId,
                        name: pokemonData.name,
                        sprite: sprite,
                        cry: cry,
                        description: "",
                        types: types,
                      };

                      $.getJSON(
                        `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`,
                        function (speciesData) {
                          if (revision !== guessRevision) return;
                          const entryEs = speciesData.flavor_text_entries.find(
                            (entry) => entry.language.name === "es"
                          );
                          newPkmn.description = entryEs
                            ? entryEs.flavor_text.replace(/\n|\f/g, " ")
                            : "Descripción no disponible";

                          // Actualizamos la UI con el nuevo Pokémon
                          let wrapperActGuess = $("#activityOne");
                          wrapperActGuess
                            .find(".name-pkmn-to-guess")
                            .text(newPkmn.name);
                          wrapperActGuess
                            .find(".pkmn-to-guess-picture")
                            .attr("src", sprite);

                          let hintTwo = wrapperActGuess.find(
                            ".hint-two .hint-info"
                          );
                          hintTwo.text(newPkmn.id);

                          let hintThree = wrapperActGuess.find(
                            ".hint-three .hint-info"
                          );
                          hintThree.removeClass(function (index, className) {
                            return (
                              className.match(/(^|\s)type-\S+/g) || []
                            ).join(" ");
                          });
                          hintThree.html(newPkmn.types.map(typeBadgeMarkup).join(""));

                          let hintFour = wrapperActGuess.find(
                            ".hint-four .hint-info"
                          );
                          hintFour.text(newPkmn.description);

                          // Reiniciamos el juego con el nuevo Pokémon
                          initGame(newPkmn, species, onNextPokemon);
                        }
                      ).fail(() => guessLoadError(revision));
                    }
                  ).fail(() => guessLoadError(revision));
                }

              }
            ).fail(() => guessLoadError(revision));
          } else {
            console.log("No hay Pokémon en esta generación.");
          }
        }).fail(function () {
          if (revision === guessRevision) $(".msg-guess").text("No se pudo cargar la generación. Vuelve a seleccionarla.");
          console.error("Error al obtener los datos de la generación.");
        });
      }
    });
    //simular el click para que el primero sea la primera generacion
    listGenerations.first().trigger("click");
  }).fail(() => {
    $(".msg-guess").text("No se pudieron cargar las generaciones. Recarga para reintentar.");
    $(".input-guess").prop("disabled", true);
  });

  $(".wrapper-activity").hide();
  reveal($(".wrapper-activity-one"));

  const gridGame = $(".container-grid-gameboard");
  let activity = $(".list-activities .activity-item");
  activity.first().addClass("active");
  const initialized = new Set(["#activityOne"]);

  function loadCards(restart = false) {
    (restart ? restartCardsGame() : initCardsGame()).catch(() => {
      const $board = $("#activityTwo .gameboard").empty();
      $board.append($('<p role="status">').text("No se pudieron cargar las parejas."));
      $board.append($('<button type="button" class="btn btn-light">').text("Reintentar").on("click", () => loadCards(restart)));
    });
  }

  function initializeActivity(target) {
    if (initialized.has(target)) return;
    initialized.add(target);
    if (target === "#activityTwo") loadCards();
    if (target === "#activityThree") initPokemonEvolutionGame();
    if (target === "#activityFour") initRace($("#activityFour .gameboard"), $("#startBtn"), $("#status"));
  }

  activity.attr({ role: "button", tabindex: "0" }).each(function () {
    $(this).attr("aria-pressed", $(this).hasClass("active"));
  }).on("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $(this).trigger("click"); }
  });

  activity.click(function () {
    let thisItem = $(this);

    activity.removeClass("active").attr("aria-pressed", "false");
    thisItem.toggleClass("active").attr("aria-pressed", "true");

    let target = thisItem.data("target");
    gridGame.find(".wrapper-activity").hide();
    reveal(gridGame.find(target));
    initializeActivity(target);
  });

  $("#nextPokemonBtn").click(function () {
    resetGame();
  });

  //ACTIVITY TWO
  $("#restartBtnActivityTwo").on("click", function () {
    const $board = $(".wrapper-activity-two .gameboard");
    $("#restartBtnActivityTwo").removeClass("show");

    $board.fadeOut(parseFloat(getComputedStyle($board[0]).getPropertyValue("--enter-duration")) || 900, function () {
      loadCards(true);
      reveal($board);
    });
  });

  //ACTIVITY THREE

  //ACTIVITY FOUR
  const resetBtn = $(".wrapper-activity-four #resetBtn");
  resetBtn.off("click").on("click", async () => {
    initRace(
      $(".wrapper-activity-four .gameboard"),
      $(".wrapper-activity-four #startBtn"),
      $(".wrapper-activity-four #status")
    );
  });
});
