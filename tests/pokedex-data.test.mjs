import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPokedexData, filterCatalog, PAGE_SIZE, TYPE_NAMES } from "../scripts/pokedex-data.mjs";
import { compareAbilities, compareMoves, machineNumber, resolveMachineNumber } from "../scripts/catalog-order.mjs";
import { createBattleData, usableBattleMoves, battleMoveName } from "../scripts/game-data.mjs";
import { typeKey, typeBadgeMarkup } from "../scripts/type-badges.mjs";
import { createMovesData, filterMoves } from "../scripts/moves-data.mjs";
const motionSource = await readFile(new URL("../scripts/motion.js", import.meta.url));
const { reveal, initializeMotion, SCROLL_BLOCK_SELECTOR } = await import(`data:text/javascript;base64,${motionSource.toString("base64")}`);
const musicSource = await readFile(new URL("../scripts/sounds.js", import.meta.url), "utf8");
const { createMusicPlayer } = await import(`data:text/javascript;base64,${Buffer.from(musicSource).toString("base64")}#music-state-tests`);

function musicFixture({ state = "running", fetcher, midi } = {}) {
  const audio = new EventTarget();
  audio.state = state;
  const storage = new Map();
  const positions = new Map();
  const timers = new Map();
  const notes = [];
  const requests = [];
  const synths = [];
  let clock = 0;
  let permission = state === "running";
  let timerId = 0;
  const changeContext = next => { audio.state = next; audio.dispatchEvent(new Event("statechange")); };
  const tone = {
    getContext: () => ({ rawContext: audio }), now: () => clock, Synth: class {},
    start: () => { if (!permission) return new Promise(() => {}); changeContext("running"); return Promise.resolve(); },
    PolySynth: class {
      constructor() { synths.push(this); }
      toDestination() { return this; }
      triggerAttackRelease(...values) { notes.push(values); }
      dispose() { this.disposed = true; }
    },
  };
  const player = createMusicPlayer({ getTone: () => tone,
    getStorage: () => ({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }),
    getPositionStorage: () => ({ getItem: key => positions.get(key) ?? null, setItem: (key, value) => positions.set(key, value) }),
    resolveUrl: path => path,
    fetcher: (url, options) => { requests.push({ url, signal: options.signal });
      return fetcher ? fetcher(url, options) : Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }); },
    parseMidi: () => midi || { tracks: [{ notes: [{ name: "C4", time: 0, duration: 8, velocity: 1 }] }] },
    setTimer: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimer: timer => timers.delete(timer),
  });
  return { player, tone, audio, storage, positions, timers, notes, requests, synths, changeContext,
    permit: () => { permission = true; }, clock: value => { clock = value; } };
}

async function flushMusicTasks() {
  for (let step = 0; step < 15; step += 1) await Promise.resolve();
}

test("music reload with saved preference never reports playing while autoplay is blocked", async () => {
  const fixture = musicFixture({ state: "suspended" });
  fixture.storage.set("pokeatlas:music", "true");
  const states = [];
  fixture.player.subscribe(state => states.push(state.status));
  const pending = fixture.player.play("intro");
  assert.deepEqual(fixture.player.getState(), { enabled: true, status: "blocked", error: null });
  assert.equal(fixture.requests.length, 0);
  assert.ok(!states.includes("playing"));
  fixture.permit();
  assert.equal(fixture.player.play("intro"), pending);
  await pending;
  assert.equal(fixture.player.getState().status, "playing");
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.notes.length, 1);
  fixture.player.stop();
});

test("music remains pending until audio really runs even when resume resolves without permission", async () => {
  const fixture = musicFixture({ state: "suspended" });
  fixture.tone.start = async () => {};
  const pending = fixture.player.play("intro");
  await flushMusicTasks();
  assert.equal(fixture.player.getState().status, "blocked");
  assert.equal(fixture.notes.length, 0);
  fixture.changeContext("running");
  await pending;
  assert.equal(fixture.player.getState().status, "playing");
  fixture.player.stop();
});

test("music permission timeout stays blocked and can be retried without switching the preference off", async () => {
  const fixture = musicFixture({ state: "suspended" });
  fixture.player.setEnabled(true);
  const pending = fixture.player.play("intro");
  const rejected = assert.rejects(pending, { name: "NotAllowedError" });
  [...fixture.timers.values()][0].callback();
  await rejected;
  assert.equal(fixture.player.getState().status, "blocked");
  assert.equal(fixture.player.isEnabled(), true);
  fixture.permit();
  await fixture.player.play("intro");
  assert.equal(fixture.player.getState().status, "playing");
  fixture.player.stop();
});

test("music cancellation during pending permission never starts after a later context resume", async () => {
  const fixture = musicFixture({ state: "suspended" });
  fixture.player.setEnabled(true);
  const pending = fixture.player.play("intro");
  fixture.player.setEnabled(false);
  fixture.changeContext("running");
  await pending;
  assert.equal(fixture.player.getState().status, "off");
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.notes.length, 0);
  assert.equal(fixture.timers.size, 0);
});

