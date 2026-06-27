const QUESTION_FLOW = {
  'Ăn no': [
    {
      id: 'mealFormat',
      title: 'Bạn thích kiểu nào?',
      options: [
        { id: 'broth', label: '🍜 Món nước' },
        { id: 'dry', label: '🍛 Món khô' },
        { id: 'grilled', label: '🔥 Món nướng' },
        { id: 'hotpot', label: '🍲 Lẩu' },
        { id: 'rice', label: '🍚 Cơm' },
        { id: 'noodle', label: '🍝 Mì' },
        { id: 'any', label: '🎲 Không quan tâm' },
      ],
    },
    {
      id: 'protein',
      title: 'Hôm nay bạn muốn…',
      options: [
        { id: 'beef', label: '🐄 Bò' },
        { id: 'chicken', label: '🐓 Gà' },
        { id: 'pork', label: '🐖 Heo' },
        { id: 'seafood', label: '🐟 Hải sản' },
        { id: 'vegetable', label: '🥬 Rau' },
        { id: 'any', label: '🎲 Gì cũng được' },
      ],
    },
  ],
  'Ăn nhẹ': [
    {
      id: 'lightStyle',
      title: 'Bạn muốn…',
      options: [
        { id: 'bread', label: '🥖 Bánh' },
        { id: 'light', label: '🍜 Nhẹ bụng' },
        { id: 'healthy', label: '🥗 Healthy' },
        { id: 'fun', label: '🥟 Ăn chơi' },
        { id: 'any', label: '🎲 Không quan tâm' },
      ],
    },
    {
      id: 'temperature',
      title: 'Nóng hay lạnh?',
      options: [
        { id: 'hot', label: '🔥 Nóng' },
        { id: 'cold', label: '❄️ Lạnh' },
        { id: 'any', label: '🎲 Không quan tâm' },
      ],
    },
  ],
  'Ăn vặt': [
    {
      id: 'snackStyle',
      title: 'Bạn thích',
      options: [
        { id: 'fried', label: '🍢 Chiên' },
        { id: 'grilled', label: '🌮 Nướng' },
        { id: 'sweet', label: '🍡 Ngọt' },
        { id: 'spicy', label: '🌶 Cay' },
        { id: 'any', label: '🎲 Gì cũng được' },
      ],
    },
    {
      id: 'portion',
      title: 'Ăn một mình hay chia sẻ?',
      options: [
        { id: 'solo', label: '👤 Một mình' },
        { id: 'share', label: '👥 Chia nhóm' },
        { id: 'any', label: '🎲 Không quan tâm' },
      ],
    },
  ],
  'Đồ uống': [
    {
      id: 'drinkType',
      title: 'Bạn muốn',
      options: [
        { id: 'coffee', label: '☕ Coffee' },
        { id: 'milkTea', label: '🧋 Trà sữa' },
        { id: 'softDrink', label: '🥤 Nước giải khát' },
        { id: 'smoothie', label: '🥭 Sinh tố' },
        { id: 'juice', label: '🍹 Nước ép' },
        { id: 'any', label: '🎲 Không quan tâm' },
      ],
    },
    {
      id: 'temperature',
      title: 'Đá',
      options: [
        { id: 'iced', label: '🧊 Có đá' },
        { id: 'hot', label: '🔥 Nóng' },
        { id: 'any', label: '🎲 Không quan tâm' },
      ],
    },
  ],
};

const textCache = new WeakMap();

const SETS = {
  lightHealthy: new Set(['Sushi', 'Sashimi', 'Gỏi Cuốn']),
  lightFun: new Set(['Tokbokki', 'Kimbap', 'Bánh Xèo', 'Bánh Cuốn']),
  lightCold: new Set(['Sushi', 'Sashimi', 'Gỏi Cuốn']),
  snackSolo: new Set([
    'Kem',
    'Flan',
    'Yaourt',
    'Chè',
    'Khoai Tây Chiên',
    'Khoai Lang Lắc',
    'Takoyaki',
    'Gà Rán',
    'Cá Viên Chiên',
    'Bò Viên Chiên',
  ]),
  snackShare: new Set([
    'Bánh Tráng Trộn',
    'Bánh Tráng Nướng',
    'Xiên Que',
    'Bắp Xào',
    'Bắp Nướng',
    'Nem Chua Rán',
    'Chả Giò',
    'Trái Cây Tô',
  ]),
  drinkIcedNames: new Set([
    'Trà Sữa',
    'Cà Phê Sữa Đá',
    'Sinh Tố Bơ',
    'Sinh Tố Xoài',
    'Nước Cam',
    'Nước Chanh',
    'Trà Đào',
    'Trà Tắc',
    'Trà Chanh',
    'Soda',
    'Mojito',
    'Nước Mía',
    'Nước Dừa',
  ]),
  drinkHotNames: new Set(['Latte', 'Cappuccino', 'Matcha Latte']),
};

