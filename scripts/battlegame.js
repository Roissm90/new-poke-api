import { types } from "./types.js";
import { reproducirBattleMidi, detenerMidi } from "./sounds.js";

//console.log(types);

let playerCurrentHP;
let cpuCurrentHP;
let playerMaxHP;
let cpuMaxHP;
let victoryPicturePlayer;
let victoryPictureCPU;
const level = 50;

$(window).on("load", async function () {
  //await reproducirBattleMidi();
  AOS.init({
    duration: 800,
    easing: "ease-in-out-sine",
    once: true,
    mirror: false,
  });

  const closeModal = $(".modal-battle .close-modal");
  closeModal.click(function (e) {
    e.preventDefault();
    window.location.href = "game.html";
  });

  const pkmnStr = localStorage.getItem("pokemonToFight");
  const pkmnCPUstr = localStorage.getItem("pokemonToFightCPU");
  const pkmnStrMoves = localStorage.getItem("playerMoves");
  const pkmnCPUstrMoves = localStorage.getItem("cpuMoves");

  if (!pkmnStr || !pkmnCPUstr || !pkmnStrMoves || !pkmnCPUstrMoves) {
    $("#battle-container").html("<p>No hay Pokémon seleccionados.</p>");
    return;
  }

  const player = JSON.parse(pkmnStr);
  const cpu = JSON.parse(pkmnCPUstr);
  const playerMoves = JSON.parse(pkmnStrMoves);
  const cpuMoves = JSON.parse(pkmnCPUstrMoves);

  async function getBackSprite(pokemonId) {
    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
      );
      const data = await response.json();
      return data.sprites.back_default;
    } catch (error) {
      console.error("Error al obtener el sprite:", error);
      return null;
    }
  }

  async function getFrontSprite(pokemonId) {
    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
      );
      const data = await response.json();
      return data.sprites.front_default;
    } catch (error) {
      console.error("Error al obtener el sprite:", error);
      return null;
    }
  }

  const playerBackSprite = await getBackSprite(player.id);
  const playerFrontSprite = await getFrontSprite(player.id);
  victoryPicturePlayer = playerFrontSprite;
  const cpuFrontSprite = await getFrontSprite(cpu.id);
  victoryPictureCPU = cpuFrontSprite;

  $(".sprite-player").attr("src", playerBackSprite);
  $(".sprite-cpu").attr("src", cpuFrontSprite);

  $(".level-player").text(`Lv:${level}`);
  $(".level-cpu").text(`Lv:${level}`);

  // HP escalada con nivel
  playerMaxHP = Math.round(
    (player.stats.find((stat) => stat.name === "hp").base * level) / 15
  );
  cpuMaxHP = Math.round(
    (cpu.stats.find((stat) => stat.name === "hp").base * level) / 15
  );

  playerCurrentHP = playerMaxHP;
  cpuCurrentHP = cpuMaxHP;

  $(".ps-text-actual-player").text(playerCurrentHP);
  $(".ps-text-total-player").text(playerMaxHP);
  $(".ps-text-actual-cpu").text(cpuCurrentHP);
  $(".ps-text-total-cpu").text(cpuMaxHP);

  // Configuración de los movimientos del jugador
  for (let i = 0; i < 4; i++) {
    const move = playerMoves[i];
    if (move) {
      const $moveDiv = $(`.move-${i + 1}`);
      $moveDiv.find(".name").text(move.nameES);
      $moveDiv.find(".pp .actual").text(move.pp);
      $moveDiv.find(".pp .total").text(move.pp);

      $moveDiv.off("click").on("click", function () {
        let currentPP = parseInt($moveDiv.find(".pp .actual").text());
        if (currentPP > 0) {
          currentPP--;
          $moveDiv.find(".pp .actual").text(currentPP);

          const playerSpeed = player.stats.find(
            (stat) => stat.name === "speed"
          ).base;
          const cpuSpeed = cpu.stats.find((stat) => stat.name === "speed").base;
          const playerAttacksFirst = playerSpeed >= cpuSpeed;

          if (playerAttacksFirst) {
            atacarJugador(move, player, cpu);
            if (cpuCurrentHP > 0) {
              setTimeout(() => ataqueCPU(cpu, player), 600);
            }
          } else {
            ataqueCPU(cpu, player);
            if (playerCurrentHP > 0) {
              setTimeout(() => atacarJugador(move, player, cpu), 600);
            }
          }
        }
      });
    } else {
      $(`.move-${i + 1} .name`).text("");
    }
  }
});

// Función de cálculo de daño
function calcularDaño({
  nivel,
  ataque,
  defensa,
  poder,
  tipoPokemon,
  tipoAtaque,
  defensor,
  atacante,
  ui,
}) {
  const B = tipoPokemon.includes(tipoAtaque) ? 1.5 : 1; // STAB

  //console.log('ataque de atacante: ' + ataque);
  //console.log('defensa de defensor: ' + defensa);
  //console.log('poder de ataque: ' + poder);
  //console.log('tipo del pokemon defensor: ' + tipoPokemon);
  //console.log('tipo del ataque: ' + tipoAtaque);
  //console.log('ui: ' + ui)

  // Escalado de ataque y defensa con nivel
  ataque = Math.round((ataque * level) / 15);
  defensa = Math.round((defensa * level) / 15);

  let E = 1;
  tipoPokemon.forEach((tipoDefensor) => {
    if (types[tipoAtaque].noEffect.includes(tipoDefensor)) {
      E *= 0;
      if (defensor) {
        $(defensor).addClass("miss");
        setTimeout(() => $(defensor).removeClass("miss"), 1500);
      }
    } else if (types[tipoAtaque].weakAgainst.includes(tipoDefensor)) {
      E *= 0.5;
    } else if (types[tipoAtaque].strongAgainst.includes(tipoDefensor)) {
      E *= 2;
    } else {
      E *= 1;
    }
  });

  const V = Math.floor(Math.random() * (100 - 85 + 1) + 85); // Variación 85-100

  const probabilidadCritico = 0.1;
  const esCritico = Math.random() < probabilidadCritico;

  let daño =
    0.01 *
    B *
    E *
    V *
    (((0.2 * nivel + 1) * ataque * poder) / (25 * defensa) + 2);

  if (esCritico && daño !== 0) {
    daño *= 1.5;
    console.log("critico");
    $(atacante).addClass("critical");
    setTimeout(() => $(atacante).removeClass("critical"), 1500);
  }

  return Math.floor(daño);
}

