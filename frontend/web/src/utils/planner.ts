import type { Event } from '@redeeming-time/shared';

export const KOREA_HOLIDAY_COLOR = '#EF4444';

const KOREA_LEGAL_HOLIDAYS_2026 = [
  { date: '2026-01-01', title: '신정' },
  { date: '2026-02-16', title: '설날 연휴' },
  { date: '2026-02-17', title: '설날' },
  { date: '2026-02-18', title: '설날 연휴' },
  { date: '2026-03-01', title: '삼일절' },
  { date: '2026-03-02', title: '삼일절 대체공휴일' },
  { date: '2026-05-01', title: '노동절' },
  { date: '2026-05-05', title: '어린이날' },
  { date: '2026-05-24', title: '부처님오신날' },
  { date: '2026-05-25', title: '부처님오신날 대체공휴일' },
  { date: '2026-06-03', title: '제9회 전국동시지방선거' },
  { date: '2026-06-06', title: '현충일' },
  { date: '2026-08-15', title: '광복절' },
  { date: '2026-08-17', title: '광복절 대체공휴일' },
  { date: '2026-09-24', title: '추석 연휴' },
  { date: '2026-09-25', title: '추석' },
  { date: '2026-09-26', title: '추석 연휴' },
  { date: '2026-10-03', title: '개천절' },
  { date: '2026-10-05', title: '개천절 대체공휴일' },
  { date: '2026-10-09', title: '한글날' },
  { date: '2026-12-25', title: '성탄절' },
];

export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localInputValue(date: Date, hour: number) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return `${isoDate(next)}T${String(next.getHours()).padStart(2, '0')}:00`;
}

export const toApiDateTime = (value: string) => new Date(value).toISOString();

export function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  return `${isoDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from(
    { length: 42 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

export const sameDate = (event: Event, date: Date) =>
  isoDate(new Date(event.start_time)) === isoDate(date);
export const isKoreaHolidayEvent = (event: Event) => event.id <= -260000;

export function createKoreaHolidayEvents(calendarId: number): Event[] {
  if (!calendarId) return [];
  return KOREA_LEGAL_HOLIDAYS_2026.map((holiday, index) => ({
    id: -260000 - index,
    calendar: calendarId,
    creator: null,
    title: holiday.title,
    description: '대한민국 법정공휴일',
    start_time: `${holiday.date}T00:00:00.000Z`,
    end_time: `${holiday.date}T23:59:59.000Z`,
    is_all_day: true,
    rrule: '',
    color_code: KOREA_HOLIDAY_COLOR,
    created_at: `${holiday.date}T00:00:00.000Z`,
    updated_at: `${holiday.date}T00:00:00.000Z`,
  }));
}

export function eventStyle(event: Event) {
  const color = isKoreaHolidayEvent(event) ? KOREA_HOLIDAY_COLOR : event.color_code || '#1F9D8A';
  const rgb = color.replace('#', '');
  const brightness =
    Number.parseInt(rgb.slice(0, 2), 16) * 0.299 +
    Number.parseInt(rgb.slice(2, 4), 16) * 0.587 +
    Number.parseInt(rgb.slice(4, 6), 16) * 0.114;
  return {
    borderColor: color,
    backgroundColor: event.is_all_day ? color : `${color}22`,
    color: event.is_all_day ? (brightness > 160 ? '#111827' : '#FFFFFF') : color,
  };
}
