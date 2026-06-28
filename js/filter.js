import { filterFoods as filterFoodRecommendations } from './recommendationEngine.js';

const QUESTION_FLOW = {
  'Ăn no': [
    {
      id: 'subcategory',
      title: 'Bạn đang thèm gì?',
      options: [
        { id: 'rice', label: '🍚 Cơm' },
        { id: 'broth', label: '🍜 Món nước' },
        { id: 'noodle', label: '🍝 Mì' },
        { id: 'grilled', label: '🔥 Nướng' },
        { id: 'hotpot', label: '🍲 Lẩu' },
        { id: 'any', label: '🥘 Gì cũng được' },
      ],
    },
  ],
  'Ăn nhẹ': [
    {
      id: 'subcategory',
      title: 'Bạn muốn gì?',
      options: [
        { id: 'healthy', label: '🥗 Healthy' },
        { id: 'bread', label: '🥖 Bánh' },
        { id: 'light', label: '🍜 Nhẹ bụng' },
        { id: 'dimsum', label: '🥟 Dimsum' },
        { id: 'any', label: '🎲 Gì cũng được' },
      ],
    },
  ],
  'Ăn vặt': [
    {
      id: 'subcategory',
      title: 'Bạn thích kiểu nào?',
      options: [
        { id: 'fried', label: '🍢 Chiên' },
        { id: 'grilled', label: '🌮 Nướng' },
        { id: 'sweet', label: '🍡 Ngọt' },
        { id: 'spicy', label: '🌶 Cay' },
        { id: 'any', label: '🎲 Gì cũng được' },
      ],
    },
  ],
  'Đồ uống': [
    {
      id: 'subcategory',
      title: 'Bạn muốn uống gì?',
      options: [
        { id: 'coffee', label: '☕ Coffee' },
        { id: 'milkTea', label: '🧋 Trà sữa' },
        { id: 'refresh', label: '🥤 Giải khát' },
        { id: 'smoothie', label: '🥭 Sinh tố' },
        { id: 'juice', label: '🍹 Nước ép' },
        { id: 'any', label: '🎲 Gì cũng được' },
      ],
    },
  ],
};

export { QUESTION_FLOW };

export function getQuestionsForCategory(category) {
  return QUESTION_FLOW[category] || [];
}

export function getAnswerLabel(category, questionId, optionId) {
  const question = getQuestionsForCategory(category).find((entry) => entry.id === questionId);
  return question?.options.find((option) => option.id === optionId)?.label || '';
}

export function getAnswerSummary(category, answers = {}) {
  return getQuestionsForCategory(category)
    .map((question) => {
      const optionId = answers[question.id];
      if (!optionId || optionId === 'any') return null;

      return {
        questionId: question.id,
        optionId,
        label: getAnswerLabel(category, question.id, optionId),
      };
    })
    .filter(Boolean);
}

export function filterFoods(foods, category, answers = {}, mealPeriod, excludeIds = []) {
  return filterFoodRecommendations(foods, {
    mealPeriod,
    category,
    answers,
    excludeIds,
  });
}

export function shuffle(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}
