import { getFoods } from './foodData.js';
import { filterFoods, getAnswerSummary, getQuestionsForCategory } from './filter.js';
import { getFoodImage } from './foodVisuals.js';
import { getMealPeriod, MEAL_PERIODS, detectMealPeriod, isValidMealPeriod } from './mealPeriods.js';
import { getFoodMeta } from './recommendationEngine.js';
import { createSwipeController } from './tinder.js';
import { ReactionEngine } from './ReactionEngine.js';
import { REACTION_STATES } from './reactionData.js';
import {
  addHistory,
  clearHistory,
  clearLiked,
  clearMealPeriodPreference,
  clearRecentRecommendations,
  clearSession,
  getHistory,
  getTheme,
  setTheme,
} from './storage.js';

const state = {
  allFoods: [],
  foodsById: new Map(),
  currentScreen: 'screen-home',
  previousScreen: 'screen-home',
  currentCategory: null,
  mealPeriod: detectMealPeriod(),
  mealPeriodMenuOpen: false,
  questionIndex: 0,
  answers: {},
  filteredIds: [],
  deckCursor: 0,
  endMode: 'done',
  topController: null,
  stackCards: [],
  questionTimer: 0,
  reactionEngine: new ReactionEngine(),
};

const refs = {
  screens: qsa('.screen'),
  logos: qsa('.logo'),
  status: qs('#app-status'),
  mealPeriodSelector: qs('#meal-period-selector'),
  startButton: qs('#btn-start'),
  themeToggle: qs('#theme-toggle'),
  greetingIcon: qs('#greeting-icon'),
  greetingTitle: qs('#greeting-title'),
  greetingSubtitle: qs('#greeting-subtitle'),
  greetingMeta: qs('#greeting-meta'),
  categoryCards: qsa('.category-card'),
  categoryHint: qs('#category-hint'),
  questionBack: qs('#btn-question-back'),
  questionProgress: qs('#question-progress'),
  questionTitle: qs('#question-title'),
  questionSubtitle: qs('#question-subtitle'),
  questionOptions: qs('#question-options'),
  questionNext: qs('#btn-question-next'),
  swipeBack: qs('#btn-back'),
  swipeTitle: qs('#swipe-title'),
  swipeSubtitle: qs('#swipe-subtitle'),
  swipeSummary: qs('#swipe-filter-summary'),
  swipeCount: qs('#swipe-count'),
  swipeContainer: qs('#card-container'),
  swipeClose: qs('#btn-swipe-close'),
  historyButton: qs('#btn-history'),
  shuffleButton: qs('#btn-shuffle'),
  selectButton: qs('#btn-select-food'),
  foodBuddyEmoji: qs('#food-buddy-emoji'),
  foodBuddyMessage: qs('#food-buddy-message'),
  historyBack: qs('#btn-history-back'),
  historyViewed: qs('#history-viewed'),
  historyEmpty: qs('#history-empty'),
  endTitle: qs('#end-title'),
  endSubtitle: qs('#end-subtitle'),
  reshuffleButton: qs('#btn-reshuffle'),
  endHistoryButton: qs('#btn-end-history'),
  endFiltersButton: qs('#btn-end-filters'),
  selectedPopup: qs('#selected-popup'),
  selectedPopupFoodName: qs('#selected-popup-food-name'),
  selectedPopupFoodImage: qs('#selected-popup-food-image'),
  selectedPopupEmoji: qs('#selected-popup-emoji'),
  selectedPopupMessage: qs('#selected-popup-message'),
  closeSelectedPopupButton: qs('#btn-close-selected-popup'),
};

init();

async function init() {
  applyTheme();
  bindStaticEvents();
  state.allFoods = await getFoods();
  state.foodsById = new Map(state.allFoods.map((food) => [food.id, food]));
  createStackCards();
  startFreshSession();
}

