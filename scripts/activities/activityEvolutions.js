import { reveal } from "../motion.js";
import { createPokedexData } from "../pokedex-data.mjs";

const API_BASE = "https://pokeapi.co/api/v2";
const data = createPokedexData();

export async function initPokemonEvolutionGame() {
  const $pictureBase = $("#activityThree .picture-pkmn-base");
  const $options = $("#activityThree .wrapper-options .wrapper-option img");
  const $dropZone = $("#activityThree .next-evolution");
  const $msgParagraph = $(".msg-activity");
  let answered = false;

  const getRandomId = (max) => Math.floor(Math.random() * max) + 1;

  async function getRandomPokemon() {
    const randomId = getRandomId(1010);
    return data.request(`${API_BASE}/pokemon/${randomId}`);
  }

  async function getPokemonEvolution(pokemon) {
    const speciesJson = await data.request(pokemon.species.url);
    const evolutionUrl = speciesJson.evolution_chain?.url;
    if (!evolutionUrl) return null;
    const evoJson = await data.request(evolutionUrl);

    const evoChain = evoJson.chain;

    let evolutionName = null;
    if (
      evoChain.species.name === pokemon.name &&
      evoChain.evolves_to.length > 0
    ) {
      evolutionName = evoChain.evolves_to[0].species.name;
    } else if (
      evoChain.evolves_to[0] &&
      evoChain.evolves_to[0].species.name === pokemon.name &&
      evoChain.evolves_to[0].evolves_to.length > 0
    ) {
      evolutionName = evoChain.evolves_to[0].evolves_to[0].species.name;
    }

    if (!evolutionName) return null;

    return data.request(`${API_BASE}/pokemon/${evolutionName}`);
  }

  // NUEVO: Obtener la generación del Pokémon
  async function getPokemonGeneration(pokemon) {
    const speciesJson = await data.request(pokemon.species.url);
    const genUrl = speciesJson.generation.url;
    return data.request(genUrl);
  }

  // Fakes del mismo tipo y misma generación
  async function getRandomFakesByTypeAndGen(
    correctId,
    baseId,
    types,
    generation
  ) {
    const typeIds = await Promise.all(types.map(type => data.typeIds(type)));
    const candidates = generation.pokemon_species.map(species => ({ id: Number(species.url.split("/").filter(Boolean).pop()) }))
      .filter(species => species.id !== correctId && species.id !== baseId);
    const matching = candidates.filter(species => typeIds.some(ids => ids.has(species.id))).sort(() => Math.random() - .5);
    const remaining = candidates.filter(species => !matching.includes(species)).sort(() => Math.random() - .5);
    const choices = [...matching, ...remaining].slice(0, 2);
    return Promise.all(choices.map(species => data.request(`${API_BASE}/pokemon/${species.id}`)));
  }

  async function startGame(attempt = 0) {
    answered = true;
    $msgParagraph.text("Cargando evolución…").show();
    $options.parent().attr("aria-disabled", "true");
    try {
      if (attempt >= 30) throw new Error("No evolution available");
      const pokemon = await getRandomPokemon();
      const evolution = await getPokemonEvolution(pokemon);

      if (!evolution) {
        console.log("Este Pokémon no tiene evolución. Reiniciando...");
        return startGame(attempt + 1);
      }

      const pokemonTypes = pokemon.types.map((t) => t.type.name);
      const pokemonGen = await getPokemonGeneration(pokemon);

      // Pintar Pokémon base
      $pictureBase.attr({ src: pokemon.sprites.front_default, alt: pokemon.name });

      // Obtener distractores
      const fakes = await getRandomFakesByTypeAndGen(
        evolution.id,
        pokemon.id, 
        pokemonTypes,
        pokemonGen
      );

      // Mezclar opciones
      const options = [evolution, ...fakes].sort(() => Math.random() - 0.5);

      // Pintar imágenes
      $options.each((index, el) => {
        $(el).attr("src", options[index].sprites.front_default);
        $(el).attr("alt", options[index].name);
        $(el).attr("data-correct", options[index].id === evolution.id);
        $(el).parent().attr({ role: "button", tabindex: "0", "aria-label": `Elegir ${options[index].name}`, "aria-disabled": "false" })
          .off("click.evolution keydown.evolution").on("click.evolution", () => chooseEvolution($(el)))
          .on("keydown.evolution", (event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseEvolution($(el)); }
          });
        $(el).draggable({
          revert: "invalid",
          helper: function () {
            const $clone = $(this).clone();
            $clone.css({
              width: "100%",
              maxWidth: "90px",
              height: "auto",
            });
            return $clone;
          },
          cursor: "move",
        });
      });
      answered = false;
      $msgParagraph.text("Siguiente evolución");

      // Drop zone
      $dropZone.droppable({
        accept: "img",
        drop: function (event, ui) {
          chooseEvolution(ui.helper);
        },
      });
    } catch (error) {
      $msgParagraph.text("No se pudo cargar la evolución. Recarga para reintentar.");
      console.error("Error en el juego:", error);
    }
  }

  function chooseEvolution($choice) {
          if (answered) return;
          answered = true;
          $options.parent().attr("aria-disabled", "true");
          const isCorrect = $choice.attr("data-correct") === "true";

          // Actualizamos la imagen dentro de .next-evolution
          const $targetImg = $dropZone.find(".next-evolution-picture");
          $targetImg.attr({ src: $choice.attr("src"), alt: $choice.attr("alt") });

          if (isCorrect) {
            $pictureBase.addClass("revealed");
            $msgParagraph.hide();
            setTimeout(() => {
              $msgParagraph.text("Correcto");
              reveal($msgParagraph);
            }, 500);
          } else {
            $pictureBase.addClass("revealed");
            $msgParagraph.hide();
            setTimeout(() => {
              $msgParagraph.text("Incorrecto");
              reveal($msgParagraph);
            }, 500);
          }
          setTimeout(() => {
            $pictureBase.removeClass("revealed");
            $msgParagraph.hide();
            $targetImg.hide();
            setTimeout(() => {
              $targetImg.attr("src", "");
              reveal($targetImg);
              $msgParagraph.text("Siguiente evolución");
              reveal($msgParagraph);
            }, 500);
            startGame();
          }, 2000);
  }

  startGame();
}
