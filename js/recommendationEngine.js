import { getMealPeriod } from './mealPeriods.js';

const MAX_RECOMMENDATIONS = 30;

const META_CACHE = new WeakMap();

const SUBCATEGORY_MATCHERS = {
  'Ăn no': {
    rice: (meta) => hasAnyTag(meta, ['rice']),
    broth: (meta) => hasAnyTag(meta, ['broth', 'soup']),
    noodle: (meta) => hasAnyTag(meta, ['noodle', 'pasta']),
    grilled: (meta) => hasAnyTag(meta, ['grilled', 'bbq', 'roast']),
    hotpot: (meta) => hasAnyTag(meta, ['hotpot']),
    any: () => true,
  },
  'Ăn nhẹ': {
    healthy: (meta) => hasAnyTag(meta, ['healthy', 'salad', 'light']),
    bread: (meta) => hasAnyTag(meta, ['bread', 'sandwich', 'pastry']),
    light: (meta) => hasAnyTag(meta, ['light', 'soup', 'broth', 'porridge']),
    dimsum: (meta) => hasAnyTag(meta, ['dimsum', 'dumpling']),
    any: () => true,
  },
  'Ăn vặt': {
    fried: (meta) => hasAnyTag(meta, ['fried']),
    grilled: (meta) => hasAnyTag(meta, ['grilled', 'bbq']),
    sweet: (meta) => hasAnyTag(meta, ['sweet', 'dessert']),
    spicy: (meta) => hasAnyTag(meta, ['spicy']),
    any: () => true,
  },
  'Đồ uống': {
    coffee: (meta) => hasAnyTag(meta, ['coffee']),
    milkTea: (meta) => hasAnyTag(meta, ['milk-tea', 'milk_tea', 'milktea']),
    refresh: (meta) => hasAnyTag(meta, ['refreshing', 'tea', 'soda', 'cooler']),
    smoothie: (meta) => hasAnyTag(meta, ['smoothie', 'shake', 'frappe']),
    juice: (meta) => hasAnyTag(meta, ['juice']),
    any: () => true,
  },
};

export function filterFoods(foods, { mealPeriod, category, answers = {}, excludeIds = [] } = {}) {
  if (!category) return [];

  const excluded = new Set(excludeIds);
  const selectedSubcategory = getSelectedSubcategory(category, answers);

  const matched = foods
    .filter((food) => food.category === category && !excluded.has(food.id))
    .map((food) => {
      const meta = getFoodMeta(food);

      if (!matchesSubcategory(meta, category, selectedSubcategory)) {
        return null;
      }

      const score =
        getMealScore(meta, mealPeriod, category)
        + getCategoryBonus(meta, category)
        + getSubcategoryBonus(meta, category, selectedSubcategory);

      if (score <= 0) return null;

      return {
        food,
        score,
        random: Math.random(),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.random - right.random;
    })
    .map((entry) => entry.food);

  if (matched.length <= MAX_RECOMMENDATIONS) {
    return matched;
  }

  return shuffleList(matched).slice(0, MAX_RECOMMENDATIONS);
}

export function getFoodMeta(food) {
  if (META_CACHE.has(food)) {
    return META_CACHE.get(food);
  }

  const tags = new Set((food.tags || []).map(normalizeTag).filter(Boolean));
  const mealTags = normalizeMeals(food.meal);
  const meta = {
    ...food,
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
      const score =
        overlap
        + (meta.style === currentMeta.style ? 2 : 0)
        + (context.mealPeriod && meta.mealTags.includes(context.mealPeriod) ? 2 : 0)
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

function getMealScore(meta, mealPeriod, category) {
  if (!mealPeriod) return 4;
  if (category === 'Đồ uống') {
    return meta.mealTags.includes(mealPeriod) ? 10 : 4;
  }

  if (meta.mealTags.includes(mealPeriod)) {
    return 12;
  }

  if (mealPeriod === 'late-night' && hasAnyTag(meta, ['light', 'soup', 'broth', 'porridge', 'snack'])) {
    return 7;
  }

  if ((mealPeriod === 'lunch' || mealPeriod === 'dinner') && hasAnyTag(meta, ['main', 'rice', 'noodle'])) {
    return 6;
  }

  return 1;
}

function getCategoryBonus(meta, category) {
  if (category === 'Đồ uống' && hasAnyTag(meta, ['drink', 'beverage'])) return 3;
  if (category === 'Ăn vặt' && hasAnyTag(meta, ['snack'])) return 3;
  if (category === 'Ăn no' && hasAnyTag(meta, ['main', 'full-meal'])) return 3;
  if (category === 'Ăn nhẹ' && hasAnyTag(meta, ['light'])) return 2;
  return 0;
}

function getSubcategoryBonus(meta, category, subcategoryId) {
  if (subcategoryId === 'any') return 1;
  return matchesSubcategory(meta, category, subcategoryId) ? 6 : 0;
}

function hasAnyTag(meta, candidateTags) {
  return candidateTags.some((tag) => meta.tags.has(normalizeTag(tag)));
}

function normalizeMeals(meals) {
  if (!Array.isArray(meals)) return [];
  return meals
    .map((meal) => String(meal || '').trim().toLowerCase())
    .filter((meal) => meal === 'breakfast' || meal === 'lunch' || meal === 'dinner' || meal === 'late-night');
}

function normalizeTag(tag) {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '-')
    .replaceAll('_', '-');
}

function shuffleList(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}