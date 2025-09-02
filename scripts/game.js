window.onload = function () {
  const $sectionGame = $(".sctn-game");
  let currentPokemon = null; // ← Guardará el objeto completo del Pokémon del modal
  let pokemons = []; // ← Lista global de todos los Pokémon

  /*** SPINNER DE CARGA ***/
  const $spinner = $(`
    <div class="spinner bg-color-light">
        <div class="wrapper-bounces bg-color-dark"></div>
        <p class="bg-color-dark">Cargando Pokédex...</p>
    </div>
  `);
  $sectionGame.prepend($spinner);

  /*** FUNCIONES AUXILIARES ***/
  async function getTypeNameES(url) {
    const typeData = await $.ajax({ url, method: "GET" });
    return typeData.names.find((n) => n.language.name === "es")?.name || typeData.name;
  }

  async function getAbilityNameES(url) {
    const abilityData = await $.ajax({ url, method: "GET" });
    return abilityData.names.find((n) => n.language.name === "es")?.name || abilityData.name;
  }

  async function getMoveNameES(url) {
    const moveData = await $.ajax({ url, method: "GET" });
    return {
      nameES: moveData.names.find((n) => n.language.name === "es")?.name || moveData.name,
      nameEN: moveData.name,
      type: moveData.type.name,
      power: moveData.power,
      pp: moveData.pp,
      accuracy: moveData.accuracy,
      damage_class: moveData.damage_class.name,
    };
  }

  async function getPokemonData(poke) {
    try {
      const data = await $.ajax({ url: poke.url, method: "GET" });
      const speciesData = await $.ajax({ url: `https://pokeapi.co/api/v2/pokemon-species/${data.id}/`, method: "GET" });

      const nombreEsp = speciesData.names.find((n) => n.language.name === "es")?.name || data.name;
      const description = speciesData.flavor_text_entries.find((f) => f.language.name === "es")?.flavor_text || "";

      const abilities = await Promise.all(
        data.abilities.map(async (a) => ({ nameES: await getAbilityNameES(a.ability.url), nameEN: a.ability.name }))
      );

      const types = await Promise.all(
        data.types.map(async (t) => ({ nameES: await getTypeNameES(t.type.url), nameEN: t.type.name }))
      );

      const moves = await Promise.all(
        data.moves
          .filter((m) => m.version_group_details.some((v) => v.move_learn_method.name === "level-up"))
          .map(async (m) => {
            const moveInfo = await getMoveNameES(m.move.url);
            const levelDetail = m.version_group_details.find((v) => v.move_learn_method.name === "level-up");
            return { ...moveInfo, level_learned_at: levelDetail?.level_learned_at || null };
          })
      );

      const totalStats = data.stats.reduce((acc, s) => acc + s.base_stat, 0);

      return {
        id: data.id,
        name: nombreEsp,
        description,
        image: data.sprites.other["official-artwork"].front_default,
        abilities,
        types,
        stats: data.stats.map((s) => ({ name: s.stat.name, base: s.base_stat })),
        totalStats,
        moves,
      };
    } catch (err) {
      console.error("Error cargando Pokémon:", poke.name, err);
      return null;
    }
  }

  /*** OBTENER TODOS LOS POKÉMON ***/
  async function getAllPokemon() {
    try {
      const listData = await $.ajax({ url: "https://pokeapi.co/api/v2/pokemon?limit=1010", method: "GET" });
      const pokemonList = listData.results;
      const batchSize = 10;

      for (let i = 0; i < pokemonList.length; i += batchSize) {
        const batch = pokemonList.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(getPokemonData));
        pokemons.push(...batchResults.filter(Boolean));
      }

      $spinner.hide();
      console.log("TODOS LOS POKÉMON:", pokemons);

      /*** PINTAR EN LA LISTA ***/
      const $listContainer = $(".list-pokemon");
      $listContainer.empty();

      const statsES = {
        hp: "PS",
        attack: "Ataque",
        defense: "Defensa",
        "special-attack": "Ataque Especial",
        "special-defense": "Defensa Especial",
        speed: "Velocidad",
      };

      pokemons.forEach((p) => {
        const pokemonDiv = $(`
          <div class="pokemon-item btn btn-light" data-name="${p.name}" data-id="${p.id}">
            <img src="${p.image}" alt="${p.name}" />
            <span class="pokemon-name">${p.name}</span>
          </div>
        `);
        $listContainer.append(pokemonDiv);

        /*** CLICK EN POKÉMON PARA ABRIR MODAL ***/
        pokemonDiv.on("click", function () {
          const $modal = $(".modal-pokemon");
          $modal.addClass("show");
          currentPokemon = p; // Guardar Pokémon actual

          $modal.find(".title").text(p.name);
          $modal.find(".image").attr("src", p.image);

          const $typeList = $modal.find(".type");
          $typeList.empty();
          p.types.forEach((t) => $typeList.append(`<li class="text-color-dark type-item type-${t.nameEN}">${t.nameES}</li>`));

          p.stats.forEach((s) => $modal.find(`.stat-item.${s.name}`).text(`${statsES[s.name]}: ${s.base}`));
        });
      });

      /*** FILTRO POR INPUT EN TIEMPO REAL ***/
      $("#searchInputPokedex").on("keyup", function () {
        const query = $(this).val().toLowerCase();
        const $items = $listContainer.children();
        if (!query) { $items.show(); return; }

        let anyVisible = false;
        $items.each(function () {
          const $item = $(this);
          const name = $item.data("name").toLowerCase();
          const id = $item.data("id").toString();

          if (name.includes(query) || id.includes(query)) {
            $item.show();
            anyVisible = true;
          } else {
            $item.hide();
          }
        });

        if (!anyVisible) $items.show();
      });

      //Cerrar modal clic fuera
      const $modal = $(".modal-pokemon");
      $modal.on("click", function (e) {
        if (e.target === this) {
          $modal.removeClass("show");
          currentPokemon = null;
          localStorage.removeItem("pokemonToFightCPU");
        }
      });

      //Botón cerrar modal
      $(".close-modal").on("click", function () {
        $modal.removeClass("show");
        currentPokemon = null;
        localStorage.removeItem("pokemonToFightCPU");
      });

      //Cerrar modal con Escape
      $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
          $modal.removeClass("show");
          currentPokemon = null;
          localStorage.removeItem("pokemonToFightCPU");
        }
      });

      /*** GUARDAR POKÉMON EN LOCALSTORAGE AL HACER CLICK EN #battleBtn ***/
      $("#battleBtn").on("click", function () {
        if (!currentPokemon) {
          console.log('No hay Pokémon seleccionado');
          return;
        }

        // Pokémon jugador
        localStorage.setItem("pokemonToFight", JSON.stringify(currentPokemon));
        console.log("Pokémon del jugador guardado en localStorage:", currentPokemon);

        // Pokémon CPU aleatorio ±5 totalStats
        const minStats = currentPokemon.totalStats - 5;
        const maxStats = currentPokemon.totalStats + 5;

        let eligibleCPU = pokemons.filter(
          (p) => p.id !== currentPokemon.id && p.totalStats >= minStats && p.totalStats <= maxStats
        );

        let cpuPokemon;
        if (eligibleCPU.length === 0) {
          // Si no hay elegibles, cualquiera excepto el jugador
          eligibleCPU = pokemons.filter((p) => p.id !== currentPokemon.id);
          cpuPokemon = eligibleCPU[Math.floor(Math.random() * eligibleCPU.length)];
        } else {
          cpuPokemon = eligibleCPU[Math.floor(Math.random() * eligibleCPU.length)];
        }

        localStorage.setItem("pokemonToFightCPU", JSON.stringify(cpuPokemon));
        console.log("Pokémon CPU guardado en localStorage:", cpuPokemon);
      });

    } catch (err) {
      $spinner.find("p").text("Error al cargar la Pokédex");
      console.error("Error cargando lista de Pokémon", err);
    }
  }

  getAllPokemon();
};