test("music loading is cancellable and rapid off-on does not reuse an aborted request", async () => {
  const responses = [];
  const fixture = musicFixture({ fetcher: () => new Promise(resolve => responses.push(resolve)) });
  fixture.player.setEnabled(true);
  const first = fixture.player.play("intro");
  await flushMusicTasks();
  assert.equal(fixture.player.getState().status, "loading");
  assert.equal(fixture.player.play("intro"), first);
  fixture.player.setEnabled(false);
  assert.equal(fixture.requests[0].signal.aborted, true);
  fixture.player.setEnabled(true);
  const second = fixture.player.play("intro");
  await flushMusicTasks();
  assert.equal(fixture.requests.length, 2);
  const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  responses[1](response);
  await second;
  responses[0](response);
  await first;
  assert.equal(fixture.player.getState().status, "playing");
  assert.equal(fixture.notes.length, 1);
  fixture.player.stop();
});

test("music failed downloads show error instead of playing and retries evict failed cache", async () => {
  let fail = true;
  const fixture = musicFixture({ fetcher: async () => ({ ok: !fail, status: 503,
    arrayBuffer: async () => new ArrayBuffer(0) }) });
  await assert.rejects(fixture.player.play("intro"), /HTTP 503/);
  assert.equal(fixture.player.getState().status, "error");
  assert.equal(fixture.notes.length, 0);
  fail = false;
  await fixture.player.play("intro");
  assert.equal(fixture.requests.length, 2);
  assert.equal(fixture.player.getState().status, "playing");
  fixture.player.stop();
});

test("music download timeout cancels fetch and allows a clean retry", async () => {
  let fail = true;
  const fixture = musicFixture({ fetcher: (url, { signal }) => fail
    ? new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError"))))
    : Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) });
  const pending = fixture.player.play("intro");
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await flushMusicTasks();
  [...fixture.timers.values()][0].callback();
  await rejected;
  assert.equal(fixture.player.getState().status, "error");
  fail = false;
  await fixture.player.play("intro");
  assert.equal(fixture.player.getState().status, "playing");
  fixture.player.stop();
});

test("music empty or malformed MIDI cannot report playing", async () => {
  for (const midi of [{ tracks: [] }, { tracks: [{ notes: [{ time: NaN, duration: -1 }] }] }, {}]) {
    const fixture = musicFixture({ midi });
    await assert.rejects(fixture.player.play("intro"));
    assert.equal(fixture.player.getState().status, "error");
    assert.equal(fixture.notes.length, 0);
    assert.equal(fixture.timers.size, 0);
  }
});

test("music suspension reports blocked and resume preserves remaining notes with one loop", async () => {
  const fixture = musicFixture();
  await fixture.player.play("intro");
  fixture.clock(3.05);
  fixture.changeContext("suspended");
  assert.equal(fixture.player.getState().status, "blocked");
  assert.equal(fixture.timers.size, 0);
  fixture.changeContext("running");
  assert.equal(fixture.player.getState().status, "playing");
  assert.equal(fixture.timers.size, 1);
  assert.equal(fixture.notes[1][1], 5);
  assert.equal(fixture.synths[0].disposed, true);
  fixture.changeContext("closed");
  assert.equal(fixture.player.getState().status, "error");
  assert.equal(fixture.timers.size, 0);
});

test("music track changes cancel stale starts and repeated play never duplicates synths", async () => {
  const responses = new Map();
  const fixture = musicFixture({ fetcher: url => new Promise(resolve => responses.set(url, resolve)) });
  const first = fixture.player.play("intro");
  await flushMusicTasks();
  const battle = fixture.player.play("battle");
  await flushMusicTasks();
  const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  responses.get("battle")(response);
  await battle;
  responses.get("intro")(response);
  await first;
  await fixture.player.play("battle");
  assert.equal(fixture.notes.length, 1);
  assert.equal(fixture.timers.size, 1);
  fixture.player.stop();
  fixture.player.stop();
  assert.ok(fixture.synths.every(synth => synth.disposed));
});

test("music unavailable audio engine and synthesis failures do not leave a playing state", async () => {
  const unavailable = createMusicPlayer({ getTone: () => undefined });
  await assert.rejects(unavailable.play("intro"), /motor de audio/);
  assert.equal(unavailable.getState().status, "error");
  const fixture = musicFixture();
  fixture.tone.PolySynth.prototype.triggerAttackRelease = () => { throw new Error("Synth failure"); };
  await fixture.player.play("intro");
  assert.equal(fixture.player.getState().status, "error");
  assert.ok(fixture.synths.every(synth => synth.disposed));
  assert.equal(fixture.timers.size, 0);
});

test("music rejection from an obsolete resume cannot cancel a new track", async () => {
  const fixture = musicFixture({ state: "suspended" });
  let rejectOld;
  let attempts = 0;
  fixture.tone.start = () => {
    attempts += 1;
    return attempts === 2 ? new Promise((resolve, reject) => { rejectOld = reject; }) : new Promise(() => {});
  };
  const first = fixture.player.play("intro");
  fixture.player.play("intro");
  fixture.player.stop();
  await first;
  const next = fixture.player.play("battle");
  rejectOld(new Error("Old resume failure"));
  await flushMusicTasks();
  assert.equal(fixture.player.getState().status, "blocked");
  fixture.changeContext("running");
  await next;
  assert.equal(fixture.player.getState().status, "playing");
  assert.equal(fixture.notes.length, 1);
  fixture.player.stop();
});

