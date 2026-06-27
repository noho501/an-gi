import { getFoods } from './foodData.js';
import { filterFoods, getAnswerSummary, getQuestionsForCategory } from './filter.js';
import { getFoodImage, preloadFoodImages } from './foodVisuals.js';
import { createSwipeController } from './tinder.js';
import {
  addHistory,
  clearSession,
  getHistory,
  getLiked,
  getSession,
  getTheme,
  isLiked,
  setSession,
  setTheme,
  toggleLiked,
} from './storage.js';

const state = {
  allFoods: [],
  foodsById: new Map(),
  currentScreen: 'screen-home',
  previousScreen: 'screen-home',
  currentCategory: null,
  questionIndex: 0,
  answers: {},
  filteredIds: [],
  deckCursor: 0,
  endMode: 'done',
  detailFoodId: null,
  topController: null,
  stackCards: [],
  questionTimer: 0,
};

const refs = {
  screens: qsa('.screen'),
  logos: qsa('.logo'),
  status: qs('#app-status'),
  startButton: qs('#btn-start'),
  themeToggle: qs('#theme-toggle'),
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
  historyButton: qs('#btn-history'),
  restartButton: qs('#btn-restart'),
  shuffleButton: qs('#btn-shuffle'),
  historyBack: qs('#btn-history-back'),
  historyLiked: qs('#history-liked'),
  historyViewed: qs('#history-viewed'),
  historyEmpty: qs('#history-empty'),
  endTitle: qs('#end-title'),
  endSubtitle: qs('#end-subtitle'),
  replayButton: qs('#btn-replay'),
  reshuffleButton: qs('#btn-reshuffle'),
  endHistoryButton: qs('#btn-end-history'),
  endFiltersButton: qs('#btn-end-filters'),
  detailSheet: qs('#detail-sheet'),
  detailOverlay: qs('#detail-overlay'),
  detailClose: qs('#detail-close'),
  detailImage: qs('#detail-img'),
  detailName: qs('#detail-name'),
  detailDesc: qs('#detail-desc'),
  detailPrice: qs('#detail-price'),
  detailCal: qs('#detail-cal'),
  detailCat: qs('#detail-cat'),
  detailStyle: qs('#detail-style'),
  detailIngredients: qs('#detail-ingredients'),
  detailLike: qs('#detail-like-btn'),
};

init();

async function init() {
  applyTheme();
  bindStaticEvents();
  state.allFoods = await getFoods();
  state.foodsById = new Map(state.allFoods.map((food) => [food.id, food]));
  createStackCards();
  renderGreeting();
  restoreSession();
}

function bindStaticEvents() {
  refs.startButton.addEventListener('click', () => showScreen('screen-step1', { focus: '.category-card' }));
  refs.themeToggle.addEventListener('click', handleThemeToggle);

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
  refs.historyButton.addEventListener('click', () => openHistory('screen-swipe'));
  refs.restartButton.addEventListener('click', () => showQuestions(0));
  refs.shuffleButton.addEventListener('click', reshuffleCurrentDeck);
  refs.historyBack.addEventListener('click', closeHistory);
  refs.replayButton.addEventListener('click', () => showQuestions(0));
  refs.reshuffleButton.addEventListener('click', handleEndShuffle);
  refs.endHistoryButton.addEventListener('click', () => openHistory('screen-end'));
  refs.endFiltersButton.addEventListener('click', () => showScreen('screen-step1', { focus: '.category-card' }));

  refs.historyLiked.addEventListener('click', handleHistoryAction);
  refs.historyViewed.addEventListener('click', handleHistoryAction);
  refs.historyLiked.addEventListener('keydown', handleHistoryKeydown);
  refs.historyViewed.addEventListener('keydown', handleHistoryKeydown);

  refs.detailOverlay.addEventListener('click', closeDetail);
  refs.detailClose.addEventListener('click', closeDetail);
  refs.detailLike.addEventListener('click', () => {
    if (!state.detailFoodId) return;
    setLikedState(state.detailFoodId);
  });

  bindDetailSwipeToClose();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && refs.detailSheet.classList.contains('open')) {
      closeDetail();
    }
  });
}

