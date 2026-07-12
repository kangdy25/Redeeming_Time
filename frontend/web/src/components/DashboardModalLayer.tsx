import { type useDashboardModel } from '../hooks/useDashboardModel';
import { PlannerModals } from './PlannerModals';

type DashboardModel = ReturnType<typeof useDashboardModel>;

export function DashboardModalLayer({ model }: { model: DashboardModel }) {
  const { activeModal, setActiveModal, calendars, snapshot, eventDraftDate, selectedEvent } = model;
  return (
    <div
      className={`modal-overlay ${activeModal ? 'visible' : 'hidden'}`}
      onClick={() => setActiveModal(null)}
    >
      <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
        <PlannerModals
          calendars={calendars}
          isLoading={snapshot.isLoading}
          modalKind={activeModal ?? 'settings'}
          eventDraftDate={eventDraftDate}
          selectedEvent={selectedEvent}
          onClose={() => setActiveModal(null)}
        />
      </div>
    </div>
  );
}