test("music can rebuild a closed Tone context when retrying", async () => {
  const fixture = musicFixture();
  await fixture.player.play("intro");
  fixture.changeContext("closed");
  assert.equal(fixture.player.getState().status, "error");
  fixture.tone.Context = class {
    constructor() { this.rawContext = new EventTarget(); this.rawContext.state = "running"; }
  };
  fixture.tone.setContext = context => { fixture.tone.getContext = () => context; };
  await fixture.player.play("intro");
  assert.equal(fixture.player.getState().status, "playing");
  assert.equal(fixture.tone.getContext().rawContext.state, "running");
  fixture.player.stop();
});

test("music operates in memory when browser storage is unavailable", async () => {
  const fixture = musicFixture();
  const player = createMusicPlayer({ getTone: () => fixture.tone,
    getStorage: () => { throw new Error("Storage denied"); },
    getPositionStorage: () => { throw new Error("Storage denied"); },
    resolveUrl: path => path, fetcher: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
    parseMidi: () => ({ tracks: [{ notes: [{ name: "C4", time: 0, duration: 1 }] }] }),
    setTimer: () => 1, clearTimer: () => {} });
  player.setEnabled(true);
  assert.equal(player.isEnabled(), true);
  await player.play("intro");
  assert.equal(player.getState().status, "playing");
  player.setEnabled(false);
  assert.equal(player.getState().status, "off");
});

test("music preference persists across page modules and remembers disabling", async () => {
  const storage = new Map();
  const originalStorage = globalThis.localStorage;
  const source = await readFile(new URL("../scripts/sounds.js", import.meta.url), "utf8");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value) };
  try {
    const firstPage = await import(`${moduleUrl}#music-first-page`);
    assert.equal(firstPage.isMusicEnabled(), false);
    firstPage.setMusicEnabled(true);
    const nextPage = await import(`${moduleUrl}#music-next-page`);
    assert.equal(nextPage.isMusicEnabled(), true);
    nextPage.setMusicEnabled(false);
    assert.equal(firstPage.isMusicEnabled(), false);
    const thirdPage = await import(`${moduleUrl}#music-third-page`);
    assert.equal(thirdPage.isMusicEnabled(), false);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test("music stops pending playback and loops without restarting after disabling", async context => {
  const originalTone = globalThis.Tone;
  const originalMidi = globalThis.Midi;
  const timers = new Map();
  const notes = [];
  const synths = [];
  const urls = [];
  let timerId = 0;
  let finishFetch;
  const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  context.mock.method(globalThis, "setTimeout", callback => {
    timers.set(++timerId, callback);
    return timerId;
  });
  context.mock.method(globalThis, "clearTimeout", timer => timers.delete(timer));
  context.mock.method(globalThis, "fetch", url => {
    urls.push(url);
    return urls.length === 1 ? new Promise(resolve => { finishFetch = resolve; }) : Promise.resolve(response);
  });
  globalThis.Tone = { start: async () => {}, now: () => 0, Synth: class {},
    PolySynth: class {
      constructor() { synths.push(this); }
      toDestination() { return this; }
      triggerAttackRelease(...values) { notes.push(values); }
      dispose() { this.disposed = true; }
    } };
  globalThis.Midi = class {
    constructor() { this.tracks = [{ notes: [{ name: "C4", time: 0, duration: 1, velocity: 1 }] }]; }
  };
  const source = (await readFile(new URL("../scripts/sounds.js", import.meta.url), "utf8"))
    .replaceAll("import.meta.url", JSON.stringify(new URL("../scripts/sounds.js", import.meta.url).href));
  const sounds = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#music-playback`);
  try {
    const pending = sounds.reproducirIntroMidi();
    for (let attempt = 0; attempt < 10 && !finishFetch; attempt += 1) await Promise.resolve();
    assert.equal(typeof finishFetch, "function");
    sounds.detenerMidi();
    finishFetch(response);
    await pending;
    assert.equal(notes.length, 0);
    assert.equal(timers.size, 0);
    await sounds.reproducirIntroMidi();
    assert.equal(notes.length, 1);
    assert.equal(timers.size, 1);
    const loop = [...timers.values()][0];
    timers.clear();
    loop();
    assert.equal(notes.length, 2);
    assert.equal(synths[0].disposed, true);
    sounds.detenerMidi();
    loop();
    assert.equal(notes.length, 2);
    assert.equal(timers.size, 0);
    assert.ok(synths.every(synth => synth.disposed));
    await sounds.reproducirBattleMidi();
    assert.ok(urls[0].endsWith("/assets/audio/intro.mid"));
    assert.ok(urls[1].endsWith("/assets/audio/intro.mid"));
    assert.ok(urls[2].endsWith("/assets/audio/battle.mid"));
    assert.equal(notes.length, 3);
  } finally {
    sounds.detenerMidi();
    if (originalTone === undefined) delete globalThis.Tone;
    else globalThis.Tone = originalTone;
    if (originalMidi === undefined) delete globalThis.Midi;
    else globalThis.Midi = originalMidi;
  }
});

test("music resumes across page modules at its saved position, including held notes and loop timing", async context => {
  const originals = Object.fromEntries(["Tone", "Midi", "sessionStorage"].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]
  ));
  const storage = new Map();
  const notes = [];
  const timers = new Map();
  let clock = 0;
  let timerId = 0;
  context.mock.method(globalThis, "setTimeout", (callback, delay) => {
    timers.set(++timerId, { callback, delay });
    return timerId;
  });
  context.mock.method(globalThis, "clearTimeout", timer => timers.delete(timer));
  context.mock.method(globalThis, "fetch", async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }));
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value),
  } });
  globalThis.Tone = { start: async () => {}, now: () => clock, Synth: class {},
    PolySynth: class {
      toDestination() { return this; }
      triggerAttackRelease(...values) { notes.push(values); }
      dispose() {}
    } };
  globalThis.Midi = class {
    constructor() {
      this.tracks = [{ notes: [
        { name: "C4", time: 0, duration: 2, velocity: 1 },
        { name: "E4", time: 2, duration: 2, velocity: 1 },
        { name: "G4", time: 6, duration: 2, velocity: 1 },
      ] }];
    }
  };
  const source = (await readFile(new URL("../scripts/sounds.js", import.meta.url), "utf8"))
    .replaceAll("import.meta.url", JSON.stringify(new URL("../scripts/sounds.js", import.meta.url).href));
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  let currentPage;
  try {
    currentPage = await import(`${moduleUrl}#music-position-first`);
    await currentPage.reproducirIntroMidi();
    clock = 3.05;
    currentPage.detenerMidi();
    assert.equal(Number([...storage.values()][0]), 3);
    clock = 0;
    notes.length = 0;
    currentPage = await import(`${moduleUrl}#music-position-next`);
    await currentPage.reproducirIntroMidi();
    assert.deepEqual(notes.map(([name, duration]) => ({ name, duration })), [
      { name: "E4", duration: 1 }, { name: "G4", duration: 2 },
    ]);
    assert.ok(Math.abs(notes[0][2] - 0.05) < 0.00001);
    assert.ok(Math.abs(notes[1][2] - 3.05) < 0.00001);
    const loop = [...timers.values()][0];
    assert.ok(Math.abs(loop.delay - 5050) < 0.00001);
    timers.clear();
    notes.length = 0;
    clock = 5.05;
    loop.callback();
    assert.deepEqual(notes.map(([name]) => name), ["C4", "E4", "G4"]);
    assert.ok(Math.abs([...timers.values()][0].delay - 8050) < 0.00001);
    clock = 6.1;
    currentPage.detenerMidi();
    assert.ok(Math.abs(Number([...storage.values()][0]) - 1) < 0.00001);
    storage.set([...storage.keys()][0], "invalid");
    notes.length = 0;
    await currentPage.reproducirIntroMidi();
    assert.equal(notes[0][0], "C4");
  } finally {
    currentPage?.detenerMidi();
    Object.entries(originals).forEach(([key, descriptor]) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
});

