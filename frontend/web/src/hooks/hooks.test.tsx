import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { type Category, type Task } from '@redeeming-time/shared';
import { useCalendarNavigation } from './dashboard/useCalendarNavigation';
import { useEventEditorForm } from './planner/useEventEditorForm';
import { useTaskBoardData } from './useTaskBoardData';

afterEach(() => vi.useRealTimers());

describe('planner domain hooks', () => {
  test('calendar navigation moves by month and opens a selected date', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-13T12:00:00Z'));
    const openEventModal = vi.fn();
    const setMobilePanel = vi.fn();
    const { result } = renderHook(() => useCalendarNavigation({ openEventModal, setMobilePanel }));

    act(() => result.current.next());
    expect(result.current.anchor.getMonth()).toBe(7);

    act(() => result.current.openForDate('2026-08-20'));
    expect(result.current.draftDate).toBe('2026-08-20');
    expect(openEventModal).toHaveBeenCalledOnce();
    expect(setMobilePanel).toHaveBeenCalledWith('calendar');
  });

  test('task board data groups selected tasks and calculates completion', () => {
    const category: Category = {
      id: 10,
      calendar: 1,
      name: '집중',
      color_code: '#123456',
      created_at: '',
    };
    const tasks: Task[] = [
      {
        id: 1,
        calendar: 1,
        category: 10,
        creator: 1,
        title: '완료',
        is_completed: true,
        target_date: '2026-07-13',
        priority: 'HIGH',
        order: 0,
        created_at: '',
        updated_at: '',
      },
      {
        id: 2,
        calendar: 1,
        category: 10,
        creator: 1,
        title: '진행',
        is_completed: false,
        target_date: '2026-07-13',
        priority: 'MEDIUM',
        order: 1,
        created_at: '',
        updated_at: '',
      },
    ];
    const { result } = renderHook(() =>
      useTaskBoardData({
        tasks,
        categories: [category],
        selectedDate: '2026-07-13',
        miniMonth: new Date(2026, 6, 1),
        weekly: false,
      }),
    );

    expect(result.current.selectedTasks).toHaveLength(2);
    expect(result.current.selectedOpenTasks).toHaveLength(1);
    expect(result.current.completionRate).toBe(50);
    expect(result.current.categorySections[0].tasks).toHaveLength(2);
    expect(result.current.miniCells).toHaveLength(42);
  });

  test('event editor form resets from a draft date and toggles all-day state', () => {
    const { result } = renderHook(() => useEventEditorForm('2026-07-20', null));
    expect(result.current.start).toBe('2026-07-20T09:00');
    expect(result.current.end).toBe('2026-07-20T10:00');

    act(() => result.current.setAllDay(true));
    expect(result.current.allDay).toBe(true);

    act(() => result.current.setAllDay(false));
    expect(result.current.start).toBe('2026-07-20T09:00');
    expect(result.current.end).toBe('2026-07-20T10:00');
  });
});
