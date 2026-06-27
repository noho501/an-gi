/**
 * filter.js
 * Isolated filtering logic for Ăn Gì?
 * Handles category and style filtering.
 */

/**
 * Filter a food list by category and active style chips.
 *
 * @param {Array}  foods          - Full food array from foodData.js
 * @param {string} category       - One of: 'Ăn no' | 'Ăn nhẹ' | 'Ăn vặt' | 'Đồ uống'
 * @param {Set}    activeStyles   - Set of active style strings, e.g. new Set(['Món nước', 'Món khô'])
 * @returns {Array}               - Filtered and shuffled food array
 */
export function filterFoods(foods, category, activeStyles) {
  const byCategory = foods.filter((f) => f.category === category);

  const byStyle =
    activeStyles.size === 0
      ? byCategory
      : byCategory.filter((f) => activeStyles.has(f.style));

  return shuffle(byStyle);
}

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 * @param {Array} arr
 * @returns {Array}
 */
export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Toggle a style inside a Set, returning a new Set.
 * If the toggle would empty the Set, keeps the current state (at least one style must remain active).
 *
 * @param {Set}    current  - Current active styles
 * @param {string} style    - Style to toggle
 * @returns {Set}           - New Set after toggle
 */
export function toggleStyle(current, style) {
  const next = new Set(current);
  if (next.has(style)) {
    // Keep at least one style active
    if (next.size > 1) {
      next.delete(style);
    }
  } else {
    next.add(style);
  }
  return next;
}
