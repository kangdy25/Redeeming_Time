import { useEffect, useState } from 'react';
import { isoDate } from '../../utils/planner';

export function useTaskCalendar(selectedDate: string, setSelectedDate: (date: string) => void) {
  const today = isoDate(new Date());
  const [miniMonth, setMiniMonth] = useState(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [weekly, setWeekly] = useState(false);

  useEffect(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!globalThis.matchMedia) return;
    const query = globalThis.matchMedia('(max-width: 760px)');
    const sync = () => setWeekly(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  function move(offset: number) {
    if (weekly) {
      const date = new Date(`${selectedDate}T00:00:00`);
      date.setDate(date.getDate() + offset * 7);
      setSelectedDate(isoDate(date));
      return;
    }
    setMiniMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday() {
    const date = new Date(`${today}T00:00:00`);
    setSelectedDate(today);
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  return { today, miniMonth, weekly, move, jumpToToday, selectDate: setSelectedDate };
}