function bindStaticEvents() {
  refs.startButton.addEventListener('click', () => showScreen('screen-step1', { focus: '.category-card' }));
  refs.themeToggle.addEventListener('click', handleThemeToggle);

  document.addEventListener('click', (event) => {
    if (!state.mealPeriodMenuOpen) return;
    if (refs.mealPeriodSelector.contains(event.target)) return;
    closeMealPeriodMenu();
  });

  refs.logos.forEach((logo) => {
    logo.addEventListener('click', (event) => {
      event.preventDefault();
      goHome();
    });
  });

  refs.categoryCards.forEach((button) => {
    button.addEventListener('click', () => selectCategory(button.dataset.category));
  });

  refs.questionBack.addEventListener('click', handleQuestionBack);
  refs.questionNext.addEventListener('click', handleQuestionNext);
  refs.swipeBack.addEventListener('click', handleSwipeBack);
  refs.swipeClose.addEventListener('click', handleSwipeClose);
  refs.historyButton.addEventListener('click', () => openHistory('screen-swipe'));
  refs.shuffleButton.addEventListener('click', handleAnotherSuggestion);
  refs.selectButton.addEventListener('click', handleSelectFood);
  refs.historyBack.addEventListener('click', closeHistory);
  refs.reshuffleButton.addEventListener('click', handleAnotherSuggestion);
  refs.endHistoryButton.addEventListener('click', () => openHistory('screen-end'));
  refs.endFiltersButton.addEventListener('click', () => showScreen('screen-step1', { focus: '.category-card' }));
  refs.closeSelectedPopupButton.addEventListener('click', () => closeSelectedPopup({ goHomeAfterClose: true }));

  refs.selectedPopup.addEventListener('click', (event) => {
    if (event.target.classList.contains('selected-popup__backdrop')) {
      closeSelectedPopup({ goHomeAfterClose: true });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSelectedPopupOpen()) {
      closeSelectedPopup({ goHomeAfterClose: true });
    }
  });
}

function startFreshSession() {
  clearSession();
  clearRecentRecommendations();
  clearMealPeriodPreference();
  clearHistory();
  clearLiked();

  state.currentCategory = null;
  state.mealPeriod = detectMealPeriod();
  state.mealPeriodMenuOpen = false;
  state.questionIndex = 0;
  state.answers = {};
  state.filteredIds = [];
  state.deckCursor = 0;
  state.endMode = 'done';
  closeSelectedPopup();

  renderMealPeriodSelector();
  renderGreeting();
  markSelectedCategory();
  setBuddyReaction(REACTION_STATES.WELCOME);
  showScreen('screen-home', { focus: '#btn-start' });
}

function renderMealPeriodSelector() {
  const activePeriod = getMealPeriod(state.mealPeriod);
  refs.mealPeriodSelector.classList.toggle('open', state.mealPeriodMenuOpen);
  refs.mealPeriodSelector.innerHTML = `
    <button
      type="button"
      class="meal-period-menu-toggle"
      aria-haspopup="menu"
      aria-expanded="${String(state.mealPeriodMenuOpen)}"
      aria-label="Chọn khung giờ ăn: ${activePeriod.label}"
    >
      <span class="meal-period-menu-toggle__icon" aria-hidden="true">${activePeriod.icon}</span>
      <span class="meal-period-menu-toggle__caret" aria-hidden="true">▾</span>
    </button>
    <div class="meal-period-menu" role="menu" aria-label="Khung giờ ăn">
      ${MEAL_PERIODS.map((period) => {
        const active = period.id === state.mealPeriod;
        return `
          <button
            type="button"
            class="meal-period-menu-item${active ? ' active' : ''}"
            role="menuitemradio"
            aria-checked="${String(active)}"
            data-meal-period="${period.id}"
          >
            <span class="meal-period-menu-item__icon" aria-hidden="true">${period.icon}</span>
            <span class="meal-period-menu-item__label">${period.label}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  refs.mealPeriodSelector.querySelector('.meal-period-menu-toggle')?.addEventListener('click', handleMealPeriodToggle);

  refs.mealPeriodSelector.querySelectorAll('[data-meal-period]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      changeMealPeriod(button.dataset.mealPeriod);
    });
  });
}

function handleMealPeriodToggle(event) {
  event.stopPropagation();
  state.mealPeriodMenuOpen = !state.mealPeriodMenuOpen;
  renderMealPeriodSelector();
}

function closeMealPeriodMenu() {
  if (!state.mealPeriodMenuOpen) return;
  state.mealPeriodMenuOpen = false;
  renderMealPeriodSelector();
}

function changeMealPeriod(periodId) {
  if (!isValidMealPeriod(periodId) || periodId === state.mealPeriod) return;

  state.mealPeriod = periodId;
  state.mealPeriodMenuOpen = false;
  renderMealPeriodSelector();
  renderGreeting();
  markSelectedCategory();

  if (!state.currentCategory) {
    persistSession();
    announce(`Đã chuyển sang ${getMealPeriod(periodId).label.toLowerCase()}`);
    return;
  }

  if (state.currentScreen === 'screen-questions' && !state.answers.subcategory) {
    showQuestions(0);
    return;
  }

  rebuildDeck(true);
  announce(`Đã làm mới gợi ý cho ${getMealPeriod(periodId).label.toLowerCase()}`);
}

