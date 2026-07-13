import { type Calendar } from '@redeeming-time/shared';
import { type PlannerModalModel } from '../../hooks/usePlannerModalModel';
import { WorkspaceCreateForm } from '../WorkspaceCreateForm';

type Props = {
  calendars: Calendar[];
  isLoading?: boolean;
  workspace: PlannerModalModel['workspace'];
};

export function WorkspaceSettingsPane({ calendars, isLoading, workspace }: Props) {
  return (
    <div className="tab-content active">
      <div className="settings-only-panel">
        <div>
          <span>현재 워크스페이스</span>
          <strong>{workspace.selected?.title ?? '선택된 캘린더 없음'}</strong>
        </div>
        <div>
          <span>동기화 상태</span>
          <strong>
            {isLoading ? '불러오는 중' : calendars.length === 0 ? '캘린더 필요' : '준비됨'}
          </strong>
        </div>
      </div>
      <WorkspaceCreateForm
        title={workspace.title}
        description={workspace.description}
        isSubmitting={workspace.mutation.isPending}
        onTitleChange={workspace.setTitle}
        onDescriptionChange={workspace.setDescription}
        onSubmit={workspace.submit}
      />
    </div>
  );
}
