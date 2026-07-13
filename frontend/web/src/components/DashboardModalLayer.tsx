import { type DashboardModel } from '../hooks/useDashboardModel';
import { PlannerModals } from './PlannerModals';

type DashboardModalLayerProps = Pick<DashboardModel, 'shell' | 'calendar' | 'workspace'>;

export function DashboardModalLayer({ shell, calendar, workspace }: DashboardModalLayerProps) {
  const { value: activeModal, set: setActiveModal } = shell.modal;
  const { calendars, snapshot } = workspace;
  const { draftDate: eventDraftDate, selectedEvent } = calendar;
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
