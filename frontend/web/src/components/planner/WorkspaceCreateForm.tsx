import { type FormEvent } from 'react';

export interface WorkspaceCreateFormProps {
  title: string;
  description: string;
  isSubmitting: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function WorkspaceCreateForm({
  title,
  description,
  isSubmitting,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: WorkspaceCreateFormProps) {
  return (
    <form className="event-form" onSubmit={onSubmit}>
      <div className="event-form-grid">
        <div className="field-stack field-span-2">
          <label htmlFor="workspace-title-input">새 워크스페이스</label>
          <input
            id="workspace-title-input"
            aria-label="Workspace name"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="예: 업무"
            maxLength={120}
            required
          />
        </div>
        <div className="field-stack field-span-2">
          <label htmlFor="workspace-description-input">설명 (선택)</label>
          <textarea
            id="workspace-description-input"
            aria-label="Workspace description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={2}
          />
        </div>
      </div>
      <div className="modal-action-row">
        <button
          type="submit"
          aria-label="Create Workspace"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? '생성 중...' : '워크스페이스 만들기'}
        </button>
      </div>
    </form>
  );
}
