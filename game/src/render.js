// Golden Ladle Bistro — render.js
// Everything the player sees: order tickets, stations, the assembly plate,
// the serve counter, the header and the end-of-shift panel. Rebuilt from
// state on every frame tick so the screen can never drift from the game.

import { INGREDIENT_BY_ID, PREP_LABELS, recipeNeedsText } from './recipes.js';
import { findMatchingOrder, plateHintText } from './state.js';
import { stationStatusText } from './stations.js';

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function patienceClass(order) {
  const share = order.patience / order.maxPatience;
  if (share < 0.33) return 'crit';
  if (share < 0.6) return 'warn';
  return '';
}

export function renderHeader(state, els) {
  els.shiftTimer.textContent = formatClock(state.timeLeft);
  els.shiftTimer.classList.toggle('low', state.timeLeft <= 30 && state.phase === 'playing');
  els.coinCount.textContent = `${state.coins}`;
  els.hearts.textContent = '\u2764\uFE0F'.repeat(state.hearts) + '\u{1F494}'.repeat(3 - state.hearts);
  els.comboBadge.textContent = state.combo >= 2 ? `COMBO x${state.combo}` : '';
  els.rushBanner.classList.toggle('on', state.rush && state.phase === 'playing');
}

export function renderOrders(state, els) {
  els.orderBoard.innerHTML = '';
  for (const order of state.orders) {
    const ticket = document.createElement('div');
    ticket.className = 'order-ticket';
    ticket.dataset.orderId = String(order.id);
    const serveable = findMatchingOrder(state) === order;
    if (serveable) ticket.classList.add('serveable');
    const recipe = order.recipe;
    const icons = recipe.components
      .map((c) => INGREDIENT_BY_ID[c.ingredient].emoji)
      .join(' ');
    ticket.innerHTML =
      `<div class="ticket-head"><span>#${order.id} ${recipe.name}</span>` +
      `<span class="price">$${recipe.price}</span></div>` +
      `<div class="ticket-recipe">${recipe.emoji} ${icons}</div>` +
      `<div class="ticket-needs">${recipeNeedsText(recipe)}</div>` +
      `<div class="patience-bar"><div class="patience-fill ${patienceClass(order)}" ` +
      `style="width:${Math.max(0, (order.patience / order.maxPatience) * 100)}%"></div></div>`;
    els.orderBoard.appendChild(ticket);
  }
  for (let i = state.orders.length; i < 3; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'order-empty';
    empty.textContent = 'Waiting for customers…';
    els.orderBoard.appendChild(empty);
  }
}

export function renderStations(state, els) {
  els.stationRow.innerHTML = '';
  for (const station of state.stations) {
    const el = document.createElement('div');
    el.className = `station ${station.state}`;
    el.dataset.stationId = station.id;
    const icon = station.state === 'idle' ? stationIcon(station) : '';
    const itemEmoji = station.item ? INGREDIENT_BY_ID[station.item.ingredient].emoji : '';
    const stateLine = stationStatusText(station);
    const burnNote = station.state === 'burnt'
      ? '<div class="burn-label">BURNT — click to clear</div>'
      : '';
    const progress = station.state === 'cooking' || station.state === 'done'
      ? `<div class="progress-track"><div class="progress-fill" style="width:${Math.round(station.progress * 100)}%"></div></div>`
      : '';
    el.innerHTML =
      `<div class="station-icon">${icon}</div>` +
      `<div class="station-name">${stationName(station)}</div>` +
      `<div class="station-item">${itemEmoji}</div>` +
      `<div class="station-state">${stateLine}</div>` +
      `${burnNote}${progress}`;
    els.stationRow.appendChild(el);
  }
}

function stationIcon(station) {
  return station.kind === 'chopped' ? '\u{1F52A}' : station.kind === 'grilled' ? '\u{1F525}' : '\u{1F372}';
}

function stationName(station) {
  return station.kind === 'chopped' ? 'Chopping Board' : station.kind === 'grilled' ? 'Grill' : 'Soup Pot';
}

