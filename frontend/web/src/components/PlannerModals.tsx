import { type Calendar, type Event } from '@redeeming-time/shared';
import { usePlannerModalModel } from '../hooks/usePlannerModalModel';
import { EventEditorForm } from './planner/EventEditorForm';
import { WorkspaceSettingsPane } from './planner/WorkspaceSettingsPane';

export type PlannerModalKind = 'settings' | 'event';

type Props = {
  calendars: Calendar[];
  isLoading?: boolean;
  modalKind: PlannerModalKind;
  eventDraftDate?: string;
  selectedEvent?: Event | null;
  onClose: () => void;
};

export function PlannerModals({
  calendars,
  isLoading,
  modalKind,
  eventDraftDate,
  selectedEvent,
  onClose,
}: Props) {
  const { workspace, event, copy } = usePlannerModalModel({
    calendars,
    isLoading,
    modalKind,
    eventDraftDate,
    selectedEvent,
    onClose,
  });
  const message = modalKind === 'settings' ? workspace.message : event.message;

  return (
    <section className="planner-panel controls-panel">
      <div className="control-header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{modalKind === 'event' && selectedEvent ? '일정 상세' : copy.title}</h2>
        </div>
        <button
          className="icon-btn close-btn"
          onClick={onClose}
          style={{ fontSize: '18px' }}
          aria-label={copy.closeLabel}
        >
          ✕
        </button>
      </div>
      <div className="control-grid">
        <div className={modalKind === 'settings' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <WorkspaceSettingsPane
            calendars={calendars}
            isLoading={isLoading}
            workspace={workspace}
          />
        </div>
        <div className={modalKind === 'event' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <EventEditorForm event={event} />
        </div>
      </div>
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