test("hero totals use live species, generation and type counts, not fixed values or form counts", async () => {
  const calls = [];
  const types = [...Object.keys(TYPE_NAMES), "stellar", "unknown", "shadow", "cosmic"];
  const counts = { "pokemon-species": 1100, generation: 10, type: types.length };
  const data = createPokedexData(async url => {
    calls.push(url);
    const resource = new URL(url).pathname.split("/").pop();
    return { ok: true, json: async () => ({ count: counts[resource], next: null, results: types.map(name => ({ name })) }) };
  });
  assert.deepEqual(await data.totals(), { pokemon: 1100, generations: 10, types: 19 });
  assert.deepEqual(await data.totals(), { pokemon: 1100, generations: 10, types: 19 });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(url => new URL(url).searchParams.get("limit") === (url.includes("/type?") ? "100" : "1")));
});

test("hero totals count standard types across every API page", async () => {
  const next = "https://pokeapi.co/api/v2/type?offset=3&limit=100";
  const data = createPokedexData(async url => ({ ok: true, json: async () => {
    if (!url.includes("/type?")) return { count: 10 };
    const second = url === next;
    return { count: 7, next: second ? null : next,
      results: (second ? ["fairy", "dark", "unknown", "shadow"] : ["fire", "water", "stellar"]).map(name => ({ name })) };
  } }));
  assert.deepEqual(await data.totals(), { pokemon: 10, generations: 10, types: 4 });
});

test("hero totals reject invalid counts rather than displaying fabricated numbers", async () => {
  let invalid = true;
  const data = createPokedexData(async () => ({ ok: true, json: async () => ({ count: invalid ? null : 42,
    next: null, results: [{ name: "normal" }] }) }));
  await assert.rejects(data.totals(), /Invalid .* count/);
  invalid = false;
  assert.deepEqual(await data.totals(), { pokemon: 42, generations: 42, types: 1 });
});

test("hero totals retry an invalid type list instead of caching a false total", async () => {
  let invalid = true;
  const data = createPokedexData(async () => ({ ok: true, json: async () => ({ count: 1,
    next: null, results: invalid ? null : [{ name: "normal" }] }) }));
  await assert.rejects(data.totals(), /Invalid type list/);
  invalid = false;
  assert.deepEqual(await data.totals(), { pokemon: 1, generations: 1, types: 1 });
});

