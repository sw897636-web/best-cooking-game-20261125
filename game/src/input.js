// Golden Ladle Bistro — input.js
// Mouse and keyboard controls. Every action is also a click, so the whole
// game is playable with the mouse alone; keys are shortcuts for speed.

import { INGREDIENTS } from './recipes.js';
import { findMatchingOrder, serveOrder, takeIngredient, trashHand, removePlateItem } from './state.js';
import { collectStation, loadStation, stationAccepts } from './stations.js';
import { playChop, playError, playPickUp, playServe, playSizzle } from './audio.js';
import { showToast } from './render.js';

export function bindInput(state, els, hooks) {
  const { onAction, onServe, onStart, onRestart } = hooks;

  els.ingredientRow.addEventListener('click', (event) => {
    const bin = event.target.closest('.ingredient-bin');
    if (!bin || state.phase !== 'playing') return;
    if (state.hand) {
      showToast(els, 'Hands full — serve or trash what you are holding first');
      playError();
      return;
    }
    takeIngredient(state, bin.dataset.ingredientId);
    playPickUp();
    onAction();
  });

  els.stationRow.addEventListener('click', (event) => {
    const stationEl = event.target.closest('.station');
    if (!stationEl || state.phase !== 'playing') return;
    const station = state.stations.find((s) => s.id === stationEl.dataset.stationId);
    if (!station) return;
    if (station.state === 'burnt') {
      collectStation(state, station.id);
      showToast(els, 'Burnt food cleared');
      onAction();
      return;
    }
    if (station.state === 'done') {
      const result = collectStation(state, station.id);
      if (result.ok) {
        playPickUp();
        showToast(els, 'Picked up — click the plate to add it');
      } else {
        playError();
        showToast(els, 'Hands full — plate or trash something first');
      }
      onAction();
      return;
    }
    if (station.state === 'cooking') {
      showToast(els, 'Still cooking… watch the bar');
      return;
    }
    // Idle station: try to load what the player is holding.
    const check = stationAccepts(station, state.hand);
    if (!check.ok) {
      playError();
      showToast(els, stationRejectMessage(check.why, station));
      return;
    }
    loadStation(state, station.id);
    if (station.kind === 'chopped') playChop();
    else playSizzle();
    onAction();
  });

  els.plateItems.addEventListener('click', (event) => {
    const chip = event.target.closest('.plate-item');
    if (chip) {
      removePlateItem(state, Number(chip.dataset.plateIndex));
      playError();
      onAction();
      return;
    }
    if (state.phase !== 'playing' || !state.hand) return;
    state.plate.push({ ...state.hand });
    state.hand = null;
    playPickUp();
    onAction();
  });

  els.serveBtn.addEventListener('click', () => {
    serveFromInput(state, els, onServe);
  });

  els.orderBoard.addEventListener('click', (event) => {
    const ticket = event.target.closest('.order-ticket');
    if (!ticket || state.phase !== 'playing') return;
    serveFromInput(state, els, onServe);
  });

  els.trashBtn.addEventListener('click', () => {
    if (state.phase !== 'playing') return;
    if (state.hand) {
      trashHand(state);
      playError();
      showToast(els, 'Tossed it');
      onAction();
    } else if (state.plate.length > 0) {
      state.plate.pop();
      showToast(els, 'Removed the last plate item');
      onAction();
    }
  });

  els.startBtn.addEventListener('click', () => onStart());
  els.restartBtn.addEventListener('click', () => onRestart());
  els.muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    els.muteBtn.textContent = state.muted ? '\u{1F507} Muted' : '\u{1F50A} Sound';
    onAction();
  });
  els.pauseBtn.addEventListener('click', () => {
    if (state.phase === 'playing') {
      state.phase = 'paused';
      els.pauseBtn.textContent = '\u25B6 Resume';
      showToast(els, 'Paused — press P to resume');
    } else if (state.phase === 'paused') {
      state.phase = 'playing';
      els.pauseBtn.textContent = '\u23F8 Pause';
    }
    onAction();
  });

  document.addEventListener('keydown', (event) => {
    if (state.phase === 'menu' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onStart();
      return;
    }
    if (state.phase === 'over' && event.key === 'Enter') {
      onRestart();
      return;
    }
    if (event.key === 'p' || event.key === 'P') {
      if (state.phase === 'playing') {
        state.phase = 'paused';
        els.pauseBtn.textContent = '\u25B6 Resume';
      } else if (state.phase === 'paused') {
        state.phase = 'playing';
        els.pauseBtn.textContent = '\u23F8 Pause';
      }
      onAction();
      return;
    }
    if (state.phase !== 'playing') return;
    const digit = Number(event.key);
    if (digit >= 1 && digit <= INGREDIENTS.length) {
      if (state.hand) {
        playError();
        return;
      }
      takeIngredient(state, INGREDIENTS[digit - 1].id);
      playPickUp();
      onAction();
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      serveFromInput(state, els, onServe);
      return;
    }
    if (event.key === 't' || event.key === 'T' || event.key === 'Backspace') {
      if (state.hand) trashHand(state);
      else if (state.plate.length > 0) state.plate.pop();
      onAction();
      return;
    }
    if (event.key === 'c' || event.key === 'C') {
      autoLoadStation(state, els, 'chopped', onAction);
    }
    if (event.key === 'g' || event.key === 'G') {
      autoLoadStation(state, els, 'grilled', onAction);
    }
    if (event.key === 'b' || event.key === 'B') {
      autoLoadStation(state, els, 'boiled', onAction);
    }
  });
}

function autoLoadStation(state, els, kind, onAction) {
  const station = state.stations.find((s) => s.kind === kind && s.state === 'idle');
  if (!station) return;
  const check = stationAccepts(station, state.hand);
  if (!check.ok) {
    playError();
    showToast(els, stationRejectMessage(check.why, station));
    return;
  }
  loadStation(state, station.id);
  if (kind === 'chopped') playChop();
  else playSizzle();
  onAction();
}

export function serveFromInput(state, els, onServe) {
  if (state.phase !== 'playing') return;
  const matching = findMatchingOrder(state);
  if (!matching) {
    playError();
    showToast(els, 'Plate does not match any order yet — check the tickets');
    return;
  }
  const result = serveOrder(state, matching);
  playServe();
  const comboText = result.comboBonus > 0 ? ` Combo +$${result.comboBonus}!` : '';
  showToast(els, `Served ${result.recipeName}! +$${result.earned} (tip $${result.tip})${comboText}`, true);
  onServe(result);
}

function stationRejectMessage(why, station) {
  if (why === 'empty-handed') return 'Grab an ingredient first';
  if (why === 'busy') return 'That station is busy';
  if (why === 'already-prepped') return 'That piece is already prepped';
  if (why === 'wrong-station') {
    return station.kind === 'chopped'
      ? 'This needs the grill or the pot, not the board'
      : station.kind === 'grilled'
        ? 'This needs the board or the pot, not the grill'
        : 'This needs the board or the grill, not the pot';
  }
  return 'That does not work here';
}