// Función para mostrar modal de ganador
function mostrarModalGanador(nombreGanador, spriteGanador) {
  detenerMidi();
  const $modal = $(".modal-battle");
  $modal.find(".title").text(`${nombreGanador} ha ganado la batalla!`);
  $modal.find(".picture").attr("src", spriteGanador);
  $modal.addClass("show");
}

// Ataque del jugador
function atacarJugador(move, player, cpu) {
  const tipoAtaque = move.type;
  const poder = move.power || 0;
  const ataquePlayer =
    move.damage_class === "physical"
      ? player.stats.find((stat) => stat.name === "attack").base
      : player.stats.find((stat) => stat.name === "special-attack").base;
  const defensaCPU =
    move.damage_class === "physical"
      ? cpu.stats.find((stat) => stat.name === "defense").base
      : cpu.stats.find((stat) => stat.name === "special-defense").base;

  const dañoJugador = calcularDaño({
    nivel: level,
    ataque: ataquePlayer,
    defensa: defensaCPU,
    poder: poder,
    tipoPokemon: cpu.types.map((t) => t.nameEN),
    tipoAtaque,
    defensor: $(".wrapper-sprite-cpu"),
    atacante: $(".wrapper-sprite-player"),
    ui: "jugador",
  });

  cpuCurrentHP -= dañoJugador;
  if (cpuCurrentHP < 0) cpuCurrentHP = 0;

  actualizarPSVisual(
    $(".ps-bar-visual-cpu"),
    $(".ps-text-actual-cpu"),
    cpuCurrentHP,
    cpuMaxHP
  );

  if (cpuCurrentHP === 0) {
    setTimeout(() => {
      mostrarModalGanador(player.name, victoryPicturePlayer);
    }, 500);
  }
}

// Ataque CPU
function ataqueCPU(cpu, player) {
  const validMoves = cpu.moves.filter(
    (m) =>
      m.power !== null &&
      (m.damage_class === "physical" || m.damage_class === "special")
  );
  let move;
  if (validMoves.length > 0) {
    move = validMoves[Math.floor(Math.random() * validMoves.length)];
  } else {
    console.warn(`⚠ ${cpu.name} no tiene ataques con potencia definida.`);
  }

  const tipoAtaque = move.type;
  const poder = move.power || 0;

  const ataqueCPUStat =
    move.damage_class === "physical"
      ? cpu.stats.find((stat) => stat.name === "attack").base
      : cpu.stats.find((stat) => stat.name === "special-attack").base;
  const defensaPlayer =
    move.damage_class === "physical"
      ? player.stats.find((stat) => stat.name === "defense").base
      : player.stats.find((stat) => stat.name === "special-defense").base;

  const daño = calcularDaño({
    nivel: level,
    ataque: ataqueCPUStat,
    defensa: defensaPlayer,
    poder: poder,
    tipoPokemon: player.types.map((t) => t.nameEN),
    tipoAtaque,
    defensor: $(".wrapper-sprite-player"),
    atacante: $(".wrapper-sprite-cpu"),
    ui: "cpu",
  });

  const $mensajeCPU = $(".cpu-row .info-attack-cpu");
  $mensajeCPU.text(`${cpu.name} usó: ${move.nameES}`).fadeIn();
  setTimeout(() => $mensajeCPU.fadeOut(), 3000);

  playerCurrentHP -= daño;
  if (playerCurrentHP < 0) playerCurrentHP = 0;

  actualizarPSVisual(
    $(".ps-bar-visual-player"),
    $(".ps-text-actual-player"),
    playerCurrentHP,
    playerMaxHP
  );

  if (playerCurrentHP === 0) {
    setTimeout(() => {
      mostrarModalGanador(cpu.name, victoryPictureCPU);
    }, 500);
  }
}

// Actualizar barra de PS
function actualizarPSVisual($barra, $textoActual, psActual, psTotal, callback) {
  const porcentaje = (psActual / psTotal) * 100;
  $barra
    .find("span")
    .stop()
    .animate({ width: `${porcentaje}%` }, 500, "linear", function () {
      if (callback) callback();
    });

  let currentText = parseInt($textoActual.text());
  const diferencia = currentText - psActual;
  if (diferencia > 0) {
    const paso = diferencia / 20;
    let contador = 0;
    const interval = setInterval(() => {
      contador++;
      currentText -= paso;
      if (contador >= 20) {
        currentText = psActual;
        clearInterval(interval);
      }
      $textoActual.text(Math.floor(currentText));
    }, 25);
  } else {
    $textoActual.text(psActual);
  }
}