test("all type badges use local SVGs, translated accessible labels and no visible text", async () => {
  for (const [key, label] of Object.entries(TYPE_NAMES)) {
    assert.equal(typeKey(label), key);
    assert.equal(typeKey(key), key);
    const markup = typeBadgeMarkup(label);
    assert.match(markup, new RegExp(`data-type="${key}"`));
    assert.ok(markup.includes(`aria-label="${label}"`));
    assert.ok(markup.includes(`title="${label}"`));
    assert.match(markup, new RegExp(`/assets/types/${key}\\.svg`));
    assert.ok(!markup.includes(`>${label}<`));
    const source = await readFile(new URL(`../assets/types/${key}.svg`, import.meta.url), "utf8");
    assert.match(source, /<svg\s/);
    assert.match(source, /viewBox=/);
    assert.ok(!source.includes("<script"));
  }
  assert.equal(typeKey(" ELECTRICO "), "electric");
  assert.equal(typeKey("shadow"), "dark");
  assert.equal(typeBadgeMarkup("<script>"), "");
});

test("the shared brand SVG is a Pokeball with its dividing line and center button", async () => {
  const source = await readFile(new URL("../scripts/icons.js", import.meta.url), "utf8");
  const modules = new URL("../node_modules/", import.meta.url).href;
  const moduleSource = source.replaceAll('"../node_modules/', `"${modules}`);
  const { icon } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElementNS(namespace, tag) {
      assert.equal(typeof tag, "string");
      return { namespace, tag, attributes: {}, children: [], classList: { add() {} },
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { this.children.push(child); },
      };
    },
  };
  try {
    const brand = icon("brand");
    assert.equal(brand.tag, "svg");
    assert.equal(brand.attributes.viewBox, "0 0 24 24");
    assert.equal(brand.attributes["aria-hidden"], "true");
    assert.deepEqual(brand.children.map(child => child.tag), ["circle", "path", "path", "circle"]);
    assert.equal(brand.children[1].attributes.fill, "currentColor");
    assert.equal(brand.children[2].attributes.d, "M2 12h7m6 0h7");
    assert.equal(brand.children[3].attributes.fill, "#171b20");
  } finally {
    globalThis.document = originalDocument;
  }
});

test("abilities are alphabetical in Spanish, with deterministic ties", () => {
  const abilities = [{ id: 3, nombre: "Zeta" }, { id: 2, nombre: "Ánimo" }, { id: 1, nombre: "animo" }];
  assert.deepEqual(abilities.sort(compareAbilities).map((ability) => ability.id), [1, 2, 3]);
});

test("the local moves index is paginated and searchable before any remote detail request", async () => {
  const index = JSON.parse(await readFile(new URL("../data/moves-index.json", import.meta.url), "utf8"));
  const requests = [];
  const data = createMovesData(async (url) => {
    requests.push(url);
    assert.ok(url.endsWith("/data/moves-index.json"));
    return { ok: true, json: async () => index };
  });
  const catalog = await data.catalog();
  assert.ok(catalog.moves.length > 900);
  assert.equal(catalog.moves.slice(0, PAGE_SIZE).length, 20);
  assert.equal(catalog.moves[0].machineNumber, 1);
  assert.equal(filterMoves(catalog.moves, "MT141")[0].name, "Llamarada");
  assert.ok(filterMoves(catalog.moves, "pun").some(move => move.name.includes("Puño")));
  assert.deepEqual(filterMoves(catalog.moves, "no-existe"), []);
  assert.equal(requests.length, 1);
});

test("move modal metadata is deferred, cached and retains Spanish names and effects", async () => {
  const requests = [];
  const data = createMovesData(async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({
      names: [{ language: { name: "es" }, name: "Placaje" }], type: { name: "normal" },
      power: 40, accuracy: 100, pp: 35, damage_class: { name: "physical" }, effect_entries: [],
      flavor_text_entries: [{ language: { name: "es" }, flavor_text: "Ataca\ncon fuerza." }],
    }) };
  });
  assert.equal(requests.length, 0);
  const entry = { id: 33, name: "Placaje", machineNumber: null };
  assert.equal((await data.detail(entry)).effect, "Ataca con fuerza.");
  assert.equal((await data.detail(entry)).name, "Placaje");
  assert.equal(requests.length, 1);
});

test("moves use numeric TM order, including TM00, and put non-TM moves last", () => {
  assert.equal(machineNumber("tm001"), 1);
  assert.equal(machineNumber("tm00"), 0);
  assert.equal(machineNumber("hm01"), null);
  assert.equal(machineNumber("unknown"), null);
  const moves = [{ id: 1, machineNumber: null }, { id: 2, machineNumber: 100 }, { id: 3, machineNumber: 2 }, { id: 4, machineNumber: 0 }];
  assert.deepEqual(moves.sort(compareMoves).map((move) => move.id), [4, 3, 2, 1]);
});

test("TM numbers are resolved only from the selected version group", async () => {
  const move = { machines: [
    { version_group: { name: "red-blue" }, machine: { url: "old" } },
    { version_group: { name: "scarlet-violet" }, machine: { url: "current" } },
  ] };
  const calls = [];
  const request = async (url) => { calls.push(url); return { item: { name: "tm141" } }; };
  assert.equal(await resolveMachineNumber(move, "scarlet-violet", request), 141);
  assert.deepEqual(calls, ["current"]);
  assert.equal(await resolveMachineNumber(move, "sword-shield", request), null);
  assert.equal(await resolveMachineNumber({ machines: [] }, "scarlet-violet", request), null);
  assert.deepEqual(calls, ["current"]);
});

