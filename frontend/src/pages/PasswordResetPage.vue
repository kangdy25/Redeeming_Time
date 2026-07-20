<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { apiClient, getErrorMessage } from '../api/client';

const route = useRoute();
const uid = computed(() => (typeof route.query.uid === 'string' ? route.query.uid : ''));
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const isConfirmation = computed(() => Boolean(uid.value || token.value));
const theme = ref<'light' | 'dark'>('dark');
const email = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const submitting = ref(false);
const complete = ref(false);
const message = ref('');

watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value;
  },
  { immediate: true },
);

const title = computed(() => (isConfirmation.value ? '새 비밀번호 설정' : '비밀번호 재설정'));

async function submit() {
  message.value = '';
  if (isConfirmation.value && password.value !== passwordConfirmation.value) {
    message.value = '새 비밀번호가 서로 일치하지 않습니다.';
    return;
  }

  submitting.value = true;
  try {
    if (isConfirmation.value) {
      await apiClient.confirmPasswordReset(uid.value, token.value, password.value);
      message.value = '새 비밀번호가 설정되었습니다. 이제 로그인할 수 있어요.';
    } else {
      await apiClient.requestPasswordReset(email.value);
      message.value =
        '계정이 있다면 비밀번호 재설정 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.';
    }
    complete.value = true;
  } catch (error) {
    message.value = getErrorMessage(
      error,
      isConfirmation.value
        ? '재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해 주세요.'
        : '재설정 메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.',
    );
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="app-container">
    <header class="top-nav">
      <RouterLink class="top-nav-left brand-logo" to="/login">
        <div class="logo-icon"><img src="/logo.png" alt="" /></div>
        <span>Redeeming Time</span>
      </RouterLink>
      <div class="top-nav-right">
        <button
          class="icon-btn"
          aria-label="Toggle Theme"
          @click="theme = theme === 'dark' ? 'light' : 'dark'"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>
    <main class="auth-page-main">
      <section class="auth-story">
        <span class="auth-story-kicker">Account recovery</span>
        <h1 class="auth-story-main">다시,<br />당신의 시간으로</h1>
        <p>안전한 일회성 링크로 계정을 다시 사용할 수 있게 도와드릴게요.</p>
      </section>
      <div class="auth-panel-wrap">
        <section class="auth-panel" aria-labelledby="password-reset-title">
          <div class="auth-panel-heading">
            <span class="auth-welcome-icon" aria-hidden="true">✦</span>
            <p class="eyebrow">Secure recovery</p>
            <h1 id="password-reset-title">{{ title }}</h1>
          </div>
          <form v-if="!complete" class="auth-form" @submit.prevent="submit">
            <template v-if="isConfirmation">
              <label class="auth-field">
                <span>새 비밀번호</span>
                <input
                  v-model="password"
                  type="password"
                  minlength="8"
                  autocomplete="new-password"
                  required
                />
              </label>
              <label class="auth-field">
                <span>새 비밀번호 확인</span>
                <input
                  v-model="passwordConfirmation"
                  type="password"
                  minlength="8"
                  autocomplete="new-password"
                  required
                />
              </label>
            </template>
            <label v-else class="auth-field">
              <span>가입한 이메일</span>
              <input
                v-model="email"
                placeholder="name@example.com"
                type="email"
                autocomplete="email"
                required
              />
            </label>
            <button class="primary-button auth-submit-button" type="submit" :disabled="submitting">
              {{
                submitting
                  ? '처리 중...'
                  : isConfirmation
                    ? '새 비밀번호 저장'
                    : '재설정 링크 보내기'
              }}
            </button>
          </form>
          <p v-if="message" class="form-message" :role="complete ? 'status' : 'alert'">
            {{ message }}
          </p>
          <RouterLink class="auth-forgot-password auth-return-link" to="/login">
            로그인으로 돌아가기
          </RouterLink>
        </section>
      </div>
    </main>
  </div>
</template>
