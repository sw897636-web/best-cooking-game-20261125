// Golden Ladle Bistro — render.js
// Everything the player sees: order tickets, stations, the assembly plate,
// the serve counter, the header and the end-of-shift panel. Rebuilt from
// state on every frame tick so the screen can never drift from the game.

import { INGREDIENT_BY_ID, PREP_BADGES, PREP_LABELS, recipeNeedsText } from './recipes.js';
import { findMatchingOrder, maxOrdersAt, plateHasComponent, plateHintText } from './state.js';
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
  // No empty pill: the combo chip only exists once a combo is running.
  if (state.combo >= 2) {
    els.comboBadge.style.display = '';
    els.comboBadge.textContent = `COMBO x${state.combo}`;
  } else {
    els.comboBadge.style.display = 'none';
    els.comboBadge.textContent = '';
  }
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
      .map((c) => {
        const done = plateHasComponent(state, c);
        const badge = c.prep === 'raw' ? '' : (PREP_BADGES[c.prep] ?? '');
        return done
          ? `<span class="ticket-item done" title="${escapeHtml(recipeNeedsText(order.recipe))}">✅${INGREDIENT_BY_ID[c.ingredient].emoji}</span>`
          : `<span class="ticket-item" title="${escapeHtml(recipeNeedsText(order.recipe))}">${INGREDIENT_BY_ID[c.ingredient].emoji}${badge ? `<span class="mini-badge">${badge}</span>` : ''}</span>`;
      })
      .join(' ');
    const statusLine = serveable
      ? `<div class="ticket-status ready">✅ Ready on the plate — hit SERVE to send it</div>`
      : `<div class="ticket-status">⏳ Waiting for the plate — ${order.patience < order.maxPatience * 0.33 ? 'almost out of patience!' : 'cook it before patience runs out'}</div>`;
    ticket.innerHTML =
      `<div class="ticket-head"><span>#${order.id} ${recipe.name}</span>` +
      `<span class="price">$${recipe.price}</span></div>` +
      `<div class="ticket-recipe">${recipe.emoji} ${icons}</div>` +
      `<div class="ticket-needs">${recipeNeedsText(recipe)}</div>` +
      statusLine +
      `<div class="patience-bar"><div class="patience-fill ${patienceClass(order)}" ` +
      `style="width:${Math.max(0, (order.patience / order.maxPatience) * 100)}%"></div></div>`;
    els.orderBoard.appendChild(ticket);
  }
  const slots = maxOrdersAt(state.elapsed);
  for (let i = state.orders.length; i < slots; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'order-empty';
    empty.textContent = 'Waiting for customers…';
    els.orderBoard.appendChild(empty);
  }
}

const STATION_GROUPS = [
  { kind: 'chopped', label: 'BOARDS' },
  { kind: 'grilled', label: 'GRILLS' },
  { kind: 'boiled', label: 'POTS' },
];

export function renderStations(state, els) {
  els.stationRow.innerHTML = '';
  for (const group of STATION_GROUPS) {
    const groupEl = document.createElement('div');
    groupEl.className = 'station-group';
    groupEl.innerHTML = `<div class="station-group-head">${group.label}</div>`;
    for (const station of state.stations.filter((s) => s.kind === group.kind)) {
      groupEl.appendChild(buildStationEl(state, station));
    }
    els.stationRow.appendChild(groupEl);
  }
}

