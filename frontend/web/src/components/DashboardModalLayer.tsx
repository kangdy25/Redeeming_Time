import { type DashboardModel } from '../hooks/useDashboardModel';
import { PlannerModals } from './PlannerModals';

type DashboardModalLayerProps = Pick<
  DashboardModel,
  'activeModal' | 'setActiveModal' | 'calendars' | 'snapshot' | 'eventDraftDate' | 'selectedEvent'
>;

export function DashboardModalLayer(props: DashboardModalLayerProps) {
  const { activeModal, setActiveModal, calendars, snapshot, eventDraftDate, selectedEvent } = props;
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