const MATCHERS = {
  'Ăn no': {
    mealFormat: {
      broth: (food) => food.style === 'Món nước' || hasAny(food, ['phở', 'bún', 'hủ tiếu', 'bánh canh', 'miến', 'ramen', 'udon', 'canh']),
      dry: (food) => food.style === 'Món khô',
      grilled: (food) => hasAny(food, ['nướng', 'bbq', 'quay', 'bít tết', 'steak', 'lúc lắc', 'né']),
      hotpot: (food) => hasAny(food, ['lẩu']),
      rice: (food) => hasAny(food, ['cơm', 'bibimbap', 'curry rice']),
      noodle: (food) => hasAny(food, ['phở', 'bún', 'mì', 'miến', 'hủ tiếu', 'ramen', 'udon', 'pasta', 'nui']),
      any: () => true,
    },
    protein: {
      beef: (food) => hasAny(food, ['bò', 'steak']),
      chicken: (food) => hasAny(food, ['gà']),
      pork: (food) => hasAny(food, ['heo', 'sườn', 'ba chỉ', 'xá xíu', 'thịt kho', 'lòng', 'chả']),
      seafood: (food) => hasAny(food, ['tôm', 'cá', 'mực', 'cua', 'hải sản', 'ghẹ', 'ốc', 'sò']),
      vegetable: (food) => hasAny(food, ['rau', 'nấm', 'đậu', 'chay']),
      any: () => true,
    },
  },
  'Ăn nhẹ': {
    lightStyle: {
      bread: (food) => hasAny(food, ['bánh', 'xôi']),
      light: (food) => food.style === 'Món nước' || hasAny(food, ['cháo', 'nui', 'gỏi cuốn']),
      healthy: (food) => SETS.lightHealthy.has(food.name),
      fun: (food) => SETS.lightFun.has(food.name),
      any: () => true,
    },
    temperature: {
      hot: (food) => !SETS.lightCold.has(food.name),
      cold: (food) => SETS.lightCold.has(food.name),
      any: () => true,
    },
  },
  'Ăn vặt': {
    snackStyle: {
      fried: (food) => hasAny(food, ['chiên', 'rán', 'lắc']),
      grilled: (food) => hasAny(food, ['nướng']),
      sweet: (food) => hasAny(food, ['kem', 'flan', 'yaourt', 'chè', 'trái cây', 'đường']),
      spicy: (food) => hasAny(food, ['ớt', 'cay', 'tương ớt', 'sa tế']),
      any: () => true,
    },
    portion: {
      solo: (food) => SETS.snackSolo.has(food.name),
      share: (food) => SETS.snackShare.has(food.name),
      any: () => true,
    },
  },
  'Đồ uống': {
    drinkType: {
      coffee: (food) => hasAny(food, ['cà phê', 'latte', 'cappuccino', 'bạc xỉu']),
      milkTea: (food) => hasAny(food, ['trà sữa']),
      softDrink: (food) => hasAny(food, ['soda', 'mojito', 'nước mía', 'nước dừa', 'trà đào', 'trà tắc', 'trà chanh']),
      smoothie: (food) => hasAny(food, ['sinh tố']),
      juice: (food) => hasAny(food, ['nước cam', 'nước chanh']),
      any: () => true,
    },
    temperature: {
      iced: (food) => SETS.drinkIcedNames.has(food.name) || hasAny(food, ['đá', 'ice']),
      hot: (food) => SETS.drinkHotNames.has(food.name) || hasAny(food, ['nóng']),
      any: () => true,
    },
  },
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

export function filterFoods(foods, category, answers = {}) {
  if (!category) return [];

  const matchers = MATCHERS[category];
  if (!matchers) return [];

  const filtered = foods.filter((food) => {
    if (food.category !== category) return false;

    return Object.entries(matchers).every(([questionId, optionMatchers]) => {
      const selected = answers[questionId] || 'any';
      const matcher = optionMatchers[selected] || optionMatchers.any;
      return matcher(food);
    });
  });

  return shuffle(filtered);
}

export function shuffle(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function hasAny(food, keywords) {
  const haystack = getSearchText(food);
  return keywords.some((keyword) => haystack.includes(keyword));
}

function getSearchText(food) {
  if (!textCache.has(food)) {
    const text = [food.name, food.description, food.style, ...(food.ingredients || [])]
      .join(' ')
      .toLowerCase();
    textCache.set(food, text);
  }

  return textCache.get(food);
}
