//import { reproducirBattleMidi, detenerBattleMidi } from "./sounds.js";
import { initGame, resetGame } from "./activities/activityGuess.js";
import { initCardsGame, restartCardsGame } from "./activities/activityCards.js";
import { initPokemonEvolutionGame } from "./activities/activityEvolutions.js";
import { initRace } from "./activities/activityRace.js";

const typeTranslations = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  grass: "Planta",
  electric: "Eléctrico",
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
};

$(window).on("load", async function () {
  //await reproducirBattleMidi();
  AOS.init({
    duration: 800,
    easing: "ease-in-out-sine",
    once: true,
    mirror: false,
  });

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
    listGenerations.click(function () {
      listGenerations.removeClass("active");
      $(this).toggleClass("active");
      resetGame();
      const genUrl = $(this).data("url");

      if (genUrl) {
        $.getJSON(genUrl, function (genData) {
          const species = genData.pokemon_species;
          if (species && species.length > 0) {
            // Elegir Pokémon aleatorio primero
            const randomIndex = Math.floor(Math.random() * species.length);
            const randomSpecies = species[randomIndex];

            // Petición al endpoint principal del Pokémon
            $.getJSON(
              `https://pokeapi.co/api/v2/pokemon/${randomSpecies.name}/`,
              function (pokemonData) {
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
                    hintOne.append(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M13.5 12c0-1.1-.9-2-2-2v4c1.1 0 2-.9 2-2z"/><path d="M15.5 12c0-2.2-1.8-4-4-4v8c2.2 0 4-1.8 4-4z"/></svg>'
                    );
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
                    const types = pkmnToGuess.types;
                    const translatedTypes = pkmnToGuess.types.map(
                      (type) => typeTranslations[type] || type
                    );
                    hintThree.text(translatedTypes.join(" - "));
                    if (pkmnToGuess.types.length === 1) {
                      hintThree.addClass(`type-${pkmnToGuess.types[0]}`);
                    } else if (pkmnToGuess.types.length === 2) {
                      hintThree.addClass(
                        `type-${pkmnToGuess.types[0]}-${pkmnToGuess.types[1]}`
                      );
                    }
                    let hintFour = wrapperActGuess.find(
                      ".hint-four .hint-info"
                    );
                    hintFour.text(pkmnToGuess.description);
                  }
                );

                // Definimos la función onNextPokemon ANTES de usarla
                function onNextPokemon() {
                  const randomIndex = Math.floor(
                    Math.random() * species.length
                  );
                  const randomSpecies = species[randomIndex];

                  $.getJSON(
                    `https://pokeapi.co/api/v2/pokemon/${randomSpecies.name}/`,
                    function (pokemonData) {
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
                          const translatedTypes = newPkmn.types.map(
                            (type) => typeTranslations[type] || type
                          );
                          hintThree.text(translatedTypes.join(" - "));
                          if (newPkmn.types.length === 1) {
                            hintThree.addClass(`type-${newPkmn.types[0]}`);
                          } else if (newPkmn.types.length === 2) {
                            hintThree.addClass(
                              `type-${newPkmn.types[0]}-${newPkmn.types[1]}`
                            );
                          }

                          let hintFour = wrapperActGuess.find(
                            ".hint-four .hint-info"
                          );
                          hintFour.text(newPkmn.description);

                          // Reiniciamos el juego con el nuevo Pokémon
                          initGame(newPkmn, species, onNextPokemon);
                        }
                      );
                    }
                  );
                }

                // Inicializamos el juego y pasamos onNextPokemon como callback
                const hintsModule = initGame(
                  pkmnToGuess,
                  species,
                  onNextPokemon
                );
              }
            );
          } else {
            console.log("No hay Pokémon en esta generación.");
          }
        }).fail(function () {
          console.error("Error al obtener los datos de la generación.");
        });
      }
    });
    //simular el click para que el primero sea la primera generacion
    listGenerations.first().trigger("click");
  });

  $(".wrapper-activity").hide();
  $(".wrapper-activity-one").slideDown();

  const gridGame = $(".container-grid-gameboard");
  let activity = $(".list-activities .activity-item");

  activity.click(function () {
    let thisItem = $(this);

    activity.removeClass("active");
    thisItem.toggleClass("active");

    let target = thisItem.data("target");
    gridGame.find(".wrapper-activity").hide();
    gridGame.find(target).fadeIn(500);
  });

  $("#nextPokemonBtn").click(function () {
    resetGame();
  });

  //ACTIVITY TWO
  initCardsGame();
  $("#restartBtnActivityTwo").on("click", function () {
    const $board = $(".wrapper-activity-two .gameboard");
    $("#restartBtnActivityTwo").removeClass("show");

    $board.fadeOut(300, function () {
      restartCardsGame();
      $board.fadeIn(1000);
    });
  });

  //ACTIVITY THREE
  initPokemonEvolutionGame();

  //ACTIVITY FOUR
  initRace(
    $(".wrapper-activity-four .gameboard"),
    $(".wrapper-activity-four #startBtn"),
    $(".wrapper-activity-four #status")
  );
  const resetBtn = $(".wrapper-activity-four #resetBtn");
  resetBtn.off("click").on("click", async () => {
    initRace(
      $(".wrapper-activity-four .gameboard"),
      $(".wrapper-activity-four #startBtn"),
      $(".wrapper-activity-four #status")
    );
  });
});
