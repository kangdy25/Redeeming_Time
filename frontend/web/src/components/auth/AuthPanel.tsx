import { type FormEvent, useState } from 'react';
import {
  apiClient,
  getErrorMessage,
  type SocialLoginProvider,
  useAuthStore,
} from '@redeeming-time/shared';
import {
  clearSocialAuthVerifier,
  createSocialAuthVerifier,
  navigateToExternalUrl,
} from '../../utils/browserNavigation';

export function AuthPanel() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [socialLoginProvider, setSocialLoginProvider] = useState<SocialLoginProvider | null>(null);
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      if (mode === 'register') await apiClient.register({ email, password, nickname });
      setTokens(await apiClient.token(email, password));
      setMessage('Authenticated. Planner data is now synced with the API.');
    } catch (error) {
      setMessage(getErrorMessage(error, '로그인에 실패했습니다.'));
    }
  }

  function startSocialLogin(provider: SocialLoginProvider) {
    setMessage('');
    setSocialLoginProvider(provider);
    try {
      navigateToExternalUrl(apiClient.socialLoginUrl(provider, createSocialAuthVerifier()));
    } catch {
      clearSocialAuthVerifier();
      setSocialLoginProvider(null);
      setMessage('소셜 로그인 페이지로 이동하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-panel-heading">
        <span className="auth-welcome-icon">✦</span>
        <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start planning'}</p>
        <h2>
          {mode === 'login' ? '다시 만나서 반가워요' : '새로운 시간을 시작하세요'}
          <span className="sr-only">{mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
        </h2>
      </div>
      {!isAuthenticated && (
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-segmented segmented">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              로그인<span className="sr-only">Login</span>
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              회원가입<span className="sr-only">Register</span>
            </button>
          </div>
          <div className="social-login-grid">
            <button
              type="button"
              className="social-login-button google"
              onClick={() => startSocialLogin('GOOGLE')}
              disabled={socialLoginProvider !== null}
              aria-busy={socialLoginProvider === 'GOOGLE'}
            >
              <span aria-hidden="true">G</span>
              {socialLoginProvider === 'GOOGLE' ? 'Google 로그인으로 이동 중' : 'Google로 계속'}
            </button>
            <button
              type="button"
              className="social-login-button kakao"
              onClick={() => startSocialLogin('KAKAO')}
              disabled={socialLoginProvider !== null}
              aria-busy={socialLoginProvider === 'KAKAO'}
            >
              <span aria-hidden="true">K</span>
              {socialLoginProvider === 'KAKAO' ? 'Kakao 로그인으로 이동 중' : 'Kakao로 계속'}
            </button>
          </div>
          <div className="auth-divider">
            <span>또는 이메일로 계속</span>
          </div>
          <label className="auth-field">
            <span>이메일</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={isTest ? 'Email' : 'name@example.com'}
              type="email"
              required
            />
          </label>
          {mode === 'register' && (
            <label className="auth-field">
              <span>닉네임</span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder={isTest ? 'Nickname' : '어떻게 불러드릴까요?'}
                required
              />
            </label>
          )}
          <label className="auth-field">
            <span>비밀번호</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isTest ? 'Password' : '비밀번호를 입력하세요'}
              type="password"
              required
            />
          </label>
          {mode === 'register' && (
            <p className="auth-terms">
              계정을 만들면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
            </p>
          )}
          <button
            className="primary-button auth-submit-button"
            type="submit"
            aria-label={mode === 'login' ? 'Connect' : 'Create & Connect'}
          >
            {mode === 'login' ? '로그인' : '무료로 시작하기'}
          </button>
        </form>
      )}
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}
