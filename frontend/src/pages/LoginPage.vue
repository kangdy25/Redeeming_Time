<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { apiClient, getErrorMessage } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { createSocialAuthVerifier, navigateToExternalUrl } from '../utils/browserNavigation';

const router = useRouter();
const auth = useAuthStore();
const registerMode = ref(false);
const email = ref('');
const nickname = ref('');
const password = ref('');
const message = ref('');
const submitting = ref(false);
const theme = ref<'light' | 'dark'>('dark');

watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value;
  },
  { immediate: true },
);

async function submit() {
  message.value = '';
  submitting.value = true;
  try {
    if (registerMode.value) {
      await apiClient.register({
        email: email.value,
        nickname: nickname.value,
        password: password.value,
      });
      message.value = '인증 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.';
      registerMode.value = false;
      return;
    }
    auth.setTokens(await apiClient.token(email.value, password.value));
    await router.replace('/dashboard');
  } catch (error) {
    message.value = getErrorMessage(error, '로그인에 실패했습니다.');
  } finally {
    submitting.value = false;
  }
}

function beginSocial(provider: 'GOOGLE' | 'KAKAO') {
  navigateToExternalUrl(apiClient.socialLoginUrl(provider, createSocialAuthVerifier()));
}
</script>

<template>
  <div class="app-container">
    <header class="top-nav">
      <div class="top-nav-left">
        <div class="brand-logo">
          <div class="logo-icon"><img src="/logo.png" alt="" /></div>
          <span>Redeeming Time</span>
        </div>
      </div>
      <div class="top-nav-right">
        <div class="status-strip">
          <span>로그인이 필요합니다<span class="sr-only">Sign in required</span></span>
        </div>
        <button
          class="icon-btn"
          :aria-label="'Toggle Theme'"
          @click="theme = theme === 'dark' ? 'light' : 'dark'"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>
    <main class="auth-page-main">
      <section class="auth-story">
        <span class="auth-story-kicker">Redeem your time</span>
        <h1>흩어진 시간을<br />하나의 흐름으로</h1>
        <p>일정과 할일, 떠오른 아이디어까지.<br />중요한 하루를 놓치지 않도록 함께 정리합니다.</p>
        <div class="auth-feature-list">
          <span><b>01</b> 하루의 일정과 할일을 한눈에</span>
          <span><b>02</b> 놓친 할일을 자연스럽게 이어가기</span>
          <span><b>03</b> 생각을 붙잡는 마크다운 아이디어함</span>
        </div>
        <div class="auth-orbit auth-orbit-one"></div>
        <div class="auth-orbit auth-orbit-two"></div>
      </section>
      <div class="auth-panel-wrap">
        <section class="auth-panel" aria-labelledby="auth-title">
          <div class="auth-panel-heading">
            <span class="auth-welcome-icon" aria-hidden="true">✦</span>
            <p class="eyebrow">{{ registerMode ? 'Start planning' : 'Welcome back' }}</p>
            <h2 id="auth-title">
              {{ registerMode ? '새로운 시간을 시작하세요' : '다시 만나서 반가워요' }}
            </h2>
          </div>
          <form class="auth-form" @submit.prevent="submit">
            <div class="auth-segmented segmented">
              <button
                type="button"
                :class="{ active: !registerMode }"
                :disabled="submitting"
                @click="registerMode = false"
              >
                로그인<span class="sr-only">Login</span>
              </button>
              <button
                type="button"
                :class="{ active: registerMode }"
                :disabled="submitting"
                @click="registerMode = true"
              >
                회원가입<span class="sr-only">Register</span>
              </button>
            </div>
            <div class="social-login-grid">
              <button
                type="button"
                class="social-login-button google"
                :disabled="submitting"
                @click="beginSocial('GOOGLE')"
              >
                <span aria-hidden="true">G</span>Google로 계속
              </button>
              <button
                type="button"
                class="social-login-button kakao"
                :disabled="submitting"
                @click="beginSocial('KAKAO')"
              >
                <span aria-hidden="true">K</span>Kakao로 계속
              </button>
            </div>
            <div class="auth-divider"><span>또는 이메일로 계속</span></div>
            <label class="auth-field"
              ><span>이메일</span><input v-model="email" type="email" required
            /></label>
            <RouterLink v-if="!registerMode" class="auth-forgot-password" to="/password-reset"
              >비밀번호를 잊으셨나요?</RouterLink
            >
            <label v-if="registerMode" class="auth-field"
              ><span>닉네임</span><input v-model="nickname" required
            /></label>
            <label class="auth-field"
              ><span>비밀번호</span><input v-model="password" type="password" required
            /></label>
            <p v-if="registerMode" class="auth-terms">
              계정을 만들면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
            </p>
            <button
              class="primary-button auth-submit-button"
              type="submit"
              :disabled="submitting"
              :aria-label="registerMode ? 'Create & Connect' : 'Connect'"
            >
              {{ submitting ? '처리 중...' : registerMode ? '무료로 시작하기' : '로그인' }}
            </button>
          </form>
          <p v-if="message" class="form-message" role="status">{{ message }}</p>
        </section>
      </div>
    </main>
  </div>
</template>