function buildStationEl(state, station) {
  const el = document.createElement('div');
  el.className = `station ${station.state}`;
  el.dataset.stationId = station.id;
  const icon = station.state === 'idle' ? stationIcon(station) : '';
  const itemEmoji = station.item ? INGREDIENT_BY_ID[station.item.ingredient].emoji : '';
  // The station shows the finished piece: a soup pot with both halves shows
  // the ladled bowl, and every prepped piece carries its prep badge.
  const shownPrep = station.state === 'done'
    ? (station.kind === 'boiled' && station.item.parts?.length === 2 ? 'ladled' : station.kind)
    : null;
  const shownEmoji = station.state === 'done' && shownPrep === 'ladled'
    ? INGREDIENT_BY_ID.soup.emoji
    : itemEmoji;
  const badge = shownPrep ? (PREP_BADGES[shownPrep] ?? '') : '';
  const stateLine = stationStatusText(station);
  const burnNote = station.state === 'burnt'
    ? '<div class="burn-label">BURNT — click to clear</div><div class="smoke">💨 💨</div>'
    : '';
  const steam = station.state === 'cooking'
    ? '<div class="steam"><span>💨</span><span>💨</span></div>'
    : '';
  const progress = station.state === 'cooking' || station.state === 'done'
    ? `<div class="progress-track"><div class="progress-fill" style="width:${Math.round(station.progress * 100)}%"></div></div>`
    : '';
  el.innerHTML =
    `<div class="station-icon">${icon}</div>` +
    `<div class="station-name">${stationName(station)}</div>` +
    `<div class="station-item">${shownEmoji}${badge ? `<span class="prep-badge">${badge}</span>` : ''}</div>` +
    `<div class="station-state">${stateLine}</div>` +
    `${steam}${burnNote}${progress}`;
  return el;
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
    const badge = item.prep === 'raw' ? '' : (PREP_BADGES[item.prep] ?? '');
    if (badge) chip.innerHTML = `${INGREDIENT_BY_ID[item.ingredient].emoji}<span class="prep-badge">${badge}</span>`;
    els.plateItems.appendChild(chip);
  });
  const matching = findMatchingOrder(state);
  els.serveBtn.disabled = !matching;
  els.serveBtn.classList.toggle('ready', Boolean(matching));
  els.serveBtn.textContent = matching ? `SERVE ${matching.recipe.name} \u2713` : 'SERVE';
  els.plateHint.textContent = plateHintText(state);
  const hand = state.hand;
  const handBadge = hand && hand.prep !== 'raw' ? (PREP_BADGES[hand.prep] ?? '') : '';
  els.handSlot.innerHTML = hand
    ? `${INGREDIENT_BY_ID[hand.ingredient].emoji}${handBadge ? `<span class="prep-badge">${handBadge}</span>` : ''}`
    : '<span class="hand-empty">🤏</span>';
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
    'golden-melt': '🧀',
  };
  return map[recipeId] ?? '\u{1F37D}\uFE0F';
}

export function renderEndPanel(state, els) {
  // Stars are earned with money: $120 / $200 / $300. The best shift is kept
  // on this machine so the next shift has a number to beat.
  const stars = state.coins >= 300 ? 3 : state.coins >= 200 ? 2 : state.coins >= 120 ? 1 : 0;
  let best = 0;
  try {
    best = Number(window.localStorage.getItem('golden-ladle-best') ?? 0) || 0;
    if (state.coins > best) {
      best = state.coins;
      window.localStorage.setItem('golden-ladle-best', String(best));
    }
  } catch { /* private mode: best score just does not persist */ }
  els.endStats.innerHTML =
    `<div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` +
    `<div class="star-goals">★ $120 &nbsp;•&nbsp; ★★ $200 &nbsp;•&nbsp; ★★★ $300</div>` +
    `<div class="big-coins">$${state.coins} earned</div>` +
    `<div>Best shift on this machine: <b>$${best}</b></div>` +
    `<div>Dishes served: <b>${state.servedCount}</b> &nbsp;•&nbsp; Orders lost: <b>${state.failedCount}</b></div>` +
    `<div>Best combo: <b>x${state.bestCombo}</b> &nbsp;•&nbsp; Hearts left: <b>${state.hearts}</b></div>` +
    `<div>${endLine(state)}</div>`;
}

function endLine(state) {
  if (state.coins >= 300) return 'Head-chef material! The whole bistro is buzzing.';
  if (state.coins >= 200) return 'A solid shift — the regulars are already back.';
  if (state.coins >= 120) return 'Not bad for a first rush. Sharpen those knives!';
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

// A floating "+$18 dish +$5 tip" that rises off the plate when a dish is
// served, plus a "COMBO x3!" pop once a combo is running.
export function spawnServeFloater(els, result, combo) {
  const layer = els.floaterLayer;
  if (!layer) return;
  const main = document.createElement('div');
  main.className = 'floater gold';
  main.textContent = `+$${result.price} dish +$${result.tip} tip${result.comboBonus > 0 ? ` +$${result.comboBonus} combo` : ''} = +$${result.earned}`;
  layer.appendChild(main);
  if (combo >= 2) {
    const pop = document.createElement('div');
    pop.className = 'floater combo-pop';
    pop.textContent = `COMBO x${combo}!`;
    layer.appendChild(pop);
  }
  window.setTimeout(() => {
    layer.querySelectorAll('.floater').forEach((el) => el.remove());
  }, 1400);
}

// Shake the hearts chip when an order walks out.
export function shakeHearts(els) {
  els.hearts.classList.remove('shake');
  void els.hearts.offsetWidth;
  els.hearts.classList.add('shake');
  window.setTimeout(() => els.hearts.classList.remove('shake'), 500);
}
