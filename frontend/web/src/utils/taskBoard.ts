export const taskPriorities = ['HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;
export const taskWeekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function taskBoardDateLabel(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T00:00:00`));
}

export function taskBoardTitleLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일(${weekday}) TODO`;
}
