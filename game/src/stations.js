// Golden Ladle Bistro — stations.js
// What happens at a cooking station: loading raw food, cooking it through,
// collecting the finished piece, and burning it if you forget it.

import { INGREDIENT_BY_ID, STATION_BY_ID } from './recipes.js';
import { BURN_SECONDS } from './state.js';

// Can this station cook the item in the player's hand right now?
export function stationAccepts(station, hand) {
  if (!hand) return { ok: false, why: 'empty-handed' };
  if (station.state !== 'idle') return { ok: false, why: 'busy' };
  if (hand.prep !== 'raw') return { ok: false, why: 'already-prepped' };
  const ingredient = INGREDIENT_BY_ID[hand.ingredient];
  if (!ingredient.preps.includes(station.kind)) {
    return { ok: false, why: 'wrong-station' };
  }
  return { ok: true, why: '' };
}

export function loadStation(state, stationId) {
  const station = state.stations.find((s) => s.id === stationId);
  if (!station) return { ok: false, why: 'no-station' };
  const check = stationAccepts(station, state.hand);
  if (!check.ok) return check;
  const def = STATION_BY_ID[stationId];
  station.item = { ...state.hand };
  station.state = 'cooking';
  station.progress = 0;
  station.seconds = def.seconds;
  station.burnLeft = BURN_SECONDS;
  state.hand = null;
  return { ok: true, why: '' };
}

export function collectStation(state, stationId) {
  const station = state.stations.find((s) => s.id === stationId);
  if (!station) return { ok: false, why: 'no-station' };
  if (station.state === 'burnt') {
    station.item = null;
    station.state = 'idle';
    station.progress = 0;
    return { ok: true, why: 'trashed-burnt' };
  }
  if (station.state !== 'done') return { ok: false, why: 'not-ready' };
  if (state.hand) return { ok: false, why: 'hands-full' };
  state.hand = { ingredient: station.item.ingredient, prep: station.kind };
  station.item = null;
  station.state = 'idle';
  station.progress = 0;
  return { ok: true, why: 'collected' };
}

// Advance every cooking station by dt seconds. Finished food starts its burn
// timer; burnt food must be cleared before the station can be used again.
export function tickStations(state, dt) {
  for (const station of state.stations) {
    if (station.state === 'cooking') {
      station.progress += dt / station.seconds;
      if (station.progress >= 1) {
        station.progress = 1;
        station.state = 'done';
        station.burnLeft = BURN_SECONDS;
      }
    } else if (station.state === 'done') {
      station.burnLeft -= dt;
      if (station.burnLeft <= 0) {
        station.state = 'burnt';
      }
    }
  }
}

export function stationStatusText(station) {
  if (station.state === 'idle') return 'Empty — click with food in hand';
  const ingredient = INGREDIENT_BY_ID[station.item.ingredient];
  if (station.state === 'cooking') {
    const pct = Math.round(station.progress * 100);
    return `${ingredient.name} cooking… ${pct}%`;
  }
  if (station.state === 'done') {
    return `${ingredient.name} ready! (${Math.ceil(station.burnLeft)}s before it burns)`;
  }
  return `${ingredient.name} burnt! Click to clear`;
}
