let hintsRevealed = 0; // Lo subimos al scope global de este módulo
let tries = 3; // También lo subimos para poder reiniciar
let pkmnToGuessGlobal = null; // Guardaremos el Pokémon actual

export function initGame(pkmnToGuess, species, onNextPokemon = null) {
  hintsRevealed = 0;
  tries = 3;

  const hintInfos = $(".hint-two .hint-info, .hint-three .hint-info, .hint-four .hint-info");
  const hintOne = $(".hint-one .hint-info");
  const imgPkmn = $(".pkmn-to-guess-picture");
  const input = $(".input-guess");
  const msg = $(".msg-guess");
  const triesNumber = $(".tries-number");
  const triesText = $(".tries-text");
  const nextBtn = $("#nextPokemonBtn");

  // Ocultamos el botón cada vez que empezamos un nuevo juego
  nextBtn.hide();

  // Reset visual
  $(".hint-info").removeClass("revealed");
  $(".name-pkmn-to-guess").removeClass("revealed");
  $(".pkmn-to-guess-picture").addClass("silhouette").removeClass("revealed");
  msg.text("");
  input.val("").prop("disabled", false);
  triesNumber.text(tries);
  triesText.text("intentos");

  // Click sobre pistas numéricas y de descripción
  hintInfos.each(function () {
    const hint = $(this);
    hint.off("click").on("click", function () {
      if (!hint.hasClass("revealed")) {
        hint.addClass("revealed");
        hintsRevealed++;
      }
    });
  });

  // Click sobre pista de sonido
  hintOne.off("click").on("click", function () {
    if (!hintOne.hasClass("revealed")) {
      hintOne.addClass("revealed");
      hintsRevealed++;
    }
    if (pkmnToGuess && pkmnToGuess.cry) {
      const audio = new Audio(pkmnToGuess.cry);
      audio.play();
    }
  });

  // Click sobre la imagen del Pokémon
  imgPkmn.off("click").on("click", function () {
    if ($(this).hasClass("silhouette")) {
      $(this).removeClass("silhouette");
      hintsRevealed++;
    }
  });

  // Botón de jugar con otro Pokémon
  nextBtn.off("click").on("click", function () {
    if (onNextPokemon) onNextPokemon();
  });

  // Input para adivinar
  input.off("keydown").on("keydown", function (e) {
    if (e.key === "Enter") {
      const guess = input.val().trim().toLowerCase();
      if (!guess) return;

      const validNames = species.map((s) => s.name.toLowerCase());
      if (!validNames.includes(guess)) {
        msg.text("Introduce un nombre válido.");
        input.val("");
        return;
      }

      if (guess === pkmnToGuess.name.toLowerCase()) {
        msg.text(`¡Enhorabuena! Lo adivinaste con: ${hintsRevealed} pistas`);
        input.prop("disabled", true);
        $(".hint-info").not(".revealed").addClass("revealed");
        $(".name-pkmn-to-guess").addClass("revealed");
        $(".pkmn-to-guess-picture").addClass("revealed");
        nextBtn.fadeIn();
      } else {
        tries--;
        triesNumber.text(tries);
        triesText.text(tries === 1 ? "intento" : "intentos");

        if (tries <= 0) {
          $(".hint-info").not(".revealed").addClass("revealed");
          $(".pkmn-to-guess-picture").addClass("revealed");
          $(".name-pkmn-to-guess").addClass("revealed");
          msg.text("¡Se acabaron los intentos! Inténtalo otra vez.");
          input.prop("disabled", true);
          nextBtn.fadeIn();
        } else {
          msg.text("Inténtalo otra vez.");
        }
      }

      input.val("");
    }
  });

  return {
    getRevealedCount: () => hintsRevealed,
  };
}


export function resetGame() {
  hintsRevealed = 0;
  tries = 3;
  $(".hint-info").removeClass("revealed");
  $(".name-pkmn-to-guess").removeClass("revealed");
  $(".pkmn-to-guess-picture").addClass("silhouette").removeClass("revealed");
  $(".input-guess").val("").prop("disabled", false);
  $(".msg-guess").text("");
  $(".tries-number").text(tries);
  $(".tries-text").text("intentos");
  $("#nextPokemonBtn").hide();
}