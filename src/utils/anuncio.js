// Anuncio de turnos en la sala de espera: un "din-don" y la voz del navegador
// ("Turno 12, pase a Consultorio 2"). Todo ocurre en el navegador de la TV, sin servicios externos.
// Los navegadores solo dejan sonar audio después de que alguien toca la página una vez
// (por eso la pantalla tiene el botón "Activar voz").

let contexto = null;

function audio() {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) return null;
  if (!contexto) contexto = new Contexto();
  if (contexto.state === "suspended") contexto.resume();
  return contexto;
}

// Dos tonos suaves (din-don). Devuelve cuánto dura, en milisegundos.
export function dinDon() {
  const ctx = audio();
  if (!ctx) return 0;
  [[880, 0], [660, 0.35]].forEach(([frecuencia, inicio]) => {
    const tono = ctx.createOscillator();
    const volumen = ctx.createGain();
    tono.type = "sine";
    tono.frequency.value = frecuencia;
    const t = ctx.currentTime + inicio;
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    tono.connect(volumen).connect(ctx.destination);
    tono.start(t);
    tono.stop(t + 0.65);
  });
  return 1000;
}

function vozEnEspanol() {
  const voces = window.speechSynthesis?.getVoices() ?? [];
  return voces.find((v) => v.lang?.toLowerCase().startsWith("es-") && /google|microsoft/i.test(v.name))
    ?? voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
}

export function textoDelLlamado(turno) {
  const destino = turno.modulo_asignado ? `pase a ${turno.modulo_asignado}` : "pase a ventanilla";
  return `Turno ${turno.numero_turno}, ${destino}.`;
}

// Dice el texto (después del din-don). Si el navegador no tiene voz, al menos suena el din-don.
export function anunciar(texto) {
  const espera = dinDon();
  if (!window.speechSynthesis) return;
  setTimeout(() => {
    const dicho = new SpeechSynthesisUtterance(texto);
    dicho.lang = "es-ES";
    const voz = vozEnEspanol();
    if (voz) { dicho.voice = voz; dicho.lang = voz.lang; }
    dicho.rate = 0.9;
    window.speechSynthesis.speak(dicho);
  }, espera);
}

// Prepara el audio con el toque del usuario (requisito de los navegadores)
export function activarAudio() {
  audio();
  window.speechSynthesis?.getVoices();
}