test("pagination and filters use the complete lightweight catalog", () => {
  const catalog = Array.from({ length: 45 }, (_, index) => ({ id: index + 1, name: `pokemon-${index + 1}` }));
  assert.equal(catalog.slice(0, PAGE_SIZE).length, 20);
  assert.equal(catalog.slice(40, 60).length, 5);
  assert.deepEqual(filterCatalog(catalog, " 45 "), [catalog[44]]);
  assert.deepEqual(filterCatalog(catalog, "", new Set([42])), [catalog[41]]);
});

test("requests are bounded, deduplicated and preserve the detail contract", async () => {
  let active = 0;
  let peak = 0;
  let calls = 0;
  const data = createPokedexData(async (url) => {
    calls += 1;
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    const id = Number(url.split("/").pop());
    return { ok: true, json: async () => ({
      id, name: `pokemon-${id}`, sprites: { other: { "official-artwork": { front_default: "art.png" } } },
      types: [{ type: { name: "grass" } }], abilities: [],
      stats: [{ stat: { name: "hp" }, base_stat: 45 }], weight: 69, height: 7,
      cries: { latest: "cry.ogg" },
    }) };
  }, 3);
  const entries = Array.from({ length: 20 }, (_, index) => ({ url: `https://example.test/${index + 1}` }));
  const results = await Promise.all(entries.map((entry) => data.pokemon(entry)));
  assert.equal(peak, 3);
  assert.equal(calls, 20);
  assert.equal(results[0].types[0], "Planta");
  assert.deepEqual(results[0].stats, [{ name: "hp", base: 45 }]);
  await data.detail(entries[0]);
  assert.equal(calls, 20);
});

test("failed requests can be retried", async () => {
  let calls = 0;
  const data = createPokedexData(async () => {
    calls += 1;
    return { ok: false, status: 503 };
  });
  const entry = { url: "https://example.test/1" };
  await assert.rejects(data.pokemon(entry), /503/);
  await assert.rejects(data.pokemon(entry), /503/);
  assert.equal(calls, 2);
});

test("catalog and type indexes include Pokemon outside the first page", async () => {
  const data = createPokedexData(async (url) => ({ ok: true, json: async () =>
    url.includes("/type/")
      ? { pokemon: [{ pokemon: { url: "https://pokeapi.co/api/v2/pokemon/1000/" } }] }
      : { results: [{ name: "gholdengo", url: "https://pokeapi.co/api/v2/pokemon/1000/" }] },
  }));
  const catalog = await data.catalog();
  const ids = await data.typeIds("steel");
  assert.equal(catalog[0].id, 1000);
  assert.deepEqual(filterCatalog(catalog, "gholdengo", ids), catalog);
});

test("ability translations are deferred until a detail is opened and cached", async () => {
  const urls = [];
  const data = createPokedexData(async (url) => {
    urls.push(url);
    return { ok: true, json: async () => url.includes("ability")
      ? { names: [{ language: { name: "es" }, name: "Espesura" }] }
      : {
        id: 1, name: "bulbasaur", sprites: { other: { "official-artwork": { front_default: "art.png" } } },
        types: [{ type: { name: "grass" } }],
        abilities: [{ ability: { name: "overgrow", url: "https://example.test/ability/65" } }],
        stats: [], weight: 69, height: 7, cries: {},
      },
    };
  });
  const entry = { url: "https://example.test/pokemon/1" };
  assert.deepEqual((await data.pokemon(entry)).abilities, ["overgrow"]);
  assert.equal(urls.length, 1);
  assert.deepEqual((await data.detail(entry)).abilities, ["Espesura"]);
  await data.detail(entry);
  assert.equal(urls.length, 2);
});

function battleFixture(totals = [318, 322, 500], failMoveOnce = false) {
  const entries = totals.map((total, index) => ({ id: index + 1, name: `pokemon-${index + 1}`, url: `https://example.test/pokemon/${index + 1}` }));
  const routes = new Map([
    ["https://pokeapi.co/api/v2/pokemon?limit=1025", { results: entries }],
    ["https://example.test/ability/1", { names: [{ language: { name: "es" }, name: "Espesura" }] }],
    ["https://example.test/move/1", {
      name: "tackle", names: [{ language: { name: "es" }, name: "Placaje" }],
      type: { name: "normal" }, power: 40, pp: 35, accuracy: 100, damage_class: { name: "physical" },
    }],
  ]);
  entries.forEach((entry, index) => {
    routes.set(entry.url, {
      id: entry.id, name: entry.name, species: { url: `https://example.test/species/${entry.id}` },
      sprites: { other: { "official-artwork": { front_default: "art.png" } } },
      types: [{ type: { name: "grass" } }],
      abilities: [{ ability: { name: "overgrow", url: "https://example.test/ability/1" } }],
      stats: ["hp", "attack", "defense", "special-attack", "special-defense", "speed"].map((name, statIndex) => ({
        stat: { name }, base_stat: statIndex === 0 ? totals[index] : 0,
      })),
      moves: [
        { move: { name: "tackle", url: "https://example.test/move/1" }, version_group_details: [{ move_learn_method: { name: "level-up" }, level_learned_at: 0 }] },
        { move: { name: "protect", url: "https://example.test/move/2" }, version_group_details: [{ move_learn_method: { name: "machine" }, level_learned_at: 0 }] },
      ],
    });
    routes.set(`https://example.test/species/${entry.id}`, {
      names: [{ language: { name: "es" }, name: `Pokemon ${entry.id}` }],
      flavor_text_entries: [{ language: { name: "es" }, flavor_text: "Descripcion" }],
    });
  });
  const requests = [];
  let active = 0;
  let peak = 0;
  const data = createBattleData(async (url) => {
    requests.push(url);
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    if (failMoveOnce && url === "https://example.test/move/1") {
      failMoveOnce = false;
      return { ok: false, status: 503 };
    }
    assert.ok(routes.has(url), `Unexpected request: ${url}`);
    return { ok: true, json: async () => structuredClone(routes.get(url)) };
  });
  return { data, entries, requests, get peak() { return peak; } };
}

