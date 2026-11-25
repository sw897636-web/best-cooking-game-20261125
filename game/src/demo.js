// Golden Ladle Bistro — demo.js
// Seeded mid-shift states used only when the page is opened with ?shot=.
// They are real game states — same orders, stations and plate a player
// would reach by playing — so a screenshot is a true render of the game.

import { RECIPES } from './recipes.js';

function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

function makeOrder(state, id, recipeId, patience, maxPatience) {
  return { id, recipe: recipeById(recipeId), patience, maxPatience };
}

function setStation(state, stationId, item, progress, stationState) {
  const station = state.stations.find((s) => s.id === stationId);
  station.item = item;
  station.progress = progress;
  station.state = stationState;
  station.burnLeft = 6;
}

export function seedDemoState(state, kind) {
  state.phase = 'playing';
  state.elapsed = 63;
  state.timeLeft = 87;
  state.coins = 86;
  state.servedCount = 6;
  state.combo = 2;
  state.bestCombo = 3;
  state.spawnTimer = 6;
  state.nextOrderId = 8;

  if (kind === 'cover') {
    // The cover: three tickets, all three station kinds busy, a dish
    // mid-assembly on the plate, and a finished plate on the counter.
    state.orders = [
      makeOrder(state, 5, 'sunny-burger', 34, 48),
      makeOrder(state, 6, 'tomato-soup', 22, 40),
      makeOrder(state, 7, 'garden-salad', 12, 40),
    ];
    setStation(state, 'chop-1', { ingredient: 'lettuce', prep: 'raw' }, 0.62, 'cooking');
    setStation(state, 'grill-1', { ingredient: 'patty', prep: 'raw' }, 0.8, 'cooking');
    setStation(state, 'pot-1', { ingredient: 'tomato', prep: 'raw' }, 0.45, 'cooking');
    state.plate = [
      { ingredient: 'bun', prep: 'raw' },
      { ingredient: 'cheese', prep: 'raw' },
    ];
    state.hand = { ingredient: 'tomato', prep: 'chopped' };
    state.servedPlates = ['garden-salad'];
    return;
  }

  if (kind === 'chop') {
    // Mid-prep: boards and grill full, pot finishing, plate half built.
    state.orders = [
      makeOrder(state, 5, 'farm-plate', 30, 40),
      makeOrder(state, 6, 'cheese-toast', 18, 40),
      makeOrder(state, 7, 'sunny-burger', 38, 48),
    ];
    setStation(state, 'chop-1', { ingredient: 'carrot', prep: 'raw' }, 0.9, 'cooking');
    setStation(state, 'chop-2', { ingredient: 'lettuce', prep: 'raw' }, 0.35, 'cooking');
    setStation(state, 'grill-1', { ingredient: 'patty', prep: 'raw' }, 1, 'done');
    setStation(state, 'pot-1', { ingredient: 'potato', prep: 'raw' }, 0.7, 'cooking');
    state.plate = [{ ingredient: 'lettuce', prep: 'chopped' }];
    state.hand = { ingredient: 'tomato', prep: 'raw' };
    state.servedPlates = ['tomato-soup'];
    return;
  }

  if (kind === 'serve') {
    // A completed Sunny Burger on the plate, its ticket glowing SERVE!
    state.orders = [
      makeOrder(state, 5, 'sunny-burger', 26, 48),
      makeOrder(state, 6, 'garden-salad', 15, 40),
      makeOrder(state, 7, 'tomato-soup', 36, 40),
    ];
    setStation(state, 'grill-2', { ingredient: 'cheese', prep: 'raw' }, 0.5, 'cooking');
    setStation(state, 'pot-2', { ingredient: 'potato', prep: 'raw' }, 0.3, 'cooking');
    state.plate = [
      { ingredient: 'bun', prep: 'raw' },
      { ingredient: 'patty', prep: 'grilled' },
      { ingredient: 'lettuce', prep: 'chopped' },
      { ingredient: 'cheese', prep: 'raw' },
    ];
    state.hand = null;
    state.servedPlates = ['garden-salad', 'cheese-toast'];
    return;
  }

  if (kind === 'end') {
    // End of shift: the summary panel over a finished kitchen.
    state.phase = 'over';
    state.timeLeft = 0;
    state.coins = 214;
    state.servedCount = 13;
    state.failedCount = 1;
    state.hearts = 2;
    state.combo = 0;
    state.bestCombo = 4;
    state.orders = [makeOrder(state, 9, 'crunch-salad', 20, 32)];
    state.plate = [{ ingredient: 'bun', prep: 'raw' }];
    state.servedPlates = ['sunny-burger', 'tomato-soup', 'farm-plate'];
    return;
  }

  // Unknown ?shot= value: fall back to the cover state.
  seedDemoState(state, 'cover');
}
