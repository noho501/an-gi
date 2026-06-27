const CATEGORY_VISUALS = {
  'Ăn no': { emoji: '🍜', start: '#ff8a65', end: '#ff7043' },
  'Ăn nhẹ': { emoji: '🥪', start: '#4fc3f7', end: '#26a69a' },
  'Ăn vặt': { emoji: '🍟', start: '#f6d365', end: '#fda085' },
  'Đồ uống': { emoji: '🥤', start: '#9575cd', end: '#5c6bc0' },
};

const imageCache = new Map();

export function getFoodImage(food) {
  if (!food) return '';

  if (!imageCache.has(food.id)) {
    imageCache.set(food.id, createIllustration(food));
  }

  return imageCache.get(food.id);
}

export function preloadFoodImages(foods) {
  foods.filter(Boolean).forEach((food) => {
    const image = new Image();
    image.src = getFoodImage(food);
  });
}

function createIllustration(food) {
  const visual = CATEGORY_VISUALS[food.category] || CATEGORY_VISUALS['Ăn no'];
  const lines = wrapText(food.name, 16, 2);
  const style = escapeHtml(food.style);
  const category = escapeHtml(food.category);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-label="${escapeHtml(food.name)}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${visual.start}" />
          <stop offset="100%" stop-color="${visual.end}" />
        </linearGradient>
      </defs>
      <rect width="600" height="900" rx="48" fill="url(#bg)" />
      <circle cx="495" cy="116" r="82" fill="rgba(255,255,255,0.14)" />
      <circle cx="116" cy="170" r="54" fill="rgba(255,255,255,0.12)" />
      <text x="66" y="176" font-size="100">${visual.emoji}</text>
      <text x="66" y="584" font-size="72" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">${escapeHtml(lines[0] || food.name)}</text>
      ${lines[1] ? `<text x="66" y="666" font-size="72" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">${escapeHtml(lines[1])}</text>` : ''}
      <rect x="66" y="720" width="210" height="58" rx="29" fill="rgba(255,255,255,0.2)" />
      <text x="94" y="758" font-size="28" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${style}</text>
      <text x="66" y="826" font-size="30" fill="rgba(255,255,255,0.88)" font-family="system-ui, sans-serif">${category}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function wrapText(text, maxLength, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }

    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
