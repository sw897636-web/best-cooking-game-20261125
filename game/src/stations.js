// Golden Ladle Bistro — stations.js
// What happens at a cooking station: loading raw food, cooking it through,
// collecting the finished piece, and burning it if you forget it.

import { INGREDIENT_BY_ID, PREP_LABELS, STATION_BY_ID } from './recipes.js';
import { BURN_SECONDS } from './state.js';

// Can this station cook the item in the player's hand right now?
// A soup pot already simmering one half of the soup also accepts the other
// half (tomato + potato in the same pot), which is how the ladled soup is made.
export function stationAccepts(station, hand) {
  if (!hand) return { ok: false, why: 'empty-handed' };
  if (station.state === 'cooking' && station.kind === 'boiled' && hand.prep === 'raw') {
    const parts = station.item?.parts ?? [];
    const ingredient = INGREDIENT_BY_ID[hand.ingredient];
    if ((hand.ingredient === 'tomato' || hand.ingredient === 'potato')
      && ingredient.preps.includes('boiled') && !parts.includes(hand.ingredient)) {
      return { ok: true, why: 'add-to-pot' };
    }
    return { ok: false, why: 'busy' };
  }
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
  if (check.why === 'add-to-pot') {
    station.item.parts.push(state.hand.ingredient);
    state.hand = null;
    return { ok: true, why: 'added-to-pot' };
  }
  const def = STATION_BY_ID[stationId];
  station.item = { ...state.hand, parts: station.kind === 'boiled' ? [state.hand.ingredient] : undefined };
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
  // A pot with both tomato and potato becomes one ladled bowl of soup;
  // a pot with a single ingredient gives back that boiled ingredient.
  if (station.kind === 'boiled' && station.item.parts?.length === 2) {
    state.hand = { ingredient: 'soup', prep: 'ladled' };
  } else {
    state.hand = { ingredient: station.item.ingredient, prep: station.kind };
  }
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

const COOK_VERBS = {
  chopped: 'Chopping',
  grilled: 'Grilling',
  boiled: 'Boiling',
};

export function stationStatusText(station) {
  if (station.state === 'idle') return 'Empty — click with food in hand';
  const ingredient = INGREDIENT_BY_ID[station.item.ingredient];
  const verb = COOK_VERBS[station.kind];
  if (station.state === 'cooking') {
    const pct = Math.round(station.progress * 100);
    const parts = station.item.parts?.length === 2 ? ' (tomato + potato soup)' : '';
    return `${verb} ${ingredient.name.toLowerCase()}${parts}… ${pct}%`;
  }
  if (station.state === 'done') {
    const what = station.item.parts?.length === 2
      ? 'soup'
      : `${PREP_LABELS[station.kind]} ${ingredient.name.toLowerCase()}`;
    return `Ready! ${what} — click to collect (${Math.ceil(station.burnLeft)}s before it burns)`;
  }
  return `${ingredient.name} burnt! Click to clear`;
}
