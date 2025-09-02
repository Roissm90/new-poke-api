const API_BASE = "https://pokeapi.co/api/v2";

export async function initPokemonEvolutionGame() {
  const $pictureBase = $("#activityThree .picture-pkmn-base");
  const $options = $("#activityThree .wrapper-options .wrapper-option img");
  const $dropZone = $("#activityThree .next-evolution");
  const $msgParagraph = $(".msg-activity");

  const getRandomId = (max) => Math.floor(Math.random() * max) + 1;

  async function getRandomPokemon() {
    const randomId = getRandomId(1010);
    const response = await fetch(`${API_BASE}/pokemon/${randomId}`);
    return await response.json();
  }

  async function getPokemonEvolution(pokemon) {
    const speciesData = await fetch(pokemon.species.url);
    const speciesJson = await speciesData.json();
    const evolutionUrl = speciesJson.evolution_chain.url;

    const evoData = await fetch(evolutionUrl);
    const evoJson = await evoData.json();

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

    const evolutionResponse = await fetch(
      `${API_BASE}/pokemon/${evolutionName}`
    );
    return await evolutionResponse.json();
  }

  // NUEVO: Obtener la generación del Pokémon
  async function getPokemonGeneration(pokemon) {
    const speciesData = await fetch(pokemon.species.url);
    const speciesJson = await speciesData.json();
    const genUrl = speciesJson.generation.url;
    const genData = await fetch(genUrl);
    const genJson = await genData.json();
    return genJson.name;
  }

  // Fakes del mismo tipo y misma generación
  async function getRandomFakesByTypeAndGen(
    correctId,
    baseId,
    types,
    generation
  ) {
    const fakes = [];
    const usedIds = new Set([correctId, baseId]);

    while (fakes.length < 2) {
      const randomId = getRandomId(1010);
      if (usedIds.has(randomId)) continue; // ya usado

      const res = await fetch(`${API_BASE}/pokemon/${randomId}`);
      const data = await res.json();
      const dataTypes = data.types.map((t) => t.type.name);

      // Verificamos tipo
      if (!types.some((type) => dataTypes.includes(type))) continue;

      // Verificamos generación
      const fakeSpeciesData = await fetch(data.species.url);
      const fakeSpeciesJson = await fakeSpeciesData.json();
      const fakeGenUrl = fakeSpeciesJson.generation.url;
      const fakeGenData = await fetch(fakeGenUrl);
      const fakeGenJson = await fakeGenData.json();

      if (fakeGenJson.name !== generation) continue;

      // Evitamos repetir fakes
      if (usedIds.has(data.id)) continue;

      fakes.push(data);
      usedIds.add(data.id);
    }

    return fakes;
  }

  async function startGame() {
    try {
      const pokemon = await getRandomPokemon();
      const evolution = await getPokemonEvolution(pokemon);

      if (!evolution) {
        console.log("Este Pokémon no tiene evolución. Reiniciando...");
        return startGame();
      }

      const pokemonTypes = pokemon.types.map((t) => t.type.name);
      const pokemonGen = await getPokemonGeneration(pokemon);

      // Pintar Pokémon base
      $pictureBase.attr("src", pokemon.sprites.front_default);

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
        $(el).attr("data-correct", options[index].id === evolution.id);
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

      // Drop zone
      $dropZone.droppable({
        accept: "img",
        drop: function (event, ui) {
          const isCorrect = ui.helper.attr("data-correct") === "true";

          // Actualizamos la imagen dentro de .next-evolution
          const $targetImg = $dropZone.find(".next-evolution-picture");
          $targetImg.attr("src", ui.helper.attr("src"));

          if (isCorrect) {
            $pictureBase.addClass("revealed");
            $msgParagraph.fadeOut();
            setTimeout(() => {
              $msgParagraph.text("Correcto");
              $msgParagraph.fadeIn();
            }, 500);
          } else {
            $pictureBase.addClass("revealed");
            $msgParagraph.fadeOut();
            setTimeout(() => {
              $msgParagraph.text("Incorrecto");
              $msgParagraph.fadeIn();
            }, 500);
          }
          setTimeout(() => {
            $pictureBase.removeClass("revealed");
            $msgParagraph.fadeOut();
            $targetImg.fadeOut();
            setTimeout(() => {
              $targetImg.attr("src", "");
              $targetImg.fadeIn();
              $msgParagraph.text("Arrastra al recuadro la solución");
              $msgParagraph.fadeIn();
            }, 500);
            startGame();
          }, 2000);
        },
      });
    } catch (error) {
      console.error("Error en el juego:", error);
    }
  }

  startGame();
}
