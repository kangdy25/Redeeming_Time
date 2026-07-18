import { describe, expect, it } from 'vitest';
import { isoDate, monthCells } from './planner';

describe('planner date helpers', () => {
  it('formats local ISO dates and produces a six-week month grid', () => {
    expect(isoDate(new Date(2026, 6, 4))).toBe('2026-07-04');
    expect(monthCells(new Date(2026, 6, 1))).toHaveLength(42);
  });
});
