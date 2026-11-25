// Golden Ladle Bistro — recipes.js
// Every ingredient, every dish on the menu, and what each kitchen station does.
// Original menu: no dish, name or ingredient set is copied from any commercial game.

export const PREP_LABELS = {
  raw: 'fresh',
  chopped: 'chopped',
  grilled: 'grilled',
  boiled: 'boiled',
  ladled: 'ladled',
};

// Small badge shown on any prepped piece — in the hand, on the plate and on
// the station — so a finished ingredient can never be mistaken for a raw one.
export const PREP_BADGES = {
  chopped: '🔪',
  grilled: '🔥',
  boiled: '💧',
  ladled: '🍲',
};

export const PREP_VERBS = {
  chopped: 'Chop',
  grilled: 'Grill',
  boiled: 'Boil',
};

// One bin on the ingredient counter each. `preps` lists the finished states a
// station can turn this ingredient into; every ingredient is usable raw too.
export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', emoji: '\u{1F35E}', preps: [] },
  { id: 'patty', name: 'Patty', emoji: '\u{1F969}', preps: ['grilled'] },
  { id: 'lettuce', name: 'Lettuce', emoji: '\u{1F96C}', preps: ['chopped'] },
  { id: 'tomato', name: 'Tomato', emoji: '\u{1F345}', preps: ['chopped', 'boiled'] },
  { id: 'cucumber', name: 'Cucumber', emoji: '\u{1F952}', preps: ['chopped'] },
  { id: 'potato', name: 'Potato', emoji: '\u{1F954}', preps: ['boiled'] },
  { id: 'carrot', name: 'Carrot', emoji: '\u{1F955}', preps: ['chopped'] },
  { id: 'cheese', name: 'Cheese', emoji: '\u{1F9C0}', preps: ['grilled'] },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
);

// The ladled soup is not a counter bin — it only exists after tomato and
// potato have been combined in one pot and scooped into a bowl.
export const SOUP_INGREDIENT = { id: 'soup', name: 'Soup', emoji: '🍲', preps: [] };
INGREDIENT_BY_ID.soup = SOUP_INGREDIENT;

// A recipe component is one ingredient in one finished state.
export const RECIPES = [
  {
    id: 'sunny-burger',
    name: 'Sunny Burger',
    emoji: '\u{1F354}',
    price: 18,
    components: [
      { ingredient: 'bun', prep: 'raw' },
      { ingredient: 'patty', prep: 'grilled' },
      { ingredient: 'lettuce', prep: 'chopped' },
      { ingredient: 'cheese', prep: 'raw' },
    ],
  },
  {
    id: 'garden-salad',
    name: 'Garden Salad',
    emoji: '\u{1F957}',
    price: 12,
    components: [
      { ingredient: 'lettuce', prep: 'chopped' },
      { ingredient: 'tomato', prep: 'chopped' },
      { ingredient: 'cucumber', prep: 'chopped' },
    ],
  },
  {
    id: 'tomato-soup',
    name: 'Tomato Soup',
    emoji: '\u{1F963}',
    price: 14,
    components: [
      { ingredient: 'soup', prep: 'ladled' },
      { ingredient: 'carrot', prep: 'chopped' },
    ],
  },
  {
    id: 'cheese-toast',
    name: 'Cheese Toast',
    emoji: '\u{1F96A}',
    price: 11,
    components: [
      { ingredient: 'bun', prep: 'raw' },
      { ingredient: 'cheese', prep: 'grilled' },
      { ingredient: 'tomato', prep: 'chopped' },
    ],
  },
  {
    id: 'farm-plate',
    name: 'Farm Plate',
    emoji: '\u{1F37D}\uFE0F',
    price: 22,
    components: [
      { ingredient: 'patty', prep: 'grilled' },
      { ingredient: 'potato', prep: 'boiled' },
      { ingredient: 'carrot', prep: 'chopped' },
      { ingredient: 'lettuce', prep: 'chopped' },
    ],
  },
  {
    id: 'golden-melt',
    name: 'Golden Melt',
    emoji: '🧀',
    price: 20,
    components: [
      { ingredient: 'cheese', prep: 'grilled' },
      { ingredient: 'patty', prep: 'grilled' },
      { ingredient: 'potato', prep: 'boiled' },
    ],
  },
];

// Kitchen stations. Each station turns one prep into a finished ingredient.
// `seconds` is the cook time; leave food in too long after it finishes and it burns.
export const STATIONS = [
  { id: 'chop-1', kind: 'chopped', name: 'Chopping Board', icon: '\u{1F52A}', seconds: 2.5 },
  { id: 'chop-2', kind: 'chopped', name: 'Chopping Board', icon: '\u{1F52A}', seconds: 2.5 },
  { id: 'grill-1', kind: 'grilled', name: 'Grill', icon: '\u{1F525}', seconds: 4 },
  { id: 'grill-2', kind: 'grilled', name: 'Grill', icon: '\u{1F525}', seconds: 4 },
  { id: 'pot-1', kind: 'boiled', name: 'Soup Pot', icon: '\u{1F372}', seconds: 5 },
  { id: 'pot-2', kind: 'boiled', name: 'Soup Pot', icon: '\u{1F372}', seconds: 5 },
];

export const STATION_BY_ID = Object.fromEntries(
  STATIONS.map((station) => [station.id, station]),
);

export function describeComponent(component) {
  const ingredient = INGREDIENT_BY_ID[component.ingredient];
  const prep = PREP_LABELS[component.prep];
  return prep === 'fresh'
    ? ingredient.name.toLowerCase()
    : `${prep} ${ingredient.name.toLowerCase()}`;
}

export function recipeNeedsText(recipe) {
  return recipe.components.map(describeComponent).join(' + ');
}

export function pickRandomRecipe(random) {
  return RECIPES[Math.floor(random() * RECIPES.length)];
}
