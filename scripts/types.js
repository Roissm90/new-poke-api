export const types = {
  normal: {
    strongAgainst: [],
    weakAgainst: ["rock", "steel"],
    noEffect: ["ghost"],
  },
  fire: {
    strongAgainst: ["grass", "ice", "bug", "steel"],
    weakAgainst: ["fire", "water", "rock", "dragon"],
    noEffect: [],
  },
  water: {
    strongAgainst: ["fire", "ground", "rock"],
    weakAgainst: ["water", "grass", "dragon"],
    noEffect: [],
  },
  grass: {
    strongAgainst: ["water", "ground", "rock"],
    weakAgainst: [
      "fire",
      "grass",
      "poison",
      "flying",
      "bug",
      "dragon",
      "steel",
    ],
    noEffect: [],
  },
  electric: {
    strongAgainst: ["water", "flying"],
    weakAgainst: ["electric", "grass", "dragon"],
    noEffect: ["ground"],
  },
  ice: {
    strongAgainst: ["grass", "ground", "flying", "dragon"],
    weakAgainst: ["fire", "water", "ice", "steel"],
    noEffect: [],
  },
  fighting: {
    strongAgainst: ["normal", "ice", "rock", "dark", "steel"],
    weakAgainst: ["poison", "flying", "psychic", "bug", "fairy"],
    noEffect: ["ghost"],
  },
  poison: {
    strongAgainst: ["grass", "fairy"],
    weakAgainst: ["poison", "ground", "rock", "ghost"],
    noEffect: ["steel"],
  },
  ground: {
    strongAgainst: ["fire", "electric", "poison", "rock", "steel"],
    weakAgainst: ["grass", "bug"],
    noEffect: ["flying"],
  },
  flying: {
    strongAgainst: ["grass", "fighting", "bug"],
    weakAgainst: ["electric", "rock", "steel"],
    noEffect: [],
  },
  psychic: {
    strongAgainst: ["fighting", "poison"],
    weakAgainst: ["psychic", "steel"],
    noEffect: ["dark"],
  },
  bug: {
    strongAgainst: ["grass", "psychic", "dark"],
    weakAgainst: ["fire", "fighting", "flying", "ghost", "steel", "fairy"],
    noEffect: [],
  },
  rock: {
    strongAgainst: ["fire", "ice", "flying", "bug"],
    weakAgainst: ["fighting", "ground", "steel"],
    noEffect: [],
  },
  ghost: {
    strongAgainst: ["psychic", "ghost"],
    weakAgainst: ["dark"],
    noEffect: ["normal"],
  },
  dragon: {
    strongAgainst: ["dragon"],
    weakAgainst: ["steel"],
    noEffect: ["fairy"],
  },
  dark: {
    strongAgainst: ["psychic", "ghost"],
    weakAgainst: ["fighting", "dark", "fairy"],
    noEffect: [],
  },
  steel: {
    strongAgainst: ["ice", "rock", "fairy"],
    weakAgainst: ["fire", "water", "electric", "steel"],
    noEffect: [],
  },
  fairy: {
    strongAgainst: ["fighting", "dragon", "dark"],
    weakAgainst: ["fire", "poison", "steel"],
    noEffect: [],
  },
};