function renderGreeting() {
  const mealPeriod = getMealPeriod(state.mealPeriod);
  const welcomeReaction = state.reactionEngine.pick(REACTION_STATES.WELCOME);
  refs.greetingIcon.textContent = mealPeriod.icon;
  refs.greetingTitle.textContent = mealPeriod.greetingTitle;
  refs.greetingSubtitle.textContent = welcomeReaction.message || mealPeriod.greetingSubtitle;
  refs.greetingMeta.textContent = `${mealPeriod.label} · ${mealPeriod.timeLabel}`;
}

function selectCategory(category) {
  state.currentCategory = category;
  state.answers = {};
  state.filteredIds = [];
  state.deckCursor = 0;
  state.questionIndex = 0;
  state.endMode = 'done';
  markSelectedCategory();
  announce(`Đã chọn ${category}`);
  showQuestions(0);
}

function showQuestions(index) {
  if (!state.currentCategory) {
    showScreen('screen-step1', { focus: '.category-card' });
    return;
  }

  const questions = getQuestionsForCategory(state.currentCategory);
  if (!questions.length) {
    rebuildDeck(true);
    return;
  }

  window.clearTimeout(state.questionTimer);
  state.questionIndex = clamp(index, 0, questions.length - 1);

  const question = questions[state.questionIndex];
  const selected = state.answers[question.id];
  const mealPeriod = getMealPeriod(state.mealPeriod);
  refs.questionProgress.textContent = `Câu ${state.questionIndex + 1}/${questions.length}`;
  refs.questionTitle.textContent = question.title;
  refs.questionSubtitle.textContent = `${mealPeriod.icon} ${mealPeriod.label} · ${state.currentCategory}`;
  refs.questionOptions.innerHTML = question.options
    .map((option) => {
      const active = option.id === selected;
      return `
        <button
          type="button"
          class="question-option${active ? ' active' : ''}"
          data-option-id="${option.id}"
          aria-pressed="${String(active)}"
        >
          ${option.label}
        </button>
      `;
    })
    .join('');

  refs.questionNext.disabled = !selected;
  refs.questionNext.textContent = 'Xem món';

  refs.questionOptions.querySelectorAll('.question-option').forEach((button) => {
    button.addEventListener('click', () => {
      state.answers[question.id] = button.dataset.optionId;
      persistSession('screen-questions');
      showQuestions(state.questionIndex);
      state.questionTimer = window.setTimeout(() => {
        handleQuestionNext();
      }, 130);
    });
  });

  showScreen('screen-questions', { focus: '.question-option' });
}

function handleQuestionNext() {
  window.clearTimeout(state.questionTimer);
  const questions = getQuestionsForCategory(state.currentCategory);
  const question = questions[state.questionIndex];

  if (!question || !state.answers[question.id]) return;
  rebuildDeck(true);
}

function handleQuestionBack() {
  window.clearTimeout(state.questionTimer);
  showScreen('screen-step1', { focus: '.category-card' });
}

function handleSwipeBack() {
  window.clearTimeout(state.questionTimer);
  showQuestions(0);
}

function handleSwipeClose() {
  window.clearTimeout(state.questionTimer);
  destroyTopController();

  const previousScreen = state.previousScreen || 'screen-step1';

  if (previousScreen === 'screen-history') {
    closeHistory();
    return;
  }

  if (previousScreen === 'screen-questions') {
    showScreen('screen-questions', { focus: '.question-option' });
    return;
  }

  if (previousScreen === 'screen-step1') {
    showScreen('screen-step1', { focus: '.category-card' });
    return;
  }

  if (previousScreen === 'screen-end') {
    showEnd(state.endMode);
    return;
  }

  if (state.currentCategory) {
    showQuestions(0);
  } else {
    showScreen('screen-step1', { focus: '.category-card' });
  }
}

function rebuildDeck(resetCursor) {
  const foods = filterFoods(state.allFoods, state.currentCategory, state.answers, state.mealPeriod);
  state.filteredIds = foods.map((food) => food.id);
  state.deckCursor = resetCursor ? 0 : clamp(state.deckCursor, 0, state.filteredIds.length);
  state.endMode = state.filteredIds.length ? 'done' : 'empty';

  if (!state.filteredIds.length) {
    setBuddyReaction(REACTION_STATES.EMPTY);
    showEnd('empty');
    return;
  }

  renderSwipeScreen({
    reactionState: REACTION_STATES.SEARCH_COMPLETED,
    reactionParams: { count: state.filteredIds.length },
  });
}

