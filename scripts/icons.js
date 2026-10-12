import createElement from "../node_modules/lucide/dist/esm/createElement.js";
import Menu from "../node_modules/lucide/dist/esm/icons/menu.js";
import X from "../node_modules/lucide/dist/esm/icons/x.js";
import Volume2 from "../node_modules/lucide/dist/esm/icons/volume-2.js";
import VolumeX from "../node_modules/lucide/dist/esm/icons/volume-x.js";
import ChevronLeft from "../node_modules/lucide/dist/esm/icons/chevron-left.js";
import ChevronRight from "../node_modules/lucide/dist/esm/icons/chevron-right.js";
import ChevronDown from "../node_modules/lucide/dist/esm/icons/chevron-down.js";
import Circle from "../node_modules/lucide/dist/esm/icons/circle.js";
import Search from "../node_modules/lucide/dist/esm/icons/search.js";
import RotateCcw from "../node_modules/lucide/dist/esm/icons/rotate-ccw.js";
import Play from "../node_modules/lucide/dist/esm/icons/play.js";

const Pokeball = ["svg", Circle[1], [
  ["circle", { cx: "12", cy: "12", r: "10", fill: "#fff" }],
  ["path", { d: "M2 12a10 10 0 0 1 20 0Z", fill: "currentColor", stroke: "none" }],
  ["path", { d: "M2 12h7m6 0h7" }],
  ["circle", { cx: "12", cy: "12", r: "3", fill: "#171b20", stroke: "#171b20" }],
]];

const icons = {
  menu: Menu, close: X, sound: Volume2, "sound-off": VolumeX,
  previous: ChevronLeft, next: ChevronRight, expand: ChevronDown,
  brand: Pokeball, dot: Circle, search: Search, restart: RotateCcw, play: Play,
};

export function icon(name) {
  const element = createElement(icons[name]);
  element.classList.add("atlas-icon");
  element.setAttribute("data-icon", name);
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("focusable", "false");
  element.setAttribute("stroke-width", "1.75");
  return element;
}

export function iconMarkup(name) {
  return icon(name).outerHTML;
}