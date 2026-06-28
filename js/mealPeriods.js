export const MEAL_PERIODS = [
  {
    id: 'breakfast',
    icon: '🍳',
    label: 'Bữa sáng',
    shortLabel: 'Sáng',
    timeLabel: '05:00 - 10:30',
    greetingTitle: 'Chào buổi sáng',
    greetingSubtitle: 'Chọn món hợp mood chỉ với vài cú chạm.',
  },
  {
    id: 'lunch',
    icon: '☀️',
    label: 'Bữa trưa',
    shortLabel: 'Trưa',
    timeLabel: '10:30 - 15:00',
    greetingTitle: 'Đến giờ ăn trưa',
    greetingSubtitle: 'Lọc nhanh món hợp ý rồi vuốt thôi.',
  },
  {
    id: 'dinner',
    icon: '🌙',
    label: 'Bữa tối',
    shortLabel: 'Tối',
    timeLabel: '15:00 - 22:00',
    greetingTitle: 'Ăn tối nào',
    greetingSubtitle: 'Hôm nay mình ăn món gì cho đã đây?',
  },
  {
    id: 'late-night',
    icon: '🌃',
    label: 'Khuya',
    shortLabel: 'Khuya',
    timeLabel: '22:00 - 05:00',
    greetingTitle: 'Ăn khuya nhẹ thôi',
    greetingSubtitle: 'Ưu tiên món dễ chọn, dễ ăn và đỡ ngán.',
  },
];

const PERIOD_MAP = new Map(MEAL_PERIODS.map((period) => [period.id, period]));

export function detectMealPeriod(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 300 && minutes < 630) return 'breakfast';
  if (minutes >= 630 && minutes < 900) return 'lunch';
  if (minutes >= 900 && minutes < 1320) return 'dinner';
  return 'late-night';
}

export function getMealPeriod(periodId) {
  return PERIOD_MAP.get(periodId) || PERIOD_MAP.get('breakfast');
}

export function isValidMealPeriod(periodId) {
  return PERIOD_MAP.has(periodId);
}
