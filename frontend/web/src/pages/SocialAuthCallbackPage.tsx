import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiClient, useAuthStore } from '@redeeming-time/shared';
import { clearSocialAuthVerifier, getSocialAuthVerifier } from '../utils/browserNavigation';

const socialAuthErrorMessages: Record<string, string> = {
  ACCESS_DENIED: '소셜 로그인이 취소되었습니다.',
  LOGIN_CANCELLED: '소셜 로그인이 취소되었습니다.',
  OAUTH_CANCELLED: '소셜 로그인이 취소되었습니다.',
  INVALID_REQUEST: '로그인 요청을 처리할 수 없습니다. 다시 시도해 주세요.',
  INVALID_STATE: '로그인 요청이 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.',
  STATE_MISMATCH: '로그인 요청이 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.',
  EXPIRED_STATE: '로그인 요청이 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.',
  INVALID_CODE: '로그인 코드가 유효하지 않습니다. 다시 시도해 주세요.',
  EXPIRED_CODE: '로그인 코드가 만료되었습니다. 다시 로그인해 주세요.',
  CODE_EXPIRED: '로그인 코드가 만료되었습니다. 다시 로그인해 주세요.',
  SOCIAL_AUTH_CODE_INVALID: '로그인 코드가 유효하지 않습니다. 다시 시도해 주세요.',
  SOCIAL_AUTH_CODE_EXPIRED: '로그인 코드가 만료되었습니다. 다시 로그인해 주세요.',
  INVALID_SOCIAL_HANDOFF_CODE: '로그인 코드가 유효하지 않거나 만료되었습니다. 다시 로그인해 주세요.',
  PROVIDER_UNAVAILABLE: '소셜 로그인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  EMAIL_NOT_VERIFIED: '인증된 이메일 계정으로 다시 로그인해 주세요.',
  ACCOUNT_CONFLICT: '이 이메일은 다른 로그인 방식으로 이미 사용 중입니다.',
  ACCOUNT_DISABLED: '이 계정은 현재 사용할 수 없습니다. 도움이 필요하면 문의해 주세요.',
  INACTIVE_SOCIAL_ACCOUNT: '이 계정은 현재 사용할 수 없습니다. 도움이 필요하면 문의해 주세요.',
  OAUTH_FAILED: '소셜 로그인에 실패했습니다. 다시 시도해 주세요.',
  RATE_LIMITED: '로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  NETWORK_ERROR: '소셜 로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  MISSING_CODE: '로그인 정보를 찾을 수 없습니다. 다시 시도해 주세요.',
  MISSING_VERIFIER: '이 브라우저에서 시작한 로그인 요청을 찾을 수 없습니다. 다시 시도해 주세요.',
};

const fallbackSocialAuthErrorMessage = '소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.';

export function getSocialAuthErrorMessage(code: string | null | undefined) {
  const normalizedCode = code?.trim().toUpperCase();
  return normalizedCode
    ? (socialAuthErrorMessages[normalizedCode] ?? fallbackSocialAuthErrorMessage)
    : fallbackSocialAuthErrorMessage;
}

function removeCallbackQuery() {
  const url = new URL(window.location.href);
  window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.hash}`);
}

export function SocialAuthCallbackPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);
  const handled = useRef(false);
  const [message, setMessage] = useState('소셜 로그인 정보를 확인하고 있어요.');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    removeCallbackQuery();

    if (error) {
      clearSocialAuthVerifier();
      setHasError(true);
      setMessage(getSocialAuthErrorMessage(error));
      return;
    }

    if (!code) {
      clearSocialAuthVerifier();
      setHasError(true);
      setMessage(getSocialAuthErrorMessage('MISSING_CODE'));
      return;
    }

    const verifier = getSocialAuthVerifier();
    if (!verifier) {
      setHasError(true);
      setMessage(getSocialAuthErrorMessage('MISSING_VERIFIER'));
      return;
    }

    void apiClient
      .exchangeSocialCode(code, verifier)
      .then((tokens) => {
        clearSocialAuthVerifier();
        setTokens(tokens);
        navigate('/dashboard', { replace: true });
      })
      .catch((requestError: unknown) => {
        clearSocialAuthVerifier();
        setHasError(true);
        setMessage(
          getSocialAuthErrorMessage(requestError instanceof ApiError ? requestError.code : null),
        );
      });
  }, [navigate, setTokens]);

  return (
    <div className="app-container">
      <main className="auth-page-main auth-callback-page">
        <section
          className="auth-panel auth-callback-panel"
          aria-labelledby="social-auth-callback-title"
        >
          <div className="auth-panel-heading">
            <span className="auth-welcome-icon" aria-hidden="true">
              ✦
            </span>
            <p className="eyebrow">Secure sign in</p>
            <h1 id="social-auth-callback-title">로그인 정보를 확인하고 있어요</h1>
          </div>
          <p className="form-message" role={hasError ? 'alert' : 'status'}>
            {message}
          </p>
          {hasError && (
            <button
              className="primary-button subtle auth-callback-return"
              onClick={() => navigate('/login', { replace: true })}
            >
              로그인으로 돌아가기
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