export function renderPlate(state, els) {
  els.plateItems.innerHTML = '';
  if (state.plate.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'plate-empty';
    empty.textContent = 'Empty plate — add prepped food here';
    els.plateItems.appendChild(empty);
  }
  state.plate.forEach((item, index) => {
    const chip = document.createElement('div');
    chip.className = 'plate-item';
    chip.dataset.plateIndex = String(index);
    chip.title = `${PREP_LABELS[item.prep]} ${INGREDIENT_BY_ID[item.ingredient].name} — click to remove`;
    chip.textContent = INGREDIENT_BY_ID[item.ingredient].emoji;
    els.plateItems.appendChild(chip);
  });
  const matching = findMatchingOrder(state);
  els.serveBtn.disabled = !matching;
  els.serveBtn.classList.toggle('ready', Boolean(matching));
  els.serveBtn.textContent = matching ? `SERVE ${matching.recipe.name} \u2713` : 'SERVE';
  els.plateHint.innerHTML = `<b>Plate:</b> ${escapeHtml(plateHintText(state))}`;
  const hand = state.hand;
  els.handSlot.textContent = hand ? INGREDIENT_BY_ID[hand.ingredient].emoji : '\u{1F90F}';
  els.handText.textContent = hand
    ? `${PREP_LABELS[hand.prep]} ${INGREDIENT_BY_ID[hand.ingredient].name} — click a station or the plate`
    : 'Hands empty — grab an ingredient below';
  els.handText.classList.toggle('hand-empty', !hand);
}

export function renderServeCounter(state, els) {
  els.servedPlates.innerHTML = '';
  if (state.servedPlates.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'counter-empty';
    empty.textContent = 'Finished dishes land here before the waiter takes them.';
    els.servedPlates.appendChild(empty);
  }
  for (const recipeId of state.servedPlates) {
    const plate = document.createElement('div');
    plate.className = 'served-plate';
    plate.textContent = recipeEmoji(recipeId);
    els.servedPlates.appendChild(plate);
  }
}

function recipeEmoji(recipeId) {
  const map = {
    'sunny-burger': '\u{1F354}',
    'garden-salad': '\u{1F957}',
    'tomato-soup': '\u{1F963}',
    'cheese-toast': '\u{1F96A}',
    'farm-plate': '\u{1F37D}\uFE0F',
    'crunch-salad': '\u{1F955}',
  };
  return map[recipeId] ?? '\u{1F37D}\uFE0F';
}

export function renderEndPanel(state, els) {
  const stars = state.servedCount >= 14 ? 3 : state.servedCount >= 9 ? 2 : state.servedCount >= 5 ? 1 : 0;
  els.endStats.innerHTML =
    `<div class="stars">${'\u2B50'.repeat(stars)}${'\u2606'.repeat(3 - stars)}</div>` +
    `<div class="big-coins">$${state.coins} earned</div>` +
    `<div>Dishes served: <b>${state.servedCount}</b> &nbsp;•&nbsp; Orders lost: <b>${state.failedCount}</b></div>` +
    `<div>Best combo: <b>x${state.bestCombo}</b> &nbsp;•&nbsp; Hearts left: <b>${state.hearts}</b></div>` +
    `<div>${endLine(state)}</div>`;
}

function endLine(state) {
  if (state.servedCount >= 14) return 'Head-chef material! The whole bistro is buzzing.';
  if (state.servedCount >= 9) return 'A solid shift — the regulars are already back.';
  if (state.servedCount >= 5) return 'Not bad for a first rush. Sharpen those knives!';
  return 'The lunch rush won this round. One more shift?';
}

export function renderAll(state, els) {
  renderHeader(state, els);
  renderOrders(state, els);
  renderStations(state, els);
  renderPlate(state, els);
  renderServeCounter(state, els);
  if (state.phase === 'over') renderEndPanel(state, els);
}

export function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

let toastTimer = 0;
export function showToast(els, message, gold = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('gold', gold);
  els.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 1800);
}