function reshuffleCurrentDeck() {
  if (!state.currentCategory) return;
  rebuildDeck(true);
}

function handleAnotherSuggestion() {
  if (state.currentScreen === 'screen-end') {
    if (state.endMode === 'empty') {
      showScreen('screen-step1', { focus: '.category-card' });
      return;
    }

    reshuffleCurrentDeck();
    return;
  }

  if (!state.currentCategory || !state.filteredIds.length) return;
  if (state.deckCursor >= state.filteredIds.length) {
    showEnd('done');
    return;
  }

  advanceDeck('left');
}

function renderSwipeScreen(options = {}) {
  state.endMode = 'done';
  renderSwipeHeader();
  renderSwipeSummary();
  renderStack(options);
  const fromScreen = state.currentScreen === 'screen-swipe' ? state.previousScreen : state.currentScreen;
  state.previousScreen = fromScreen || 'screen-step1';
  showScreen('screen-swipe', { focus: '.food-card.is-top' });
}

function renderSwipeHeader() {
  const remaining = Math.max(state.filteredIds.length - state.deckCursor, 0);
  const mealPeriod = getMealPeriod(state.mealPeriod);
  refs.swipeTitle.textContent = `${mealPeriod.icon} ${state.currentCategory || 'Chọn món'}`;
  refs.swipeSubtitle.textContent = remaining
    ? `${remaining} món hợp ${mealPeriod.label.toLowerCase()}`
    : 'Đang chuẩn bị món cho bạn';
  refs.swipeCount.textContent = state.filteredIds.length ? `${Math.min(state.deckCursor + 1, state.filteredIds.length)}/${state.filteredIds.length}` : '0/0';
}

function renderSwipeSummary() {
  const mealPeriod = getMealPeriod(state.mealPeriod);
  const summary = getAnswerSummary(state.currentCategory, state.answers);
  const chips = [
    `<span class="summary-chip summary-chip--category">${state.currentCategory}</span>`,
    `<span class="summary-chip summary-chip--period">${mealPeriod.icon} ${mealPeriod.shortLabel}</span>`,
    ...summary.map((item) => `<span class="summary-chip">${item.label}</span>`),
  ];
  refs.swipeSummary.innerHTML = chips.join('');
}

