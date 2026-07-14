import { describe, expect, test } from 'vitest';
import { CORAL_RED } from './colorPresets';
import { KOREA_HOLIDAY_COLOR, createKoreaHolidayEvents, eventStyle } from './planner';

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