function restoreSession() {
  const session = getSession();

  if (!session) {
    showScreen('screen-home', { focus: '#btn-start' });
    return;
  }

  state.currentCategory = session.category || null;
  state.questionIndex = Number.isInteger(session.questionIndex) ? session.questionIndex : 0;
  state.answers = session.answers || {};
  state.filteredIds = sanitizeIds(session.filteredIds);
  state.deckCursor = clamp(session.deckCursor || 0, 0, state.filteredIds.length);
  state.endMode = session.endMode || 'done';

  markSelectedCategory();

  if (!state.currentCategory) {
    showScreen('screen-home', { focus: '#btn-start' });
    return;
  }

  if (!state.filteredIds.length) {
    rebuildDeck(false);
  }

  switch (session.screen) {
    case 'screen-step1':
      showScreen('screen-step1', { focus: '.category-card' });
      break;
    case 'screen-questions':
      showQuestions(state.questionIndex);
      break;
    case 'screen-history':
      if (state.filteredIds.length && state.deckCursor < state.filteredIds.length) {
        renderSwipeScreen();
        openHistory('screen-swipe');
      } else {
        showEnd(state.endMode);
        openHistory('screen-end');
      }
      break;
    case 'screen-end':
      showEnd(state.endMode);
      break;
    case 'screen-swipe':
    default:
      if (state.filteredIds.length && state.deckCursor < state.filteredIds.length) {
        renderSwipeScreen();
      } else {
        showEnd(state.filteredIds.length ? 'done' : 'empty');
      }
      break;
  }
}

function renderGreeting() {
  const hour = new Date().getHours();
  let icon = '🌃';
  let title = 'Đói bụng rồi?';
  let subtitle = 'Cùng tìm món hợp gu thật nhanh.';

  if (hour >= 5 && hour < 11) {
    icon = '🍳';
    title = 'Chào buổi sáng';
    subtitle = 'Chọn món hợp mood chỉ với vài cú chạm.';
  } else if (hour >= 11 && hour < 14) {
    icon = '☀️';
    title = 'Đến giờ ăn trưa';
    subtitle = 'Lọc nhanh món hợp ý rồi vuốt thôi.';
  } else if (hour >= 17 && hour < 21) {
    icon = '🌙';
    title = 'Ăn tối nào';
    subtitle = 'Hôm nay mình ăn món gì cho đã đây?';
  }

  qs('#greeting-icon').textContent = icon;
  qs('#greeting-title').textContent = title;
  qs('#greeting-subtitle').textContent = subtitle;
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
  refs.questionProgress.textContent = `Câu ${state.questionIndex + 1}/${questions.length}`;
  refs.questionTitle.textContent = question.title;
  refs.questionSubtitle.textContent = `${state.currentCategory} · Trả lời nhanh để lọc chuẩn hơn`;
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
  refs.questionNext.textContent = state.questionIndex === questions.length - 1 ? 'Xem món' : 'Tiếp tục';

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

  if (state.questionIndex >= questions.length - 1) {
    rebuildDeck(true);
    return;
  }

  showQuestions(state.questionIndex + 1);
}

function handleQuestionBack() {
  window.clearTimeout(state.questionTimer);

  if (state.questionIndex > 0) {
    showQuestions(state.questionIndex - 1);
    return;
  }

  showScreen('screen-step1', { focus: '.category-card' });
}

function handleSwipeBack() {
  window.clearTimeout(state.questionTimer);
  const questions = getQuestionsForCategory(state.currentCategory);

  if (questions.length) {
    showQuestions(questions.length - 1);
    return;
  }

  showScreen('screen-step1', { focus: '.category-card' });
}

