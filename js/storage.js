const KEYS = {
  LIKED: 'angi_liked',
  HISTORY: 'angi_history',
  SESSION: 'angi_session',
  THEME: 'angi_theme',
  MEAL_PERIOD: 'angi_meal_period',
  RECENT_RECOMMENDATIONS: 'angi_recent_recommendations',
};

const MAX_HISTORY_ITEMS = 60;

export function getLiked() {
  return readJSON(KEYS.LIKED, []);
}

export function isLiked(id) {
  return getLiked().includes(id);
}

export function addLiked(id) {
  const next = dedupeRecent(getLiked(), id);
  writeJSON(KEYS.LIKED, next);
  return next;
}

export function removeLiked(id) {
  const next = getLiked().filter((entry) => entry !== id);
  writeJSON(KEYS.LIKED, next);
  return next;
}

export function toggleLiked(id) {
  return isLiked(id) ? removeLiked(id) : addLiked(id);
}

export function getHistory() {
  return readJSON(KEYS.HISTORY, []);
}

export function addHistory(id) {
  const next = dedupeRecent(getHistory(), id).slice(0, MAX_HISTORY_ITEMS);
  writeJSON(KEYS.HISTORY, next);
  return next;
}

export function clearHistory() {
  localStorage.removeItem(KEYS.HISTORY);
}

export function getSession() {
  return readJSON(KEYS.SESSION, null);
}

export function setSession(session) {
  writeJSON(KEYS.SESSION, session);
}

export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

export function getMealPeriodPreference() {
  return localStorage.getItem(KEYS.MEAL_PERIOD);
}

export function setMealPeriodPreference(periodId) {
  try {
    localStorage.setItem(KEYS.MEAL_PERIOD, periodId);
  } catch {
    return null;
  }

  return periodId;
}

export function getRecentRecommendations() {
  return readJSON(KEYS.RECENT_RECOMMENDATIONS, []);
}

export function setRecentRecommendations(ids) {
  return writeJSON(KEYS.RECENT_RECOMMENDATIONS, Array.isArray(ids) ? ids : []);
}

export function getTheme() {
  return localStorage.getItem(KEYS.THEME);
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEYS.THEME, theme);
  } catch {
    return null;
  }

  return theme;
}

function dedupeRecent(items, id) {
  return [id, ...items.filter((entry) => entry !== id)];
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
