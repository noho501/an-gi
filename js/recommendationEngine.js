import { getMealPeriod } from './mealPeriods.js';

const TAG_GROUPS = {
  soup: ['phở', 'bún', 'hủ tiếu', 'cháo', 'bánh canh', 'mì', 'miến', 'ramen', 'udon', 'canh'],
  noodle: ['phở', 'bún', 'hủ tiếu', 'mì', 'miến', 'ramen', 'udon', 'pasta', 'nui', 'bánh canh', 'mì quảng'],
  porridge: ['cháo'],
  rice: ['cơm', 'bibimbap', 'curry rice'],
  bread: ['bánh', 'xôi'],
  grilled: ['nướng', 'bbq', 'quay', 'lúc lắc', 'né'],
  bbq: ['bbq'],
  steak: ['steak', 'bít tết', 'né'],
  hotpot: ['lẩu'],
  heavy: ['bbq', 'steak', 'bít tết', 'lẩu', 'quay'],
  healthy: ['sushi', 'sashimi', 'gỏi cuốn', 'trái cây'],
  dimsum: ['há cảo', 'xíu mại', 'dimsum', 'bánh bao', 'tokbokki', 'kimbap'],
  fried: ['chiên', 'rán', 'lắc'],
  sweet: ['kem', 'flan', 'yaourt', 'chè', 'trái cây'],
  spicy: ['ớt', 'cay', 'sa tế'],
  coffee: ['cà phê', 'latte', 'cappuccino', 'bạc xỉu'],
  milkTea: ['trà sữa'],
  refresh: ['soda', 'mojito', 'nước mía', 'nước dừa', 'trà đào', 'trà tắc', 'trà chanh'],
  smoothie: ['sinh tố'],
  juice: ['nước cam', 'nước chanh', 'nước ép'],
  japanese: ['sushi', 'sashimi', 'ramen', 'udon', 'katsu'],
  korean: ['bibimbap', 'tokbokki', 'kimbap'],
  fastFood: ['pizza', 'burger', 'gà rán'],
  vietnamese: ['phở', 'bún', 'hủ tiếu', 'cơm', 'bánh', 'canh', 'cháo', 'lẩu', 'gỏi cuốn'],
  drink: ['trà', 'cà phê', 'soda', 'mojito', 'sinh tố', 'nước'],
};

const SEARCH_CACHE = new WeakMap();
const META_CACHE = new WeakMap();

const SUBCATEGORY_MATCHERS = {
  'Ăn no': {
    rice: (meta) => meta.tags.has('rice'),
    broth: (meta) => meta.style === 'Món nước' && !meta.tags.has('hotpot'),
    noodle: (meta) => meta.tags.has('noodle'),
    grilled: (meta) => meta.tags.has('grilled') || meta.tags.has('bbq') || meta.tags.has('steak'),
    hotpot: (meta) => meta.tags.has('hotpot'),
    any: () => true,
  },
  'Ăn nhẹ': {
    healthy: (meta) => meta.tags.has('healthy'),
    bread: (meta) => meta.tags.has('bread'),
    light: (meta) => meta.style === 'Món nước' || meta.tags.has('porridge') || meta.name === 'Gỏi Cuốn',
    dimsum: (meta) => meta.tags.has('dimsum'),
    any: () => true,
  },
  'Ăn vặt': {
    fried: (meta) => meta.tags.has('fried'),
    grilled: (meta) => meta.tags.has('grilled'),
    sweet: (meta) => meta.tags.has('sweet'),
    spicy: (meta) => meta.tags.has('spicy'),
    any: () => true,
  },
  'Đồ uống': {
    coffee: (meta) => meta.tags.has('coffee'),
    milkTea: (meta) => meta.tags.has('milkTea'),
    refresh: (meta) => meta.tags.has('refresh'),
    smoothie: (meta) => meta.tags.has('smoothie'),
    juice: (meta) => meta.tags.has('juice'),
    any: () => true,
  },
};

export function filterFoods(foods, { mealPeriod, category, answers = {}, excludeIds = [] } = {}) {
  if (!category) return [];

  const excluded = new Set(excludeIds);
  const scored = foods
    .filter((food) => food.category === category && !excluded.has(food.id))
    .map((food) => {
      const meta = getFoodMeta(food);
      const selectedSubcategory = getSelectedSubcategory(category, answers);

      if (!matchesSubcategory(meta, category, selectedSubcategory)) {
        return null;
      }

      const score = getMealScore(meta, mealPeriod, category, selectedSubcategory);
      if (score <= 0) return null;

      return {
        food,
        score: score + getCategoryBonus(meta, category) + getSubcategoryBonus(meta, category, selectedSubcategory),
        random: Math.random(),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.random - right.random;
    });

  return scored.map((entry) => entry.food);
}

export function getFoodMeta(food) {
  if (META_CACHE.has(food)) {
    return META_CACHE.get(food);
  }

  const search = getSearchText(food);
  const name = food.name.toLowerCase();
  const tags = new Set();

  Object.entries(TAG_GROUPS).forEach(([tag, keywords]) => {
    const haystack = shouldUseSearch(tag) ? search : name;
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      tags.add(tag);
    }
  });

  const mealTags = getMealTags(food, tags);
  const meta = {
    ...food,
    search,
    tags,
    mealTags,
    mealTagLabels: mealTags.map((periodId) => getMealPeriod(periodId).label),
  };

  META_CACHE.set(food, meta);
  return meta;
}

