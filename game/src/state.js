// Golden Ladle Bistro — state.js
// The whole shift in one object: orders, stations, the plate, the hand, money.
// Pure state transitions live here; rendering lives in render.js.

import {
  INGREDIENT_BY_ID,
  STATIONS,
  pickRandomRecipe,
  recipeNeedsText,
} from './recipes.js';

export const SHIFT_SECONDS = 150;
export const MAX_ORDERS = 3;
export const MAX_HEARTS = 3;
export const BURN_SECONDS = 6;

export function createInitialState() {
  return {
    phase: 'menu', // menu | playing | paused | over
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    servedCount: 0,
    failedCount: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    hand: null, // { ingredient, prep } or null
    plate: [], // components waiting on the assembly plate
    servedPlates: [], // recipe ids served this shift, newest last
    orders: [], // { id, recipe, patience, maxPatience }
    stations: STATIONS.map((station) => ({
      id: station.id,
      kind: station.kind,
      item: null, // { ingredient, prep } while cooking or done
      progress: 0,
      state: 'idle', // idle | cooking | done | burnt
      burnLeft: BURN_SECONDS,
    })),
    spawnTimer: 2,
    nextOrderId: 1,
    elapsed: 0,
    muted: false,
    lastServeAt: -999,
    rush: false,
  };
}

// How fast new orders arrive and how patient customers are, by shift progress.
// Pressure grows without adding chores: same six recipes, tighter timing.
export function spawnIntervalAt(elapsed) {
  if (elapsed < 40) return 15;
  if (elapsed < 90) return 12;
  return 9;
}

export function patienceAt(elapsed) {
  if (elapsed < 40) return 48;
  if (elapsed < 90) return 40;
  return 32;
}

export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const recipe = pickRandomRecipe(Math.random);
  const patience = patienceAt(state.elapsed);
  const order = {
    id: state.nextOrderId,
    recipe,
    patience,
    maxPatience: patience,
  };
  state.nextOrderId += 1;
  state.orders.push(order);
  return order;
}

export function orderMatchesPlate(order, plate) {
  const needs = order.recipe.components;
  if (needs.length !== plate.length) return false;
  const remaining = needs.map((c) => `${c.ingredient}:${c.prep}`);
  for (const item of plate) {
    const key = `${item.ingredient}:${item.prep}`;
    const at = remaining.indexOf(key);
    if (at === -1) return false;
    remaining.splice(at, 1);
  }
  return remaining.length === 0;
}

export function findMatchingOrder(state) {
  return state.orders.find((order) => orderMatchesPlate(order, state.plate)) ?? null;
}

export function plateHasComponent(state, component) {
  return state.plate.some(
    (item) => item.ingredient === component.ingredient && item.prep === component.prep,
  );
}

// Tip: full patience pays double the menu price, empty patience pays the price.
export function serveOrder(state, order) {
  const patienceShare = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(order.recipe.price * patienceShare);
  const comboBonus = state.combo >= 2 ? Math.round(order.recipe.price * 0.15 * state.combo) : 0;
  const earned = order.recipe.price + tip + comboBonus;
  state.coins += earned;
  state.servedCount += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.servedPlates.push(order.recipe.id);
  if (state.servedPlates.length > 4) state.servedPlates.shift();
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = [];
  state.lastServeAt = state.elapsed;
  return { earned, tip, comboBonus, recipeName: order.recipe.name };
}

export function expireOrder(state, order) {
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.failedCount += 1;
  state.hearts -= 1;
  state.combo = 0;
  if (state.hearts <= 0) {
    state.phase = 'over';
  }
}

export function takeIngredient(state, ingredientId) {
  const ingredient = INGREDIENT_BY_ID[ingredientId];
  if (!ingredient || state.hand) return null;
  state.hand = { ingredient: ingredientId, prep: 'raw' };
  return state.hand;
}

export function trashHand(state) {
  const had = state.hand;
  state.hand = null;
  return had;
}

export function removePlateItem(state, index) {
  if (index < 0 || index >= state.plate.length) return null;
  return state.plate.splice(index, 1)[0];
}

export function plateHintText(state) {
  const matching = findMatchingOrder(state);
  if (matching) return `Plated: ${matching.recipe.name} — ready to serve!`;
  if (state.plate.length === 0) return 'Click an ingredient below, prep it, then click the plate to add it.';
  const partial = state.orders
    .map((order) => {
      const missing = order.recipe.components.filter((c) => !plateHasComponent(state, c));
      return { order, missing: missing.length };
    })
    .sort((a, b) => a.missing - b.missing)[0];
  if (!partial) return 'No open order matches this plate yet.';
  return `Closest order: ${partial.order.recipe.name} — ${partial.missing} item(s) to go. Needs: ${recipeNeedsText(partial.order.recipe)}`;
}