test("battle pages and prefetch use six requests at most and defer all battle metadata", async () => {
  const fixture = battleFixture(Array(45).fill(318));
  const catalog = await fixture.data.catalog();
  await Promise.all(catalog.slice(0, PAGE_SIZE).map((entry) => fixture.data.pokemon(entry, true)));
  await Promise.all(catalog.slice(PAGE_SIZE, PAGE_SIZE * 2).map((entry) => fixture.data.pokemon(entry)));
  assert.equal(fixture.requests.length, 41);
  assert.equal(fixture.peak, 6);
  assert.ok(fixture.requests.slice(1).every((url) => url.startsWith("https://example.test/pokemon/")));
  await Promise.all(catalog.slice(PAGE_SIZE, PAGE_SIZE * 2).map((entry) => fixture.data.pokemon(entry, true)));
  assert.equal(fixture.requests.length, 41);
});

test("deferred battle details preserve the preparation contract and share cached translations", async () => {
  const { data, entries, requests } = battleFixture();
  const [player, repeated] = await Promise.all([data.battle(entries[0]), data.battle(entries[0])]);
  assert.equal(player, repeated);
  assert.equal(player.name, "Pokemon 1");
  assert.equal(player.description, "Descripcion");
  assert.equal(player.totalStats, 318);
  assert.equal(player.stats.length, 6);
  assert.deepEqual(player.types, [{ nameES: "Planta", nameEN: "grass" }]);
  assert.deepEqual(player.abilities, [{ nameES: "Espesura", nameEN: "overgrow" }]);
  assert.deepEqual(player.moves, [{ nameES: "Placaje", nameEN: "tackle", type: "normal", power: 40, pp: 35, accuracy: 100, damage_class: "physical", level_learned_at: 0 }]);
  await data.battle(entries[1]);
  assert.equal(requests.filter((url) => url.includes("/move/")).length, 1);
  assert.equal(requests.filter((url) => url.includes("/ability/")).length, 1);
});

test("battle opponents keep the five-point stat range without loading every candidate's moves", async () => {
  const { data, entries, requests } = battleFixture([318, 500, 322]);
  const opponent = await data.opponent(entries, { id: 1, totalStats: 318 });
  assert.equal(opponent.id, 3);
  assert.ok(requests.every((url) => url.includes("/pokemon/")));
});

test("battle fallback excludes the player and handles an unavailable opponent", async () => {
  const { data, entries } = battleFixture([318, 500, 600]);
  const opponent = await data.opponent(entries, { id: 1, totalStats: 318 });
  assert.ok([2, 3].includes(opponent.id));
  await assert.rejects(data.opponent([entries[0]], { id: 1, totalStats: 318 }), /No opponent/);
});

test("closing a battle selection stops opponent lookup after its current batch", async () => {
  const { data, entries, requests } = battleFixture(Array(45).fill(318));
  let cancelled = false;
  const search = data.opponent(entries, { id: 1, totalStats: 318 }, () => {}, () => cancelled);
  cancelled = true;
  await assert.rejects(search, /Selection cancelled/);
  assert.equal(requests.length, PAGE_SIZE);
});

test("failed battle metadata can be retried without refetching successful details", async () => {
  const { data, entries, requests } = battleFixture([318], true);
  await assert.rejects(data.battle(entries[0]), /503/);
  assert.equal((await data.battle(entries[0])).moves.length, 1);
  assert.equal(requests.filter((url) => url.includes("/move/")).length, 2);
  assert.equal(requests.filter((url) => url.includes("/pokemon/")).length, 1);
});

test("battle labels support Spanish and older move data without blank names", () => {
  assert.equal(battleMoveName({ nameES: "Placaje", nameEN: "tackle" }), "Placaje");
  assert.equal(battleMoveName({ nameEN: "vine-whip" }), "vine whip");
  assert.equal(battleMoveName({ name: "tackle" }), "tackle");
  assert.equal(battleMoveName({}), "Movimiento");
});

test("battle preparation excludes unusable attacks before selecting the CPU's four moves", () => {
  const moves = [
    { power: 40, damage_class: "physical", type: "normal" },
    { power: null, damage_class: "special", type: "ghost" },
    { power: 0, damage_class: "physical", type: "normal" },
    { power: null, damage_class: "status", type: "normal" },
    { power: 90, damage_class: "special", type: "fire" },
  ];
  assert.deepEqual(usableBattleMoves(moves), [moves[0], moves[4]]);
  assert.deepEqual(usableBattleMoves(null), []);
});

