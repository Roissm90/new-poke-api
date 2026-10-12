import { iconMarkup } from "../icons.js";
import { createPokedexData } from "../pokedex-data.mjs";

// Número de cartas totales (12) => 6 parejas
const TOTAL_CARDS = 12;
const API_URL = "https://pokeapi.co/api/v2/pokemon/";
const loader = createPokedexData();

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let gameRevision = 0;
let mismatchTimer;

export async function initCardsGame() {
    const revision = ++gameRevision;
    clearTimeout(mismatchTimer);
    const $gameboard = $(".wrapper-activity-two .gameboard");
    $gameboard.empty().append('<p class="catalog-summary" role="status">Cargando parejas…</p>');

    firstCard = null;
    secondCard = null;
    lockBoard = false;

    // 1. Obtener 6 Pokémon aleatorios
    const randomIds = getRandomPokemonIds(TOTAL_CARDS / 2);
    const pokemonData = await Promise.all(randomIds.map(id => fetchPokemon(id)));
    if (revision !== gameRevision) return;
    $gameboard.empty();

    // 2. Duplicamos para formar parejas
    let cardsData = [...pokemonData, ...pokemonData];

    // 3. Barajamos
    cardsData = shuffle(cardsData);

    // 4. Creamos las cartas en el DOM
    $.each(cardsData, (index, pokemon) => {
        const $card = createCard(pokemon, index);
        $gameboard.append($card);
    });
}

function getRandomPokemonIds(count) {
    const maxPokemon = 1025; // total aprox de especies
    const ids = new Set();
    while (ids.size < count) {
        ids.add(Math.floor(Math.random() * maxPokemon) + 1);
    }
    return [...ids];
}

async function fetchPokemon(id) {
    const data = await loader.request(API_URL + id);

    const types = data.types.map(t => t.type.name);
    const typeClass = types.length === 1 
        ? `type-${types[0]}` 
        : `type-${types[0]}-${types[1]}`;

    return {
        id: data.id,
        name: data.name,
        image: data.sprites.other["official-artwork"].front_default,
        types,
        typeClass,
        cry: data.cries?.latest || null
    };
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function createCard(pokemon, index) {
    const $card = $(`
        <div class="card" role="button" tabindex="0" aria-label="Carta ${index + 1}" aria-pressed="false" data-pokemon-id="${pokemon.id}" data-index="${index}">
            <div class="card-inner">
                <div class="card-front bg-color-dark-third text-color-light-third">${iconMarkup("brand")}</div>
                <div class="card-back ${pokemon.typeClass}">
                    <img src="${pokemon.image}" alt="${pokemon.name}">
                </div>
            </div>
        </div>
    `);

    $card.on("click", () => flipCard($card, pokemon));
    $card.on("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flipCard($card, pokemon); }
    });
    return $card;
}

function flipCard($card, pokemon) {
    if (lockBoard) return;
    if ($card.hasClass("flipped")) return;

    $card.addClass("flipped").attr("aria-pressed", "true");

    if (!firstCard) {
        firstCard = { $el: $card, pokemon };
    } else {
        secondCard = { $el: $card, pokemon };
        checkMatch();
    }
}

function checkMatch() {
    if (!firstCard || !secondCard) return;

    const isMatch = firstCard.pokemon.id === secondCard.pokemon.id;

    if (isMatch) {
        // Mantener abiertas y sonar grito
        if (firstCard.pokemon.cry) {
            const audio = new Audio(firstCard.pokemon.cry);
            audio.play().catch(() => {});
        }

        firstCard = null;
        secondCard = null;
        checkWin();
    } else {
        lockBoard = true;
        mismatchTimer = setTimeout(() => {
            firstCard.$el.removeClass("flipped").attr("aria-pressed", "false");
            secondCard.$el.removeClass("flipped").attr("aria-pressed", "false");
            firstCard = null;
            secondCard = null;
            lockBoard = false;
        }, 1000);
    }
}

function checkWin() {
    const $allCards = $(".wrapper-activity-two .card");
    const $flipped = $allCards.filter(".flipped");

    if ($allCards.length === $flipped.length) {
        // si se ganó se muestra reiniciar
        $("#restartBtnActivityTwo").addClass("show");
    }
}

export function restartCardsGame() {
    return initCardsGame();
}