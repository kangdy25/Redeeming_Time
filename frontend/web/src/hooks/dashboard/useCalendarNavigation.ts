import { useRef, useState } from 'react';
import { type Event } from '@redeeming-time/shared';
import { isoDate } from '../../utils/planner';
import { type MobilePanel } from './useDashboardShell';

type Input = {
  openEventModal: () => void;
  openDailyEventsModal: () => void;
  setMobilePanel: (panel: MobilePanel) => void;
};

export function useCalendarNavigation({
  openEventModal,
  openDailyEventsModal,
  setMobilePanel,
}: Input) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<'week' | 'month'>('month');
  const [draftDate, setDraftDate] = useState(isoDate(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const dateTrigger = useRef<HTMLButtonElement | null>(null);

  function move(offset: number) {
    const next = new Date(anchor);
    if (view === 'month') next.setMonth(anchor.getMonth() + offset);
    else next.setDate(anchor.getDate() + offset * 7);
    setAnchor(next);
  }

  function openForDate(date: string, trigger?: HTMLButtonElement) {
    dateTrigger.current = trigger ?? null;
    setSelectedEvent(null);
    setDraftDate(date);
    openDailyEventsModal();
    setMobilePanel('calendar');
  }

  function openEventComposer() {
    dateTrigger.current = null;
    setSelectedEvent(null);
    openEventModal();
    setMobilePanel('calendar');
  }

  function openEvent(event: Event) {
    dateTrigger.current = null;
    setSelectedEvent(event);
    setDraftDate(event.start_time.substring(0, 10));
    openEventModal();
    setMobilePanel('calendar');
  }

  return {
    anchor,
    view,
    setView,
    previous: () => move(-1),
    next: () => move(1),
    today: () => setAnchor(new Date()),
    draftDate,
    selectedEvent,
    openForDate,
    openEventComposer,
    openEvent,
    restoreDateFocus: () => dateTrigger.current?.focus(),
  };
}