function createStackCards() {
  refs.swipeContainer.innerHTML = '';
  state.stackCards = [];

  for (let index = 0; index < 3; index += 1) {
    const card = document.createElement('article');
    card.className = 'food-card';
    card.hidden = true;
    card.innerHTML = `
      <div class="card-body">
        <div class="card-meta">
          <span class="card-category-badge"></span>
          <span class="card-price"></span>
        </div>
        <h2 class="card-name"></h2>
        <p class="card-desc"></p>
        <div class="card-tags"></div>
      </div>
    `;

    card.addEventListener('keydown', (event) => {
      if (!card.classList.contains('is-top')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        state.topController?.swipe('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        state.topController?.swipe('right');
      }
    });

    refs.swipeContainer.appendChild(card);
    state.stackCards.push(card);
  }
}

function renderStack({ reactionState = '', reactionParams = {} } = {}) {
  destroyTopController();

  const foods = getVisibleFoods();

  state.stackCards.forEach((card, index) => {
    const food = foods[index];

    if (!food) {
      card.hidden = true;
      card.classList.remove('is-top', 'is-loading');
      card.dataset.foodId = '';
      card.setAttribute('aria-hidden', 'true');
      card.tabIndex = -1;
      return;
    }

    hydrateCard(card, food, index);
    card.hidden = false;
    card.classList.toggle('is-top', index === 0);
    card.setAttribute('aria-hidden', String(index !== 0));
    card.tabIndex = index === 0 ? 0 : -1;
    resetCardPosition(card);
  });

  const topCard = state.stackCards.find((card) => !card.hidden);
  if (!topCard) {
    showEnd(state.filteredIds.length ? 'done' : 'empty');
    return;
  }

  state.topController = createSwipeController(topCard, {
    onLike: () => advanceDeck('right'),
    onSkip: () => advanceDeck('left'),
  });

  renderSwipeHeader();
  if (reactionState) {
    setBuddyReaction(reactionState, reactionParams);
  } else {
    renderBuddyByRemaining();
  }
  persistSession('screen-swipe');
}

function hydrateCard(card, food, stackIndex) {
  const meta = getFoodMeta(food);
  const tagMarkup = meta.mealTags
    .slice(0, 3)
    .map((periodId) => `<span class="card-tag">${getMealPeriod(periodId).shortLabel}</span>`)
    .join('');
  const topicTags = [...meta.tags].slice(0, 3).map((tag) => `#${tag}`).join(' · ');

  card.dataset.foodId = String(food.id);
  card.style.setProperty('--stack-index', String(stackIndex));
  card.querySelector('.card-category-badge').textContent = `${food.category} · ${food.style}`;
  card.querySelector('.card-price').textContent = topicTags || '#recommended';
  card.querySelector('.card-name').textContent = food.name;
  card.querySelector('.card-desc').textContent = meta.mealTagLabels.join(' · ');
  card.querySelector('.card-tags').innerHTML = tagMarkup || `<span class="card-tag">${getMealPeriod(state.mealPeriod).shortLabel}</span>`;
  card.setAttribute('aria-label', `${food.name}. ${food.category}. ${meta.mealTagLabels.join(', ')}`);
}

function advanceDeck(direction) {
  const currentFoodId = state.filteredIds[state.deckCursor];
  if (!currentFoodId) return;

  addHistory(currentFoodId);

  state.deckCursor += 1;
  rotateStackCards();

  if (state.deckCursor >= state.filteredIds.length) {
    destroyTopController();
    showEnd('done');
    return;
  }

  renderStack();
  renderHistoryLists();
}

function rotateStackCards() {
  const recycled = state.stackCards.shift();
  if (!recycled) return;
  recycled.hidden = true;
  recycled.classList.remove('is-top');
  resetCardPosition(recycled);
  state.stackCards.push(recycled);
}

function showEnd(mode) {
  state.endMode = mode;
  const mealPeriod = getMealPeriod(state.mealPeriod);
  setBuddyReaction(REACTION_STATES.EMPTY);

  if (mode === 'empty') {
    refs.endTitle.textContent = `Chưa có món hợp ${mealPeriod.shortLabel.toLowerCase()}`;
    refs.endSubtitle.innerHTML = 'Đổi khung giờ, chỉnh câu trả lời hoặc chọn danh mục khác để ra món sát hơn.';
    refs.reshuffleButton.textContent = 'Đổi danh mục';
  } else {
    refs.endTitle.textContent = 'Hết món rồi!';
    refs.endSubtitle.innerHTML = `Bạn đã vuốt hết danh sách hợp ${mealPeriod.label.toLowerCase()}.<br>Món khác hoặc đổi bộ lọc để chọn tiếp.`;
    refs.reshuffleButton.textContent = 'Món khác';
  }

  renderHistoryLists();
  showScreen('screen-end', { focus: '#btn-reshuffle' });
  persistSession('screen-end');
}

function handleEndShuffle() {
  if (state.endMode === 'empty') {
    showScreen('screen-step1', { focus: '.category-card' });
    return;
  }

  reshuffleCurrentDeck();
}

function openHistory(fromScreen) {
  state.previousScreen = fromScreen;
  renderHistoryLists();
  showScreen('screen-history', { focus: '.history-card' });
  persistSession('screen-history');
}

function closeHistory() {
  if (state.previousScreen === 'screen-end') {
    showEnd(state.endMode);
    return;
  }

  renderSwipeScreen();
}

function renderHistoryLists() {
  const historyFoods = getHistory()
    .map((id) => state.foodsById.get(id))
    .filter(Boolean);

  refs.historyViewed.innerHTML = historyFoods.length ? historyFoods.map(renderHistoryCard).join('') : '';
  refs.historyEmpty.hidden = Boolean(historyFoods.length);
}

function renderHistoryCard(food) {
  const meta = getFoodMeta(food);
  const topicTags = [...meta.tags].slice(0, 3).map((tag) => `#${tag}`).join(' · ');
  return `
    <article class="history-card" data-food-id="${food.id}">
      <img class="history-card__img" src="${getFoodImage(food)}" alt="${food.name}">
      <div class="history-card__content">
        <div class="history-card__meta">
          <span class="history-card__badge">${food.category}</span>
          <span class="history-card__price">${topicTags || '#recommended'}</span>
        </div>
        <h3>${food.name}</h3>
        <p>${meta.mealTagLabels.join(' · ')}</p>
        <div class="history-card__tags">${meta.mealTags.map((periodId) => `<span class="history-tag">${getMealPeriod(periodId).shortLabel}</span>`).join('')}</div>
      </div>
    </article>
  `;
}

function handleThemeToggle() {
  const dark = document.documentElement.classList.toggle('dark');
  setTheme(dark ? 'dark' : 'light');
  refs.themeToggle.textContent = dark ? '☀️' : '🌙';
}

function applyTheme() {
  const saved = getTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.toggle('dark', dark);
  refs.themeToggle.textContent = dark ? '☀️' : '🌙';
}

function markSelectedCategory() {
  const mealPeriod = getMealPeriod(state.mealPeriod);

  refs.categoryCards.forEach((button) => {
    const active = button.dataset.category === state.currentCategory;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  refs.categoryHint.textContent = state.currentCategory
    ? `${mealPeriod.icon} ${mealPeriod.label} · Đang chọn ${state.currentCategory}.`
    : `${mealPeriod.icon} ${mealPeriod.label} · Chọn một danh mục để bắt đầu.`;
}

function persistSession(screen = state.currentScreen) {
  return screen;
}

function showScreen(id, { focus } = {}) {
  state.currentScreen = id;
  refs.screens.forEach((screen) => {
    const active = screen.id === id;
    screen.classList.toggle('active', active);
    screen.setAttribute('aria-hidden', String(!active));
  });

  persistSession(id);

  if (focus) {
    window.requestAnimationFrame(() => {
      const target = qs(focus);
      target?.focus();
    });
  }
}

function goHome() {
  window.clearTimeout(state.questionTimer);
  destroyTopController();
  state.currentCategory = null;
  state.questionIndex = 0;
  state.answers = {};
  state.filteredIds = [];
  state.deckCursor = 0;
  state.previousScreen = 'screen-home';
  state.endMode = 'done';
  closeSelectedPopup();
  setBuddyReaction(REACTION_STATES.WELCOME);
  markSelectedCategory();
  clearSession();
  showScreen('screen-home', { focus: '#btn-start' });
}

function handleSelectFood() {
  const currentFood = getCurrentFood();
  if (!currentFood) return;

  const reaction = setBuddyReaction(REACTION_STATES.SELECTED);
  refs.selectedPopupFoodName.textContent = currentFood.name;
  refs.selectedPopupFoodImage.src = getFoodImage(currentFood);
  refs.selectedPopupFoodImage.alt = `Ảnh món ${currentFood.name}`;
  refs.selectedPopupEmoji.textContent = reaction.emoji;
  refs.selectedPopupMessage.textContent = reaction.message || 'Chúc bạn ăn ngon miệng 😋';
  refs.selectedPopup.classList.add('open');
  refs.selectedPopup.setAttribute('aria-hidden', 'false');
}

function closeSelectedPopup({ goHomeAfterClose = false } = {}) {
  refs.selectedPopup.classList.remove('open');
  refs.selectedPopup.setAttribute('aria-hidden', 'true');

  if (goHomeAfterClose) {
    goHome();
  }
}

function isSelectedPopupOpen() {
  return refs.selectedPopup.classList.contains('open');
}

function getCurrentFood() {
  const currentFoodId = state.filteredIds[state.deckCursor];
  if (!currentFoodId) return null;
  return state.foodsById.get(currentFoodId) || null;
}

function renderBuddyByRemaining() {
  const remaining = Math.max(state.filteredIds.length - state.deckCursor, 0);
  const reactionState = state.reactionEngine.resolveRemainingState(remaining);
  setBuddyReaction(reactionState);
}

function setBuddyReaction(reactionState, params = {}) {
  const reaction = state.reactionEngine.pick(reactionState, params);
  refs.foodBuddyEmoji.textContent = reaction.emoji;
  refs.foodBuddyMessage.textContent = reaction.message;
  return reaction;
}

function destroyTopController() {
  state.topController?.destroy();
  state.topController = null;
}

function getVisibleFoods() {
  return state.filteredIds
    .slice(state.deckCursor, state.deckCursor + 3)
    .map((id) => state.foodsById.get(id))
    .filter(Boolean);
}

function resetCardPosition(card) {
  card.style.transition = '';
  card.style.opacity = '1';
  card.style.setProperty('--drag-x', '0px');
  card.style.setProperty('--drag-y', '0px');
  card.style.setProperty('--drag-rotate', '0deg');
  card.style.setProperty('--drag-scale', '1');
  card.style.setProperty('--like-opacity', '0');
  card.style.setProperty('--skip-opacity', '0');
}

function announce(message) {
  refs.status.textContent = message;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}
