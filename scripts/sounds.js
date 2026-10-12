export function createMusicPlayer({
  getTone = () => globalThis.Tone,
  getStorage = () => globalThis.localStorage,
  getPositionStorage = () => globalThis.sessionStorage,
  fetcher = (...args) => fetch(...args),
  parseMidi = buffer => new globalThis.Midi(buffer),
  resolveUrl = path => new URL(path, import.meta.url).href,
  setTimer = (...args) => setTimeout(...args),
  clearTimer = timer => clearTimeout(timer),
  timeout = 10000,
} = {}) {
  const cache = new Map();
  const listeners = new Set();
  const preferenceKey = "pokeatlas:music";
  const positionPrefix = "pokeatlas:music-position:";
  let enabled = false;
  let status = "off";
  let error = null;
  let revision = 0;
  let pending = null;
  let active = null;
  let synths = [];
  let loopTimer = null;
  let cancelUnlock = null;
  let fetchController = null;
  let observedContext = null;

  function isEnabled() {
    try { enabled = getStorage().getItem(preferenceKey) === "true"; } catch {}
    return enabled;
  }

  function getState() {
    return { enabled: isEnabled(), status, error };
  }

  function notify(nextStatus, nextError = null) {
    status = nextStatus;
    error = nextError;
    listeners.forEach(listener => listener(getState()));
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
  }

  function releaseSynths() {
    synths.forEach(synth => synth.dispose());
    synths = [];
  }

  function position() {
    return (active.offset + Math.max(0, active.tone.now() - active.startedAt)) % active.duration;
  }

  function savePosition() {
    if (!active) return;
    try { getPositionStorage().setItem(`${positionPrefix}${active.url}`, String(position())); } catch {}
  }

  function readPosition(url, duration) {
    try {
      const saved = Number(getPositionStorage().getItem(`${positionPrefix}${url}`));
      return Number.isFinite(saved) && saved >= 0 ? saved % duration : 0;
    } catch { return 0; }
  }

  function stop() {
    savePosition();
    active = null;
    revision += 1;
    pending = null;
    cancelUnlock?.(new DOMException("Playback cancelled", "AbortError"));
    fetchController?.abort();
    clearTimer(loopTimer);
    loopTimer = null;
    releaseSynths();
    notify("off");
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    try { getStorage().setItem(preferenceKey, String(enabled)); } catch {}
    if (!enabled) stop();
    else notify(status === "off" ? "blocked" : status);
  }

  function contextFor(tone) {
    const context = tone.getContext?.() || tone.context;
    return context?.rawContext || context;
  }

  function contextState(tone) {
    return contextFor(tone)?.state || "running";
  }

  function fail(failure) {
    stop();
    notify(failure.name === "NotAllowedError" ? "blocked" : "error", failure);
  }

  function contextChanged() {
    if (!active && !pending) return;
    if (observedContext.state === "closed") {
      fail(new Error("El contexto de audio se ha cerrado"));
    } else if (observedContext.state !== "running") {
      clearTimer(loopTimer);
      loopTimer = null;
      notify("blocked");
    } else if (active) {
      clearTimer(loopTimer);
      loopTimer = null;
      active.resume(position());
    }
  }

  function observeContext(tone) {
    const context = contextFor(tone);
    if (context === observedContext) return;
    observedContext?.removeEventListener?.("statechange", contextChanged);
    observedContext = context;
    observedContext?.addEventListener?.("statechange", contextChanged);
  }

  function unlock(tone) {
    const context = contextFor(tone);
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = null;
      function finish(failure) {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        context?.removeEventListener?.("statechange", check);
        if (cancelUnlock === finish) cancelUnlock = null;
        if (failure) reject(failure);
        else resolve();
      }
      function check() {
        if (contextState(tone) === "running") finish();
        else if (contextState(tone) === "closed") finish(new Error("El contexto de audio se ha cerrado"));
      }
      cancelUnlock = finish;
      context?.addEventListener?.("statechange", check);
      timer = setTimer(() => finish(new DOMException("Audio pendiente de permiso", "NotAllowedError")), timeout);
      try {
        Promise.resolve(tone.start()).then(() => {
          if (!context || !context.addEventListener) finish();
          else check();
        }, finish);
        if (context?.addEventListener) check();
      } catch (failure) { finish(failure); }
    });
  }

  function loadMidi(url) {
    const cached = cache.get(url);
    if (cached && !cached.controller.signal.aborted) return cached.promise;
    const controller = new AbortController();
    fetchController = controller;
    const timer = setTimer(() => controller.abort(), timeout);
    const request = Promise.resolve().then(() => fetcher(url, { signal: controller.signal })).then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseMidi(await response.arrayBuffer());
    }).finally(() => {
      clearTimer(timer);
      if (fetchController === controller) fetchController = null;
    });
    cache.set(url, { promise: request, controller });
    request.catch(() => { if (cache.get(url)?.promise === request) cache.delete(url); });
    return request;
  }

  function play(path) {
    let tone;
    let url;
    try {
      tone = getTone();
      if (!tone?.start) throw new Error("El motor de audio no esta disponible");
      if (contextState(tone) === "closed" && tone.Context && tone.setContext) {
        tone.setContext(new tone.Context());
      }
      url = resolveUrl(path);
    } catch (failure) {
      fail(failure);
      return Promise.reject(failure);
    }
    if (pending?.url === url) {
      if (contextState(tone) !== "running") {
        const resumeRevision = pending.revision;
        const rejected = failure => { if (revision === resumeRevision) cancelUnlock?.(failure); };
        try { Promise.resolve(tone.start()).catch(rejected); }
        catch (failure) { rejected(failure); }
      }
      return pending.promise;
    }
    if (active?.url === url && contextState(tone) === "running") return Promise.resolve();
    stop();
    const currentRevision = revision;
    observeContext(tone);
    notify(contextState(tone) === "running" ? "loading" : "blocked");
    const promise = (async () => {
      try {
        await unlock(tone);
        if (currentRevision !== revision) return;
        notify("loading");
        const midi = await loadMidi(url);
        if (currentRevision !== revision) return;
        if (contextState(tone) !== "running") throw new DOMException("Audio pendiente de permiso", "NotAllowedError");
        const tracks = midi.tracks.map(track => track.notes.filter(note =>
          Number.isFinite(note.time) && note.time >= 0 && Number.isFinite(note.duration) && note.duration > 0
        )).filter(notes => notes.length);
        const duration = Math.max(0, ...tracks.flatMap(notes => notes.map(note => note.time + note.duration)));
        if (!duration) throw new Error("La pista MIDI no contiene notas reproducibles");

        function schedule(offset = 0) {
          if (currentRevision !== revision) return;
          try {
            if (contextState(tone) !== "running") { notify("blocked"); return; }
            releaseSynths();
            const now = tone.now() + 0.05;
            active = { url, tone, duration, offset, startedAt: now, resume: schedule };
            tracks.forEach(notes => {
              const remaining = notes.filter(note => note.time + note.duration > offset);
              if (!remaining.length) return;
              const synth = new tone.PolySynth(tone.Synth);
              synths.push(synth);
              synth.toDestination();
              remaining.forEach(note => {
                const start = Math.max(note.time, offset);
                synth.triggerAttackRelease(note.name, note.time + note.duration - start, now + start - offset, note.velocity);
              });
            });
            loopTimer = setTimer(() => schedule(), (duration - offset + 0.05) * 1000);
            notify("playing");
          } catch (failure) { fail(failure); }
        }
        schedule(readPosition(url, duration));
      } catch (failure) {
        if (currentRevision !== revision) return;
        fail(failure);
        throw failure;
      } finally {
        if (pending?.revision === currentRevision) pending = null;
      }
    })();
    pending = { url, revision: currentRevision, promise };
    return promise;
  }

  return { isEnabled, setEnabled, getState, subscribe, play, stop };
}

const player = createMusicPlayer();
export const isMusicEnabled = () => player.isEnabled();
export const setMusicEnabled = enabled => player.setEnabled(enabled);
export const getMusicState = () => player.getState();
export const subscribeMusic = listener => player.subscribe(listener);
export const detenerMidi = () => player.stop();
export const reproducirIntroMidi = (path = "../assets/audio/intro.mid") => player.play(path);
export const reproducirBattleMidi = (path = "../assets/audio/battle.mid") => player.play(path);
