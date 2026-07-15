import { describe, expect, test } from 'vitest';
import { type Event } from '@redeeming-time/shared';
import { CORAL_RED } from './colorPresets';
import { KOREA_HOLIDAY_COLOR, createKoreaHolidayEvents, eventStyle, sameDate } from './planner';

describe('planner color styles', () => {
  test('creates Korea holiday events with the Coral Red preset', () => {
    const [holiday] = createKoreaHolidayEvents(12);

    expect(KOREA_HOLIDAY_COLOR).toBe(CORAL_RED);
    expect(holiday.color_code).toBe(CORAL_RED);
    expect(eventStyle(holiday)).toMatchObject({
      borderColor: CORAL_RED,
      backgroundColor: CORAL_RED,
    });
  });

  test('keeps timed event text on the readable theme token', () => {
    const [holiday] = createKoreaHolidayEvents(12);
    const timedEvent = { ...holiday, id: 1, is_all_day: false, color_code: '#A3E635' };

    expect(eventStyle(timedEvent)).toMatchObject({
      borderColor: '#A3E635',
      color: 'var(--color-text-primary)',
    });
  });
});

function timedEvent(start: Date, end: Date): Event {
  return {
    id: 1,
    calendar: 1,
    creator: 1,
    title: '자정 넘김 일정',
    description: '',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    is_all_day: false,
    rrule: '',
    created_at: '',
    updated_at: '',
  };
}

describe('sameDate', () => {
  test('includes a timed event in every local day it overlaps', () => {
    const event = timedEvent(new Date(2026, 6, 4, 23, 30), new Date(2026, 6, 5, 0, 30));

    expect(sameDate(event, new Date(2026, 6, 4))).toBe(true);
    expect(sameDate(event, new Date(2026, 6, 5))).toBe(true);
  });

  test('treats the end boundary as exclusive', () => {
    const event = timedEvent(new Date(2026, 6, 4, 23, 0), new Date(2026, 6, 5));

    expect(sameDate(event, new Date(2026, 6, 5))).toBe(false);
  });
});