test("shared motion assigns slow entrances to structural blocks and empty sections, not individual leaves", () => {
  const originalGlobals = Object.fromEntries(["document", "window", "Node", "MutationObserver", "AOS"].map(name => [name, globalThis[name]]));
  let mutationCallback;
  let settings;
  const leaf = () => ({
    nodeType: 1,
    removed: [],
    dataset: {},
    matches: selector => selector === "[data-aos]",
    querySelectorAll: () => [],
    removeAttribute(name) { this.removed.push(name); },
    classList: { remove() {} },
  });
  const paragraph = leaf();
  const block = leaf();
  block.matches = selector => selector === SCROLL_BLOCK_SELECTOR;
  let refreshes = 0;
  try {
    globalThis.document = { body: {}, querySelectorAll: selector => selector === "[data-aos]" ? [paragraph] : [block] };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.Node = { ELEMENT_NODE: 1 };
    globalThis.MutationObserver = class { constructor(callback) { mutationCallback = callback; } observe() {} };
    globalThis.AOS = { init(options) { settings = options; }, refreshHard() { refreshes += 1; } };
    initializeMotion();
    assert.deepEqual(paragraph.removed, ["data-aos", "data-aos-duration", "data-aos-delay"]);
    assert.equal(block.dataset.aos, "fade-up");
    assert.equal(block.dataset.aosDuration, "900");
    assert.equal(settings.duration, 900);
    assert.equal(settings.once, true);
    const image = leaf();
    mutationCallback([{ addedNodes: [image] }]);
    assert.ok(image.removed.includes("data-aos"));
    assert.equal(image.dataset.aos, undefined);
    const panel = leaf();
    panel.matches = selector => selector === SCROLL_BLOCK_SELECTOR;
    mutationCallback([{ addedNodes: [panel] }]);
    assert.equal(panel.dataset.aosDuration, "900");
    assert.equal(refreshes, 1);
    const emptySection = leaf();
    emptySection.matches = selector => selector === "section";
    emptySection.querySelector = () => null;
    mutationCallback([{ addedNodes: [emptySection] }]);
    assert.equal(emptySection.dataset.aosDuration, "900");
    assert.equal(refreshes, 2);
    assert.ok(SCROLL_BLOCK_SELECTOR.includes(".filters"));
    assert.ok(SCROLL_BLOCK_SELECTOR.includes(".sctn-prepare .pokemon-container"));
  } finally {
    Object.entries(originalGlobals).forEach(([key, value]) => {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    });
  }
});

test("shared reveal queues offscreen result blocks until visible and replaces obsolete queued entrances", () => {
  const originalGlobals = Object.fromEntries(["$", "window", "getComputedStyle", "IntersectionObserver"].map(name => [name, globalThis[name]]));
  const animations = [];
  const observers = [];
  const element = { style: {}, matches: selector => selector.includes(".list-moves"), getBoundingClientRect: () => ({ top: 500, bottom: 900 }), animate: frames => animations.push(frames) };
  const chain = { stop: () => chain, show: () => chain, each: callback => callback.call(element) };
  try {
    globalThis.$ = () => chain;
    globalThis.window = { innerHeight: 300, matchMedia: () => ({ matches: false }) };
    globalThis.getComputedStyle = () => ({ opacity: "0", getPropertyValue: () => "" });
    globalThis.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    };
    reveal([element]);
    assert.equal(animations.length, 0);
    reveal([element]);
    assert.equal(observers[0].disconnected, true);
    observers[1].callback([{ isIntersecting: false }]);
    assert.equal(animations.length, 0);
    observers[1].callback([{ isIntersecting: true }]);
    assert.equal(animations.length, 1);
    assert.equal(animations[0][1].opacity, "1");
    assert.equal(observers[1].disconnected, true);
  } finally {
    Object.entries(originalGlobals).forEach(([key, value]) => {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    });
  }
});

test("shared reveal leaves initially transparent panels visible, including reduced motion", () => {
  const originalGlobals = { $: globalThis.$, window: globalThis.window, getComputedStyle: globalThis.getComputedStyle };
  let reduced = false;
  const animations = [];
  const options = [];
  const element = { style: { opacity: "0", transform: "translateY(12px)" }, matches: () => true, animate: (frames, settings) => { animations.push(frames); options.push(settings); } };
  const chain = { stop: () => chain, show: () => chain, each: callback => callback.call(element) };
  try {
    globalThis.$ = () => chain;
    globalThis.window = { matchMedia: () => ({ matches: reduced }) };
    globalThis.getComputedStyle = target => ({ opacity: target.style.opacity, getPropertyValue: () => "" });
    reveal([element]);
    assert.equal(element.style.opacity, "1");
    assert.equal(element.style.transform, "none");
    assert.equal(animations[0][1].opacity, "1");
    assert.equal(options[0].duration, 900);
    assert.equal(options[0].easing, "cubic-bezier(0.25, 0.1, 0.25, 1)");
    assert.equal(animations[0][0].transform, "translateY(24px)");
    reduced = true;
    element.style.opacity = "0";
    reveal([element]);
    assert.equal(element.style.opacity, "1");
    assert.equal(animations.length, 1);
    reduced = false;
    element.matches = () => false;
    element.style.opacity = "0";
    reveal([element]);
    assert.equal(element.style.opacity, "1");
    assert.equal(animations.length, 1);
  } finally {
    Object.entries(originalGlobals).forEach(([key, value]) => {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    });
  }
});