/**
 * storage.js
 * LocalStorage persistence layer for Ăn Gì?
 */

const KEYS = {
  LIKED:    'angi_liked',
  HISTORY:  'angi_history',
  CATEGORY: 'angi_category',
  STYLES:   'angi_styles',
};

// ─── Liked Foods ──────────────────────────────────────────────────────────────

/** @returns {number[]} array of liked food IDs */
export function getLiked() {
  return _readJSON(KEYS.LIKED, []);
}

/** @param {number} id */
export function addLiked(id) {
  const list = getLiked();
  if (!list.includes(id)) {
    list.push(id);
    _writeJSON(KEYS.LIKED, list);
  }
}

/** @param {number} id */
export function removeLiked(id) {
  const list = getLiked().filter((x) => x !== id);
  _writeJSON(KEYS.LIKED, list);
}

/** @param {number} id @returns {boolean} */
export function isLiked(id) {
  return getLiked().includes(id);
}

// ─── View History ─────────────────────────────────────────────────────────────

/** @returns {number[]} array of viewed food IDs (most recent last) */
export function getHistory() {
  return _readJSON(KEYS.HISTORY, []);
}

/** @param {number} id */
export function addHistory(id) {
  const list = getHistory();
  if (!list.includes(id)) {
    list.push(id);
    _writeJSON(KEYS.HISTORY, list);
  }
}

export function clearHistory() {
  localStorage.removeItem(KEYS.HISTORY);
}

// ─── Selected Category ────────────────────────────────────────────────────────

/** @returns {string|null} */
export function getCategory() {
  return localStorage.getItem(KEYS.CATEGORY);
}

/** @param {string} category */
export function setCategory(category) {
  localStorage.setItem(KEYS.CATEGORY, category);
}

// ─── Active Styles ────────────────────────────────────────────────────────────

const ALL_STYLES = ['Món nước', 'Món khô'];

/** @returns {string[]} */
export function getStyles() {
  const saved = _readJSON(KEYS.STYLES, null);
  return saved && saved.length ? saved : [...ALL_STYLES];
}

/** @param {string[]} styles */
export function setStyles(styles) {
  _writeJSON(KEYS.STYLES, styles);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function _writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode — fail silently
  }
}