function rebuildDeck(resetCursor) {
  const foods = filterFoods(state.allFoods, state.currentCategory, state.answers);
  state.filteredIds = foods.map((food) => food.id);
  state.deckCursor = resetCursor ? 0 : clamp(state.deckCursor, 0, state.filteredIds.length);
  state.endMode = state.filteredIds.length ? 'done' : 'empty';

  if (!state.filteredIds.length) {
    showEnd('empty');
    return;
  }

  renderSwipeScreen();
}

function reshuffleCurrentDeck() {
  if (!state.currentCategory) return;
  rebuildDeck(true);
}

function renderSwipeScreen() {
  state.endMode = 'done';
  renderSwipeHeader();
  renderSwipeSummary();
  renderStack();
  showScreen('screen-swipe', { focus: '.food-card.is-top' });
}

function renderSwipeHeader() {
  const remaining = Math.max(state.filteredIds.length - state.deckCursor, 0);
  refs.swipeTitle.textContent = state.currentCategory || 'Chọn món';
  refs.swipeSubtitle.textContent = remaining ? `${remaining} món đang hợp bộ lọc` : 'Đang chuẩn bị món cho bạn';
  refs.swipeCount.textContent = state.filteredIds.length ? `${Math.min(state.deckCursor + 1, state.filteredIds.length)}/${state.filteredIds.length}` : '0/0';
}

