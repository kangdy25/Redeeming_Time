type Props = {
  fullScreen?: boolean;
};

export function ServerWakeUpNotice({ fullScreen = false }: Props) {
  return (
    <div
      className={`server-wake-notice${fullScreen ? ' server-wake-notice-fullscreen' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="server-wake-spinner" aria-hidden="true" />
      <div>
        <strong>서버를 연결하고 있어요</strong>
        <p>무료 서버를 깨우는 중입니다. 처음 요청은 최대 1분 정도 걸릴 수 있어요.</p>
      </div>
    </div>
  );
}
