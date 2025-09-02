let battleSynths = [];
let repetir = true;

// Reproducir INTRO MIDI automáticamente
export async function reproducirIntroMidi(rutaMidi = "../assets/audio/intro.mid") {
  await Tone.start(); // 🔹 Esto solo se ejecuta al inicio
  const response = await fetch(rutaMidi);
  const arrayBuffer = await response.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  const now = Tone.now();
  const duracionMax = Math.max(...midi.tracks.map(track =>
    track.notes.length > 0 ? track.notes[track.notes.length - 1].time + track.notes[track.notes.length - 1].duration : 0
  ));

  midi.tracks.forEach(track => {
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    battleSynths.push(synth);
    track.notes.forEach(note => {
      synth.triggerAttackRelease(note.name, note.duration, note.time + now, note.velocity);
    });
  });

  // Programar repetición infinita
  if (repetir) {
    setTimeout(() => {
      detenerBattleMidi();
      reproducirIntroMidi(rutaMidi);
    }, duracionMax * 1000);
  }
}

// Reproducir BATTLE MIDI automáticamente
export async function reproducirBattleMidi(rutaMidi = "../assets/audio/battle.mid") {
  await Tone.start(); // 🔹 Esto solo se ejecuta al inicio
  const response = await fetch(rutaMidi);
  const arrayBuffer = await response.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  const now = Tone.now();
  const duracionMax = Math.max(...midi.tracks.map(track =>
    track.notes.length > 0 ? track.notes[track.notes.length - 1].time + track.notes[track.notes.length - 1].duration : 0
  ));

  midi.tracks.forEach(track => {
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    battleSynths.push(synth);
    track.notes.forEach(note => {
      synth.triggerAttackRelease(note.name, note.duration, note.time + now, note.velocity);
    });
  });

  // Programar repetición infinita
  if (repetir) {
    setTimeout(() => {
      detenerMidi();
      reproducirIntroMidi(rutaMidi);
    }, duracionMax * 1000);
  }
}

// Detener música y limpiar sintetizadores
export function detenerMidi() {
  battleSynths.forEach(synth => synth.dispose());
  battleSynths = [];
}
