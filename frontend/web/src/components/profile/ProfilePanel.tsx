import { type FormEvent, useEffect, useState } from 'react';
import {
  apiClient,
  useAuthStore,
  useCreateCalendar,
  useDeleteCalendar,
  type Calendar,
  usePlannerStore,
} from '@redeeming-time/shared';
import { DEFAULT_WORKSPACE_COLOR } from '../../utils/colorPresets';

export function ProfilePanel() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof apiClient.currentUser>> | null>(null);
  const [nickname, setNickname] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const calendars = usePlannerStore((state) => state.calendars);
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const createCalendar = useCreateCalendar();
  const deleteCalendarMutation = useDeleteCalendar();
  useEffect(() => {
    void apiClient
      .currentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setNickname(currentUser?.nickname ?? '');
        setImageUrl(currentUser?.profile_image_url ?? '');
      })
      .catch(() => {});
  }, []);
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (user)
      setUser(
        await apiClient.updateUser(user.id, {
          nickname: nickname.trim(),
          profile_image_url: imageUrl.trim(),
        }),
      );
  }
  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!workspaceTitle.trim()) return;
    await createCalendar.mutateAsync({
      title: workspaceTitle.trim(),
      description: '',
      theme_color: DEFAULT_WORKSPACE_COLOR,
    });
    setWorkspaceTitle('');
  }
  async function deleteWorkspace(calendar: Calendar) {
    if (window.confirm(`"${calendar.title}" 워크스페이스를 삭제할까요?`))
      await deleteCalendarMutation.mutateAsync(calendar.id);
  }
  async function deleteAccount() {
    if (user && window.confirm('계정과 모든 데이터가 삭제됩니다. 정말 탈퇴할까요?')) {
      await apiClient.deleteUser(user.id);
      useAuthStore.getState().clearTokens();
    }
  }
  return (
    <section className="profile-page dashboard-profile-page">
      <section className="profile-card">
        <div className="profile-hero">
          <div className="profile-page-avatar">
            {imageUrl ? (
              <img src={imageUrl} alt="프로필" />
            ) : (
              (nickname || user?.email || '?').slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <p className="eyebrow">My page</p>
            <h1>{nickname || '내 프로필'}</h1>
            <p>{user?.email}</p>
          </div>
        </div>
        <div className="profile-settings-layout">
          <section className="profile-settings-column">
            <h2>프로필 설정</h2>
            <form onSubmit={saveProfile} className="profile-form">
              <label>
                이메일
                <input value={user?.email ?? ''} disabled />
              </label>
              <label>
                이름
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  required
                />
              </label>
              <label>
                프로필 사진 URL <span>(선택)</span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://example.com/profile.png"
                />
              </label>
              <button className="primary-button" type="submit">
                프로필 저장
              </button>
            </form>
          </section>
          <section className="profile-settings-column">
            <h2>워크스페이스 설정</h2>
            <div className="profile-stats">
              <div>
                <strong>{calendars.length}</strong>
                <span>워크스페이스</span>
              </div>
              <div>
                <strong>{events.length}</strong>
                <span>일정</span>
              </div>
              <div>
                <strong>{tasks.length}</strong>
                <span>할 일</span>
              </div>
            </div>
            <div className="workspace-settings-list">
              {calendars.map((calendar) => (
                <span key={calendar.id}>
                  {calendar.title}
                  {!calendar.is_global && (
                    <button
                      type="button"
                      onClick={() => void deleteWorkspace(calendar)}
                      aria-label={`${calendar.title} 삭제`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            <form onSubmit={createWorkspace} className="workspace-create-form">
              <input
                value={workspaceTitle}
                onChange={(event) => setWorkspaceTitle(event.target.value)}
                placeholder="새 워크스페이스 이름"
                maxLength={120}
              />
              <button type="submit" className="primary-button" disabled={createCalendar.isPending}>
                추가
              </button>
            </form>
          </section>
        </div>
        <footer className="profile-footer">
          <a href="#terms">이용약관</a>
          <span>|</span>
          <a href="#privacy">개인정보 처리방침</a>
          <span>|</span>
          <a href="mailto:support@redeemingtime.app">고객센터</a>
          <span>|</span>
          <button type="button" onClick={deleteAccount}>
            회원 탈퇴
          </button>
        </footer>
      </section>
    </section>
  );
}
