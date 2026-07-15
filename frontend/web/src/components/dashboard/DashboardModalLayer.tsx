import { type DashboardModel } from '../../hooks/useDashboardModel';
import { isoDate, sameDate } from '../../utils/planner';
import { DailyEventListModal } from '../calendar/DailyEventListModal';
import { PlannerModals } from '../planner/PlannerModals';

type DashboardModalLayerProps = Pick<DashboardModel, 'shell' | 'calendar' | 'workspace'>;

export function DashboardModalLayer({ shell, calendar, workspace }: DashboardModalLayerProps) {
  const { value: activeModal, set: setActiveModal } = shell.modal;
  const { calendars, snapshot, calendarEvents } = workspace;
  const {
    draftDate: eventDraftDate,
    selectedEvent,
    openEvent,
    openEventComposer,
    restoreDateFocus,
  } = calendar;
  const selectedDate = eventDraftDate ?? isoDate(new Date());
  const dayEvents = calendarEvents.filter((event) =>
    sameDate(event, new Date(`${selectedDate}T00:00:00`)),
  );
  const isDailyEventsModal = activeModal === 'daily-events';

  function closeModal() {
    if (isDailyEventsModal) restoreDateFocus();
    setActiveModal(null);
  }

  return (
    <div className={`modal-overlay ${activeModal ? 'visible' : 'hidden'}`} onClick={closeModal}>
      <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
        {isDailyEventsModal ? (
          <DailyEventListModal
            date={selectedDate}
            events={dayEvents}
            onAdd={openEventComposer}
            onClose={closeModal}
            onEventSelect={openEvent}
          />
        ) : (
          <PlannerModals
            calendars={calendars}
            isLoading={snapshot.isLoading}
            modalKind={activeModal ?? 'settings'}
            eventDraftDate={eventDraftDate}
            selectedEvent={selectedEvent}
            onClose={closeModal}
          />
        )}
      </div>
    </div>
  );
}
