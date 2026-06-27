/**
 * app.js
 * Main application orchestrator for Ăn Gì?
 */

import { getFoods }                       from './foodData.js';
import { filterFoods, toggleStyle }       from './filter.js';
import { attachSwipe, triggerLike, triggerSkip } from './tinder.js';
import {
  getLiked, addLiked, removeLiked, isLiked,
  addHistory,
  getCategory, setCategory,
  getStyles, setStyles,
} from './storage.js';

// ─── State ────────────────────────────────────────────────────────────────────
let allFoods      = [];
let deck          = [];          // remaining cards for this session
let activeStyles  = new Set(getStyles());
let currentCategory = getCategory();
let detailFood    = null;        // food shown in bottom-sheet
let isAnimating   = false;       // prevent double-tap

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async function init() {
  allFoods = await getFoods();
  renderGreeting();
  bindHomeButton();
  bindBackButton();
  bindCategoryCards();
  bindFilterChips();
  bindEndButtons();
  bindDetailSheet();
  bindThemeToggle();
  applyStoredTheme();
  restoreFilterChipUI();
})();

// ─── Greeting ─────────────────────────────────────────────────────────────────
function renderGreeting() {
  const hour = new Date().getHours();
  let icon, title, subtitle;

  if (hour >= 5 && hour < 11) {
    icon = '🍳'; title = 'Chào buổi sáng'; subtitle = 'Hôm nay bạn muốn ăn gì?';
  } else if (hour >= 11 && hour < 14) {
    icon = '☀️'; title = 'Đến giờ ăn trưa'; subtitle = 'Chọn món thôi!';
  } else if (hour >= 17 && hour < 21) {
    icon = '🌙'; title = 'Ăn tối nào'; subtitle = 'Vuốt để tìm món ngon.';
  } else {
    icon = '🌃'; title = 'Đói bụng rồi?'; subtitle = 'Cùng tìm món nhé!';
  }

  qs('#greeting-icon').textContent    = icon;
  qs('#greeting-title').textContent   = title;
  qs('#greeting-subtitle').textContent = subtitle;
}

// ─── Navigation helpers ───────────────────────────────────────────────────────
function showScreen(id) {
  qsa('.screen').forEach((s) => s.classList.remove('active'));
  qs(`#${id}`).classList.add('active');
}

// ─── Back Button ──────────────────────────────────────────────────────────────
function bindBackButton() {
  qs('#btn-back').addEventListener('click', () => showScreen('screen-step1'));
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function bindHomeButton() {
  qs('#btn-start').addEventListener('click', () => showScreen('screen-step1'));
}

// ─── Step 1 – Category Selection ──────────────────────────────────────────────
function bindCategoryCards() {
  qsa('.category-card').forEach((card) => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      currentCategory = cat;
      setCategory(cat);

      // Show / hide style chips depending on whether this category has styles
      const hasStyles = cat !== 'Đồ uống';
      qs('#filter-chips').style.display = hasStyles ? 'flex' : 'none';

      buildDeck();
      showScreen('screen-swipe');
    });
  });
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────
function bindFilterChips() {
  qsa('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const style = chip.dataset.style;
      activeStyles = toggleStyle(activeStyles, style);
      setStyles([...activeStyles]);
      updateChipUI();
      rebuildDeckWithStyles();
    });
  });
}

function updateChipUI() {
  qsa('.chip').forEach((chip) => {
    const on = activeStyles.has(chip.dataset.style);
    chip.classList.toggle('active', on);
    chip.setAttribute('aria-pressed', String(on));
  });
}

function restoreFilterChipUI() {
  updateChipUI();
}

function rebuildDeckWithStyles() {
  // Re-filter without re-shuffling the seen cards —
  // simply rebuild from scratch for simplicity.
  buildDeck();
}

// ─── Deck ─────────────────────────────────────────────────────────────────────
function buildDeck() {
  deck = filterFoods(allFoods, currentCategory, activeStyles);
  renderDeck();
}

function renderDeck() {
  const container = qs('#card-container');
  container.innerHTML = '';

  if (deck.length === 0) {
    showScreen('screen-end');
    return;
  }

  // Render up to 3 cards stacked (back ones are visual only)
  const visible = deck.slice(0, Math.min(3, deck.length));
  visible.forEach((food, idx) => {
    const card = buildCardEl(food, idx);
    container.appendChild(card);
  });

  // Only the top card (last in DOM = visually on top) gets swipe
  attachTopCardSwipe();
}

function attachTopCardSwipe() {
  const container = qs('#card-container');
  const cards = container.querySelectorAll('.food-card');
  if (!cards.length) return;

  const top = cards[cards.length - 1];
  top.classList.add('is-top');

  attachSwipe(top, {
    onLike:   () => handleLike(top),
    onSkip:   () => handleSkip(top),
    onDetail: () => openDetail(deck[0]),
  });
}

// ─── Card Element ─────────────────────────────────────────────────────────────
function buildCardEl(food, stackIndex) {
  const card = document.createElement('div');
  card.className = 'food-card';
  card.dataset.id = food.id;

  // Stack positioning: 0 = top card, 1 = second, 2 = third
  const depth = 2 - stackIndex; // reversed because last = top
  card.style.setProperty('--stack-depth', depth);

  const liked = isLiked(food.id);

  card.innerHTML = `
    <div class="hint-like">❤️ Thích</div>
    <div class="hint-skip">✕ Bỏ qua</div>
    <div class="card-image-wrap">
      <img class="card-image" src="${food.image}" alt="${food.name}" loading="lazy" draggable="false">
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-style-badge">${food.style}</span>
        <span class="card-price">${food.price}</span>
      </div>
      <h2 class="card-name">${food.name}</h2>
      <p class="card-desc">${food.description}</p>
    </div>
    <div class="card-actions">
      <button class="btn-action btn-skip"  aria-label="Bỏ qua">✕</button>
      <button class="btn-action btn-detail" aria-label="Chi tiết">📖</button>
      <button class="btn-action btn-like ${liked ? 'liked' : ''}" aria-label="Thích">❤️</button>
    </div>
  `;

  // Button listeners (only the top card will have these attached)
  card.querySelector('.btn-skip').addEventListener('click', (e) => {
    e.stopPropagation();
    if (isAnimating) return;
    triggerSkip(card, () => handleSkip(card));
  });

  card.querySelector('.btn-like').addEventListener('click', (e) => {
    e.stopPropagation();
    if (isAnimating) return;
    triggerLike(card, () => handleLike(card));
  });

  card.querySelector('.btn-detail').addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(food);
  });

  return card;
}