function renderSwipeSummary() {
  const summary = getAnswerSummary(state.currentCategory, state.answers);
  const chips = [
    `<span class="summary-chip summary-chip--category">${state.currentCategory}</span>`,
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
      <div class="hint-like">❤️ Thích</div>
      <div class="hint-skip">✕ Bỏ qua</div>
      <div class="card-image-wrap">
        <img class="card-image" alt="" draggable="false" loading="eager">
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-style-badge"></span>
          <span class="card-price"></span>
        </div>
        <h2 class="card-name"></h2>
        <p class="card-desc"></p>
      </div>
      <div class="card-actions" role="group" aria-label="Hành động với món ăn">
        <button type="button" class="btn-action btn-skip" aria-label="Bỏ qua">✕</button>
        <button type="button" class="btn-action btn-detail" aria-label="Xem chi tiết">📖</button>
        <button type="button" class="btn-action btn-like" aria-label="Thích">❤️</button>
      </div>
    `;

    card.querySelector('.btn-skip').addEventListener('click', (event) => {
      event.stopPropagation();
      if (!card.classList.contains('is-top')) return;
      state.topController?.swipe('left');
    });

    card.querySelector('.btn-like').addEventListener('click', (event) => {
      event.stopPropagation();
      if (!card.classList.contains('is-top')) return;
      state.topController?.swipe('right');
    });

    card.querySelector('.btn-detail').addEventListener('click', (event) => {
      event.stopPropagation();
      if (!card.dataset.foodId) return;
      openDetail(Number(card.dataset.foodId));
    });

    card.addEventListener('keydown', (event) => {
      if (!card.classList.contains('is-top')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        state.topController?.swipe('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        state.topController?.swipe('right');
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (card.dataset.foodId) openDetail(Number(card.dataset.foodId));
      }
    });

    refs.swipeContainer.appendChild(card);
    state.stackCards.push(card);
  }
}

function renderStack() {
  destroyTopController();

  const foods = getVisibleFoods();

  state.stackCards.forEach((card, index) => {
    const food = foods[index];

    if (!food) {
      card.hidden = true;
      card.classList.remove('is-top');
      card.dataset.foodId = '';
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

  const topFoodId = Number(topCard.dataset.foodId);
  state.topController = createSwipeController(topCard, {
    onLike: () => advanceDeck('right'),
    onSkip: () => advanceDeck('left'),
    onDetail: () => openDetail(topFoodId),
  });

  preloadFoodImages([
    ...foods.slice(1),
    state.foodsById.get(state.filteredIds[state.deckCursor + 3]),
  ]);
  renderSwipeHeader();
  persistSession('screen-swipe');
}

function hydrateCard(card, food, stackIndex) {
  card.dataset.foodId = String(food.id);
  card.style.setProperty('--stack-index', String(stackIndex));
  card.querySelector('.card-image').src = getFoodImage(food);
  card.querySelector('.card-image').alt = food.name;
  card.querySelector('.card-style-badge').textContent = food.style;
  card.querySelector('.card-price').textContent = food.price;
  card.querySelector('.card-name').textContent = food.name;
  card.querySelector('.card-desc').textContent = food.description;
  card.querySelector('.btn-like').classList.toggle('liked', isLiked(food.id));
}

function advanceDeck(direction) {
  const currentFoodId = state.filteredIds[state.deckCursor];
  if (!currentFoodId) return;

  if (direction === 'right') {
    addHistory(currentFoodId);
    setLikedState(currentFoodId, true);
  } else {
    addHistory(currentFoodId);
  }

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

  if (mode === 'empty') {
    refs.endTitle.textContent = 'Chưa có món phù hợp';
    refs.endSubtitle.innerHTML = 'Hãy đổi câu trả lời hoặc chọn danh mục khác để xem thêm món khớp hơn.';
    refs.replayButton.textContent = 'Chỉnh lại câu trả lời';
    refs.reshuffleButton.textContent = 'Đổi danh mục';
  } else {
    refs.endTitle.textContent = 'Hết món rồi!';
    refs.endSubtitle.innerHTML = 'Bạn đã vuốt hết danh sách phù hợp.<br>Xáo lại hoặc chỉnh bộ lọc để chọn tiếp.';
    refs.replayButton.textContent = 'Làm lại bộ lọc';
    refs.reshuffleButton.textContent = 'Xáo lại';
  }

  renderHistoryLists();
  showScreen('screen-end', { focus: '#btn-replay' });
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
  const likedFoods = getLiked()
    .map((id) => state.foodsById.get(id))
    .filter(Boolean);
  const historyFoods = getHistory()
    .map((id) => state.foodsById.get(id))
    .filter(Boolean);

  refs.historyLiked.innerHTML = likedFoods.length ? likedFoods.map(renderHistoryCard).join('') : '';
  refs.historyViewed.innerHTML = historyFoods.length ? historyFoods.map(renderHistoryCard).join('') : '';
  refs.historyEmpty.hidden = Boolean(likedFoods.length || historyFoods.length);
}

function renderHistoryCard(food) {
  return `
    <article class="history-card" tabindex="0" data-food-id="${food.id}">
      <img class="history-card__img" src="${getFoodImage(food)}" alt="${food.name}">
      <div class="history-card__content">
        <div class="history-card__meta">
          <span class="history-card__badge">${food.style}</span>
          <span class="history-card__price">${food.price}</span>
        </div>
        <h3>${food.name}</h3>
        <p>${food.description}</p>
      </div>
      <div class="history-card__actions">
        <button type="button" class="history-btn" data-action="detail" data-food-id="${food.id}">Chi tiết</button>
        <button type="button" class="history-btn history-btn--like${isLiked(food.id) ? ' liked' : ''}" data-action="like" data-food-id="${food.id}">
          ${isLiked(food.id) ? 'Đã thích' : 'Thích'}
        </button>
      </div>
    </article>
  `;
}

function handleHistoryAction(event) {
  const actionButton = event.target.closest('[data-action]');
  const card = event.target.closest('.history-card');
  const foodId = Number(actionButton?.dataset.foodId || card?.dataset.foodId);
  if (!foodId) return;

  if (actionButton?.dataset.action === 'like') {
    setLikedState(foodId);
    return;
  }

  openDetail(foodId);
}

function handleHistoryKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('.history-card');
  if (!card) return;
  event.preventDefault();
  openDetail(Number(card.dataset.foodId));
}

function openDetail(foodId) {
  const food = state.foodsById.get(foodId);
  if (!food) return;

  state.detailFoodId = foodId;
  refs.detailImage.src = getFoodImage(food);
  refs.detailImage.alt = food.name;
  refs.detailName.textContent = food.name;
  refs.detailDesc.textContent = food.description;
  refs.detailPrice.textContent = food.price;
  refs.detailCal.textContent = `${food.calories} kcal`;
  refs.detailCat.textContent = food.category;
  refs.detailStyle.textContent = food.style;
  refs.detailIngredients.innerHTML = food.ingredients.map((item) => `<li>${item}</li>`).join('');
  syncDetailLikeButton(foodId);
  refs.detailSheet.classList.add('open');
  refs.detailOverlay.classList.add('visible');
  refs.detailOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-open');
}

function closeDetail() {
  state.detailFoodId = null;
  refs.detailSheet.classList.remove('open');
  refs.detailOverlay.classList.remove('visible');
  refs.detailOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-open');
}

function bindDetailSwipeToClose() {
  let startY = 0;
  let currentY = 0;
  let dragging = false;

  refs.detailSheet.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.sheet-handle, .sheet-header')) return;
    dragging = true;
    startY = event.clientY;
    currentY = 0;
    refs.detailSheet.setPointerCapture(event.pointerId);
    refs.detailSheet.classList.add('is-dragging');
    refs.detailSheet.style.transition = 'none';
  });

  refs.detailSheet.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    currentY = Math.max(event.clientY - startY, 0);
    refs.detailSheet.style.transform = `translateX(-50%) translateY(${currentY}px)`;
  });

  const finishSheetDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    refs.detailSheet.classList.remove('is-dragging');
    if (refs.detailSheet.hasPointerCapture(event.pointerId)) {
      refs.detailSheet.releasePointerCapture(event.pointerId);
    }

    refs.detailSheet.style.transition = '';
    refs.detailSheet.style.transform = '';

    if (currentY > 90) {
      closeDetail();
    }
  };

  refs.detailSheet.addEventListener('pointerup', finishSheetDrag);
  refs.detailSheet.addEventListener('pointercancel', finishSheetDrag);
}

function setLikedState(foodId, forceLike) {
  if (!foodId) return;

  if (typeof forceLike === 'boolean') {
    const alreadyLiked = isLiked(foodId);
    if (forceLike && !alreadyLiked) {
      toggleLiked(foodId);
    } else if (!forceLike && alreadyLiked) {
      toggleLiked(foodId);
    }
  } else {
    toggleLiked(foodId);
  }

  syncLikeUi(foodId);
}

function syncLikeUi(foodId) {
  state.stackCards.forEach((card) => {
    if (Number(card.dataset.foodId) !== foodId) return;
    card.querySelector('.btn-like').classList.toggle('liked', isLiked(foodId));
  });
  syncDetailLikeButton(foodId);
  renderHistoryLists();
}

function syncDetailLikeButton(foodId) {
  if (state.detailFoodId !== foodId) return;
  const liked = isLiked(foodId);
  refs.detailLike.classList.toggle('liked', liked);
  refs.detailLike.textContent = liked ? '❤️ Đã thích' : '🤍 Thích';
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
  refs.categoryCards.forEach((button) => {
    const active = button.dataset.category === state.currentCategory;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  refs.categoryHint.textContent = state.currentCategory
    ? `Đang chọn ${state.currentCategory}.`
    : 'Chọn một danh mục để bắt đầu.';
}

function persistSession(screen = state.currentScreen) {
  setSession({
    screen,
    category: state.currentCategory,
    questionIndex: state.questionIndex,
    answers: state.answers,
    filteredIds: state.filteredIds,
    deckCursor: state.deckCursor,
    endMode: state.endMode,
  });
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
  closeDetail();
  destroyTopController();
  state.currentCategory = null;
  state.questionIndex = 0;
  state.answers = {};
  state.filteredIds = [];
  state.deckCursor = 0;
  state.previousScreen = 'screen-home';
  state.endMode = 'done';
  markSelectedCategory();
  clearSession();
  showScreen('screen-home', { focus: '#btn-start' });
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

function sanitizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id) => state.foodsById.has(id));
}

function resetCardPosition(card) {
  card.style.transition = '';
  card.style.setProperty('--drag-x', '0px');
  card.style.setProperty('--drag-y', '0px');
  card.style.setProperty('--drag-rotate', '0deg');
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
