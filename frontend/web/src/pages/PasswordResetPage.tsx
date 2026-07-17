import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, getErrorMessage } from '@redeeming-time/shared';

export function PasswordResetPage() {
  const [params] = useSearchParams();
  const uid = params.get('uid') ?? '';
  const token = params.get('token') ?? '';
  const isConfirmation = Boolean(uid || token);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    if (isConfirmation && password !== passwordConfirmation) {
      setMessage('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isConfirmation) {
        await apiClient.confirmPasswordReset(uid, token, password);
        setMessage('새 비밀번호가 설정되었습니다. 이제 로그인할 수 있어요.');
      } else {
        await apiClient.requestPasswordReset(email);
        setMessage(
          '계정이 있다면 비밀번호 재설정 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.',
        );
      }
      setIsComplete(true);
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          isConfirmation
            ? '재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해 주세요.'
            : '재설정 메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = isConfirmation ? '새 비밀번호 설정' : '비밀번호 재설정';

  return (
    <div className="app-container">
      <header className="top-nav">
        <Link className="top-nav-left brand-logo" to="/login">
          <div className="logo-icon">
            <img src="/logo.png" alt="" />
          </div>
          <span>Redeeming Time</span>
        </Link>
        <div className="top-nav-right">
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <main className="auth-page-main">
        <section className="auth-story">
          <span className="auth-story-kicker">Account recovery</span>
          <h1 className="auth-story-main">
            다시,
            <br />
            당신의 시간으로
          </h1>
          <p>안전한 일회성 링크로 계정을 다시 사용할 수 있게 도와드릴게요.</p>
        </section>
        <div className="auth-panel-wrap">
          <section className="auth-panel" aria-labelledby="password-reset-title">
            <div className="auth-panel-heading">
              <span className="auth-welcome-icon" aria-hidden="true">
                ✦
              </span>
              <p className="eyebrow">Secure recovery</p>
              <h1 id="password-reset-title">{title}</h1>
            </div>
            {!isComplete && (
              <form className="auth-form" onSubmit={submit}>
                {isConfirmation ? (
                  <>
                    <label className="auth-field">
                      <span>새 비밀번호</span>
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <label className="auth-field">
                      <span>새 비밀번호 확인</span>
                      <input
                        value={passwordConfirmation}
                        onChange={(event) => setPasswordConfirmation(event.target.value)}
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <label className="auth-field">
                    <span>가입한 이메일</span>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                )}
                <button
                  className="primary-button auth-submit-button"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? '처리 중...'
                    : isConfirmation
                      ? '새 비밀번호 저장'
                      : '재설정 링크 보내기'}
                </button>
              </form>
            )}
            {message && (
              <p className="form-message" role={isComplete ? 'status' : 'alert'}>
                {message}
              </p>
            )}
            <Link className="auth-forgot-password auth-return-link" to="/login">
              로그인으로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
