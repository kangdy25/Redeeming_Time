import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, getErrorMessage } from '@redeeming-time/shared';
import { ServerWakeUpNotice } from '../components/ui/ServerWakeUpNotice';

export function EmailVerificationPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const handled = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('이메일 인증을 확인하고 있어요.');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (!token) {
      setHasError(true);
      setIsLoading(false);
      setMessage('인증 링크가 유효하지 않습니다. 새 인증 메일을 요청해 주세요.');
      return;
    }

    void apiClient
      .confirmEmailVerification(token)
      .then(() => setMessage('이메일 인증이 완료되었습니다. 이제 로그인할 수 있어요.'))
      .catch((error: unknown) => {
        setHasError(true);
        setMessage(getErrorMessage(error, '인증 링크가 유효하지 않거나 만료되었습니다.'));
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  return (
    <div className="app-container">
      <main className="auth-page-main auth-callback-page">
        <section
          className="auth-panel auth-callback-panel"
          aria-labelledby="email-verification-title"
        >
          <div className="auth-panel-heading">
            <span className="auth-welcome-icon" aria-hidden="true">
              ✦
            </span>
            <p className="eyebrow">Email verification</p>
            <h1 id="email-verification-title">이메일 인증</h1>
          </div>
          {isLoading && <ServerWakeUpNotice />}
          <p className="form-message" role={hasError ? 'alert' : 'status'}>
            {message}
          </p>
          {!isLoading && (
            <Link className="primary-button subtle auth-callback-return" to="/login">
              로그인으로 이동
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
