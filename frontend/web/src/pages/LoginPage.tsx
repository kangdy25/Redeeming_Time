import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@redeeming-time/shared';
import { AuthPanel } from '../components/AuthPanel';

export function LoginPage() {
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-container">
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="brand-logo">
            <div className="logo-icon">
              <img src="/logo.png" alt="" />
            </div>
            <span>Redeeming Time</span>
          </div>
        </div>
        <div className="top-nav-right">
          <div className="status-strip">
            <span>
              로그인이 필요합니다
              <span className="sr-only">Sign in required</span>
            </span>
          </div>
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
          <span className="auth-story-kicker">Redeem your time</span>
          <h1 className="auth-story-main">
            흩어진 시간을
            <br />
            하나의 흐름으로
          </h1>
          <p>
            일정과 할일, 떠오른 아이디어까지.
            <br />
            중요한 하루를 놓치지 않도록 함께 정리합니다.
          </p>
          <div className="auth-feature-list">
            <span>
              <b>01</b> 하루의 일정과 할일을 한눈에
            </span>
            <span>
              <b>02</b> 놓친 할일을 자연스럽게 이어가기
            </span>
            <span>
              <b>03</b> 생각을 붙잡는 마크다운 아이디어함
            </span>
          </div>
          <div className="auth-orbit auth-orbit-one"></div>
          <div className="auth-orbit auth-orbit-two"></div>
        </section>
        <div className="auth-panel-wrap">
          <AuthPanel />
        </div>
      </main>
    </div>
  );
}
