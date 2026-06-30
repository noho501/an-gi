function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

function buildTimeLabel(start, end) {
  const endLabel = end === 24 * 60 ? '24:00' : formatTime(end);
  return `${formatTime(start)} - ${endLabel}`;
}

export const MEAL_PERIODS = [
  {
    id: 'breakfast',
    icon: '🍳',
    label: 'Bữa sáng',
    shortLabel: 'Sáng',
    start: 5 * 60,      // 05:00
    end: 11 * 60,       // 11:00
    greetingTitle: 'Chào buổi sáng',
    greetingSubtitle: 'Chọn món hợp mood chỉ với vài cú chạm.',
  },
  {
    id: 'lunch',
    icon: '☀️',
    label: 'Bữa trưa',
    shortLabel: 'Trưa',
    start: 11 * 60,     // 11:00
    end: 16 * 60,       // 16:00
    greetingTitle: 'Đến giờ ăn trưa',
    greetingSubtitle: 'Lọc nhanh món hợp ý rồi vuốt thôi.',
  },
  {
    id: 'dinner',
    icon: '🌙',
    label: 'Bữa tối',
    shortLabel: 'Tối',
    start: 16 * 60,     // 16:00
    end: 23 * 60,       // 23:00
    greetingTitle: 'Ăn tối nào',
    greetingSubtitle: 'Hôm nay mình ăn món gì cho đã đây?',
  },
  {
    id: 'late-night',
    icon: '🌃',
    label: 'Ăn khuya',
    shortLabel: 'Khuya',
    start: 23 * 60,     // 23:00
    end: 5 * 60,        // 05:00 (qua ngày hôm sau)
    greetingTitle: 'Ăn khuya nhẹ thôi',
    greetingSubtitle: 'Ưu tiên món dễ chọn, dễ ăn và đỡ ngán.',
  },
].map((period) => ({
  ...period,
  timeLabel: buildTimeLabel(period.start, period.end),
}));

const PERIOD_MAP = new Map(
  MEAL_PERIODS.map((period) => [period.id, period])
);

export function detectMealPeriod(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();

  return (
    MEAL_PERIODS.find((period) => {
      // Khoảng thời gian bình thường
      if (period.start < period.end) {
        return minutes >= period.start && minutes < period.end;
      }

      // Khoảng thời gian qua ngày (23:00 -> 05:00)
      return minutes >= period.start || minutes < period.end;
    })?.id || 'breakfast'
  );
}

export function getMealPeriod(periodId) {
  return PERIOD_MAP.get(periodId) ?? PERIOD_MAP.get('breakfast');
}

export function isValidMealPeriod(periodId) {
  return PERIOD_MAP.has(periodId);
}