export function getRelatedFoods(foods, currentFood, context = {}, limit = 4) {
  if (!currentFood) return [];

  const currentMeta = getFoodMeta(currentFood);
  const selectedSubcategory = getSelectedSubcategory(currentFood.category, context.answers || {});

  return foods
    .filter((food) => food.id !== currentFood.id && food.category === currentFood.category)
    .map((food) => {
      const meta = getFoodMeta(food);
      const overlap = [...meta.tags].filter((tag) => currentMeta.tags.has(tag)).length;
      const score = overlap
        + (meta.style === currentMeta.style ? 2 : 0)
        + (meta.mealTags.includes(context.mealPeriod) ? 2 : 0)
        + (matchesSubcategory(meta, currentFood.category, selectedSubcategory) ? 2 : 0);

      return { food, score, random: Math.random() };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.random - right.random;
    })
    .slice(0, limit)
    .map((entry) => entry.food);
}

function getSelectedSubcategory(category, answers = {}) {
  const firstAnswer = Object.values(answers)[0];
  const matchers = SUBCATEGORY_MATCHERS[category];
  return matchers && firstAnswer && matchers[firstAnswer] ? firstAnswer : 'any';
}

function matchesSubcategory(meta, category, subcategoryId) {
  const categoryMatchers = SUBCATEGORY_MATCHERS[category];
  if (!categoryMatchers) return false;
  return (categoryMatchers[subcategoryId] || categoryMatchers.any)(meta);
}

function getMealScore(meta, mealPeriod, category, subcategoryId) {
  if (!mealPeriod) return 1;

  const explicitHeavyChoice = isExplicitHeavyChoice(subcategoryId);

  switch (mealPeriod) {
    case 'breakfast': {
      if (meta.category === 'Đồ uống') {
        return meta.tags.has('coffee') || meta.tags.has('juice') || meta.search.includes('trà') ? 8 : 5;
      }

      if (meta.meal !== 'breakfast' && !explicitHeavyChoice) {
        return 0;
      }

      let score = meta.meal === 'breakfast' ? 12 : 4;
      if (meta.meal === 'breakfast' && (meta.tags.has('soup') || meta.tags.has('porridge') || meta.tags.has('bread'))) score += 2;
      if (meta.tags.has('heavy') && !explicitHeavyChoice) score -= 14;
      return score;
    }
    case 'lunch': {
      let score = meta.meal === 'main' ? 9 : 0;
      if (meta.tags.has('rice') || meta.tags.has('soup') || meta.tags.has('noodle')) score += 4;
      if (meta.tags.has('vietnamese') || meta.tags.has('japanese') || meta.tags.has('korean') || meta.tags.has('fastFood') || meta.tags.has('grilled')) score += 3;
      if (category === 'Đồ uống') score += 5;
      return score;
    }
    case 'dinner': {
      let score = 6;
      if (meta.meal === 'main') score += 5;
      if (meta.tags.has('hotpot') || meta.tags.has('grilled') || meta.tags.has('rice') || meta.tags.has('noodle')) score += 3;
      return score;
    }
    case 'late-night': {
      let score = 0;
      if (meta.category === 'Đồ uống' || meta.category === 'Ăn vặt') score += 7;
      if (meta.tags.has('porridge') || (meta.style === 'Món nước' && (meta.tags.has('soup') || meta.tags.has('noodle')))) score += 7;
      if (meta.style === 'Món nước' && (meta.search.includes('phở') || meta.search.includes('hủ tiếu') || meta.search.includes('bún') || meta.search.includes('mì'))) score += 3;
      if (explicitHeavyChoice && (meta.tags.has('grilled') || meta.tags.has('hotpot') || meta.tags.has('steak'))) score += 4;
      if (meta.tags.has('heavy') && !explicitHeavyChoice) score -= 12;
      return score;
    }
    default:
      return 1;
  }
}

function getCategoryBonus(meta, category) {
  if (category === 'Đồ uống') return meta.tags.has('drink') ? 3 : 0;
  if (category === 'Ăn vặt') return meta.meal === 'snack' ? 3 : 0;
  if (category === 'Ăn nhẹ') return meta.meal === 'breakfast' || meta.meal === 'snack' ? 3 : 1;
  if (category === 'Ăn no') return meta.meal === 'main' || meta.meal === 'breakfast' ? 3 : 0;
  return 0;
}

function getSubcategoryBonus(meta, category, subcategoryId) {
  if (subcategoryId === 'any') return 1;
  return matchesSubcategory(meta, category, subcategoryId) ? 6 : 0;
}

function getMealTags(food, tags) {
  const mealTags = new Set();

  if (food.meal === 'breakfast') {
    mealTags.add('breakfast');
  }

  if (food.meal === 'main') {
    mealTags.add('lunch');
    mealTags.add('dinner');
  }

  if (food.meal === 'snack') {
    mealTags.add('lunch');
    mealTags.add('dinner');
    mealTags.add('late-night');
  }

  if (food.meal === 'drink') {
    mealTags.add('breakfast');
    mealTags.add('lunch');
    mealTags.add('dinner');
    mealTags.add('late-night');
  }

  if (tags.has('porridge') || (food.style === 'Món nước' && (tags.has('soup') || tags.has('noodle')))) {
    mealTags.add('late-night');
  }

  if (tags.has('coffee') || tags.has('juice')) {
    mealTags.add('breakfast');
  }

  if (!mealTags.size) {
    mealTags.add('dinner');
  }

  return [...mealTags];
}

function getSearchText(food) {
  if (!SEARCH_CACHE.has(food)) {
    SEARCH_CACHE.set(
      food,
      [food.name, food.description, food.style, ...(food.ingredients || [])]
        .join(' ')
        .toLowerCase(),
    );
  }

  return SEARCH_CACHE.get(food);
}

function isExplicitHeavyChoice(subcategoryId) {
  return subcategoryId === 'grilled' || subcategoryId === 'hotpot';
}

function shouldUseSearch(tag) {
  return tag === 'spicy' || tag === 'refresh' || tag === 'vietnamese';
}
