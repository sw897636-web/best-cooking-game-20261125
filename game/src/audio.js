// Golden Ladle Bistro — audio.js
// Tiny synthesized sound effects with WebAudio. No audio files, no network:
// every blip is an oscillator built at run time.

let audioContext = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function tone(freq, duration, type, volume, when = 0) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playPickUp() {
  tone(520, 0.09, 'sine', 0.12);
}

export function playChop() {
  tone(180, 0.07, 'square', 0.08);
  tone(140, 0.07, 'square', 0.08, 0.08);
}

export function playSizzle() {
  tone(1200, 0.18, 'sawtooth', 0.03);
  tone(900, 0.22, 'sawtooth', 0.03, 0.05);
}

export function playReady() {
  tone(880, 0.12, 'sine', 0.12);
  tone(1318, 0.16, 'sine', 0.12, 0.1);
}

export function playServe() {
  tone(660, 0.1, 'triangle', 0.14);
  tone(880, 0.1, 'triangle', 0.14, 0.09);
  tone(1320, 0.22, 'triangle', 0.14, 0.18);
}

export function playError() {
  tone(160, 0.16, 'square', 0.07);
}

export function playBurnt() {
  tone(220, 0.25, 'sawtooth', 0.08);
  tone(110, 0.3, 'sawtooth', 0.08, 0.12);
}

export function playOrderArrive() {
  tone(784, 0.1, 'sine', 0.1);
  tone(988, 0.14, 'sine', 0.1, 0.09);
}

export function playTick() {
  tone(1050, 0.05, 'sine', 0.06);
}