// ─── Action Handlers ──────────────────────────────────────────────────────────
function handleLike(card) {
  const food = deck[0];
  if (!food) return;
  addLiked(food.id);
  addHistory(food.id);
  advance();
}

function handleSkip(card) {
  const food = deck[0];
  if (!food) return;
  addHistory(food.id);
  advance();
}

function advance() {
  isAnimating = true;
  deck.shift(); // remove the card we just acted on

  const container = qs('#card-container');

  if (deck.length === 0) {
    setTimeout(() => {
      showScreen('screen-end');
      isAnimating = false;
    }, 360);
    return;
  }

  // Remove the (now gone) top card from DOM
  setTimeout(() => {
    const cards = container.querySelectorAll('.food-card');
    if (cards.length) cards[cards.length - 1].remove();

    // If we have more cards in the deck, append the next background card
    if (deck.length >= 3) {
      const newCard = buildCardEl(deck[2], 0); // will be at bottom of stack
      container.insertBefore(newCard, container.firstChild);
    }

    // Re-stack existing cards
    restack();

    // Attach swipe to new top card
    attachTopCardSwipe();
    isAnimating = false;
  }, 380);
}

function restack() {
  const cards = Array.from(qs('#card-container').querySelectorAll('.food-card'));
  cards.forEach((c, i) => {
    const depth = i; // 0 = bottom
    c.style.setProperty('--stack-depth', depth);
    c.classList.remove('is-top');
  });
}

// ─── Food Detail – Bottom Sheet ───────────────────────────────────────────────
function openDetail(food) {
  if (!food) return;
  detailFood = food;

  const sheet = qs('#detail-sheet');

  qs('#detail-img').src           = food.image;
  qs('#detail-img').alt           = food.name;
  qs('#detail-name').textContent  = food.name;
  qs('#detail-desc').textContent  = food.description;
  qs('#detail-price').textContent = food.price;
  qs('#detail-cal').textContent   = `${food.calories} kcal`;
  qs('#detail-cat').textContent   = food.category;
  qs('#detail-style').textContent = food.style;

  // Ingredients
  const ul = qs('#detail-ingredients');
  ul.innerHTML = food.ingredients.map((i) => `<li>${i}</li>`).join('');

  // Like button state
  const likeBtn = qs('#detail-like-btn');
  likeBtn.classList.toggle('liked', isLiked(food.id));
  likeBtn.textContent = isLiked(food.id) ? '❤️ Đã thích' : '🤍 Thích';

  sheet.classList.add('open');
  qs('#detail-overlay').classList.add('visible');
  document.body.classList.add('sheet-open');
}

function closeDetail() {
  qs('#detail-sheet').classList.remove('open');
  qs('#detail-overlay').classList.remove('visible');
  document.body.classList.remove('sheet-open');
}

function bindDetailSheet() {
  qs('#detail-close').addEventListener('click', closeDetail);
  qs('#detail-overlay').addEventListener('click', closeDetail);

  // Like button inside sheet
  qs('#detail-like-btn').addEventListener('click', () => {
    if (!detailFood) return;
    const btn = qs('#detail-like-btn');
    if (isLiked(detailFood.id)) {
      removeLiked(detailFood.id);
      btn.classList.remove('liked');
      btn.textContent = '🤍 Thích';
    } else {
      addLiked(detailFood.id);
      btn.classList.add('liked');
      btn.textContent = '❤️ Đã thích';
    }
    // Sync top card like button
    const topCard = qs('.food-card.is-top');
    if (topCard && Number(topCard.dataset.id) === detailFood.id) {
      topCard.querySelector('.btn-like').classList.toggle('liked', isLiked(detailFood.id));
    }
  });

  // Drag-down-to-close
  let sheetStartY = 0;
  const sheet = qs('#detail-sheet');

  sheet.addEventListener('pointerdown', (e) => {
    sheetStartY = e.clientY;
  }, { passive: true });

  sheet.addEventListener('pointerup', (e) => {
    const dy = e.clientY - sheetStartY;
    if (dy > 80) closeDetail();
  }, { passive: true });
}

// ─── End Screen ───────────────────────────────────────────────────────────────
function bindEndButtons() {
  qs('#btn-replay').addEventListener('click', () => {
    showScreen('screen-step1');
  });

  qs('#btn-reshuffle').addEventListener('click', () => {
    buildDeck();
    showScreen('screen-swipe');
  });
}

// ─── Dark / Light Mode ────────────────────────────────────────────────────────
function bindThemeToggle() {
  qs('#theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('angi_theme', isDark ? 'dark' : 'light');
    qs('#theme-toggle').textContent = isDark ? '☀️' : '🌙';
  });
}

function applyStoredTheme() {
  const saved = localStorage.getItem('angi_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = saved ? saved === 'dark' : prefersDark;
  if (useDark) document.documentElement.classList.add('dark');
  qs('#theme-toggle').textContent = useDark ? '☀️' : '🌙';
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }
