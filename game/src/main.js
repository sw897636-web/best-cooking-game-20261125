// Golden Ladle Bistro — main.js
// Bootstrap and the shift loop: the clock, order spawns, patience drain,
// station cooking and the end of the shift. Wires state + input + render.

import { INGREDIENTS, PREP_VERBS } from './recipes.js';
import {
  SHIFT_SECONDS,
  RUSH_AT_SECONDS,
  createInitialState,
  expireOrder,
  patienceAt,
  spawnIntervalAt,
  spawnOrder,
} from './state.js';
import { tickStations } from './stations.js';
import { bindInput } from './input.js';
import { renderAll, shakeHearts, showToast } from './render.js';
import { seedDemoState } from './demo.js';
import {
  ensureAudio,
  playBurnt,
  playOrderArrive,
  playReady,
  playTick,
  setMuted,
} from './audio.js';

const els = {
  shiftTimer: document.getElementById('shiftTimer'),
  coinCount: document.getElementById('coinCount'),
  hearts: document.getElementById('hearts'),
  comboBadge: document.getElementById('comboBadge'),
  muteBtn: document.getElementById('muteBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  orderBoard: document.getElementById('orderBoard'),
  stationRow: document.getElementById('stationRow'),
  plateItems: document.getElementById('plateItems'),
  plateHint: document.getElementById('plateHint'),
  serveBtn: document.getElementById('serveBtn'),
  trashBtn: document.getElementById('trashBtn'),
  handSlot: document.getElementById('handSlot'),
  handText: document.getElementById('handText'),
  servedPlates: document.getElementById('servedPlates'),
  rushBanner: document.getElementById('rushBanner'),
  ingredientRow: document.getElementById('ingredientRow'),
  startOverlay: document.getElementById('startOverlay'),
  endOverlay: document.getElementById('endOverlay'),
  startBtn: document.getElementById('startBtn'),
  restartBtn: document.getElementById('restartBtn'),
  endStats: document.getElementById('endStats'),
  toast: document.getElementById('toast'),
  floaterLayer: document.getElementById('floaterLayer'),
};

let state = createInitialState();
let lastFrameAt = 0;
let lastTickSecond = -1;
let wasDone = new Set();

// Test and screenshot hook: the live state, read-only from the console.
window.__bistro = { get state() { return state; } };

buildIngredientBins();

bindInput(state, els, {
  onAction: () => renderAll(state, els),
  onServe: () => renderAll(state, els),
  onStart: () => startShift(),
  onRestart: () => restartShift(),
});

function buildIngredientBins() {
  els.ingredientRow.innerHTML = '';
  INGREDIENTS.forEach((ingredient, index) => {
    const bin = document.createElement('div');
    bin.className = 'ingredient-bin';
    bin.dataset.ingredientId = ingredient.id;
    const prepText = ingredient.preps.length === 0
      ? 'Serve fresh'
      : ingredient.preps.map((p) => PREP_VERBS[p]).join(' / ');
    bin.innerHTML =
      `<div class="bin-emoji">${ingredient.emoji}</div>` +
      `<div class="bin-name">${ingredient.name}</div>` +
      `<div class="bin-prep">${prepText}</div>` +
      `<div class="bin-key">${index + 1}</div>`;
    els.ingredientRow.appendChild(bin);
  });
}

function startShift() {
  ensureAudio();
  // Mutate the state object in place (never reassign it): input.js holds a
  // reference to this same object from bindInput, so a fresh object here
  // would leave every click handler talking to the old, dead shift.
  const fresh = createInitialState();
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.phase = 'playing';
  spawnOrder(state);
  spawnOrder(state);
  els.startOverlay.classList.add('hidden');
  els.endOverlay.classList.add('hidden');
  els.pauseBtn.textContent = '\u23F8 Pause';
  lastFrameAt = performance.now();
  lastTickSecond = -1;
  wasDone = new Set();
  showToast(els, 'Shift started! First orders are in — grab ingredients below', true);
  renderAll(state, els);
}

function restartShift() {
  startShift();
}

function endShift() {
  state.phase = 'over';
  els.endOverlay.classList.remove('hidden');
  renderAll(state, els);
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrameAt) / 1000 || 0);
  lastFrameAt = now;
  if (state.phase === 'playing') {
    tickShift(dt);
  }
  renderAll(state, els);
  requestAnimationFrame(frame);
}

function tickShift(dt) {
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);

  // Last whole second tick: countdown beep under 10 seconds.
  const whole = Math.ceil(state.timeLeft);
  if (whole !== lastTickSecond) {
    lastTickSecond = whole;
    if (state.timeLeft <= 10 && state.timeLeft > 0) playTick();
  }

  // New orders arrive faster as the shift goes on.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const spawned = spawnOrder(state);
    if (spawned) {
      playOrderArrive();
      showToast(els, `New order: ${spawned.recipe.name}!`);
    }
    state.spawnTimer = spawnIntervalAt(state.elapsed);
  }

  // Patience drains; an expired ticket costs a heart.
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      expireOrder(state, order);
      shakeHearts(els);
      showToast(els, `Order #${order.id} walked out! Lost a heart.`);
      if (state.phase === 'over') {
        endShift();
        return;
      }
    }
  }

  // Stations cook; a finished station dings once, a burnt one thuds.
  const doneBefore = new Set(state.stations.filter((s) => s.state === 'done').map((s) => s.id));
  const burntBefore = new Set(state.stations.filter((s) => s.state === 'burnt').map((s) => s.id));
  tickStations(state, dt);
  for (const station of state.stations) {
    if (station.state === 'done' && !doneBefore.has(station.id) && !wasDone.has(station.id)) {
      playReady();
    }
    if (station.state === 'burnt' && !burntBefore.has(station.id)) {
      playBurnt();
      showToast(els, 'Something burnt! Clear the station.');
    }
  }
  wasDone = new Set(state.stations.filter((s) => s.state === 'done').map((s) => s.id));

  // The rush: at 60 seconds the lunch rush opens a fourth ticket slot and
  // the banner goes up; two impatient tickets also trigger it earlier.
  const rushed = state.orders.filter((o) => o.patience / o.maxPatience < 0.5).length;
  state.rush = state.elapsed >= RUSH_AT_SECONDS || rushed >= 2;
  if (state.elapsed >= RUSH_AT_SECONDS && !state.rushAnnounced) {
    state.rushAnnounced = true;
    showToast(els, 'LUNCH RUSH! A fourth ticket slot just opened!', true);
    playOrderArrive();
  }

  if (state.timeLeft <= 0) {
    endShift();
  }
}

// Mute follows the state flag (the button toggles it in input.js).
const muteObserver = new MutationObserver(() => setMuted(state.muted));
muteObserver.observe(els.muteBtn, { childList: true });

// Screenshot / demo mode: ?shot=cover|chop|serve|end seeds a real mid-shift
// state and starts the clock. In demo mode the clock is frozen so every
// screenshot of the same kind renders identically.
const shotKind = new URLSearchParams(window.location.search).get('shot');
if (shotKind) {
  state.phase = 'playing';
  seedDemoState(state, shotKind);
  els.startOverlay.classList.add('hidden');
  if (state.phase === 'over') els.endOverlay.classList.remove('hidden');
  renderAll(state, els);
  // Freeze the demo: stop the loop from draining timers between load and shot.
  state.phase = state.phase === 'over' ? 'over' : 'paused';
  renderAll(state, els);
} else {
  renderAll(state, els);
  requestAnimationFrame(frame);
}

// Keep the page title honest about the shift.
document.title = 'Golden Ladle Bistro — a tiny cooking rush';
