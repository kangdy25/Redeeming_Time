<script setup lang="ts">
import { ref } from 'vue';
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
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="auth-title">
      <p class="eyebrow">Redeeming Time</p>
      <h1 id="auth-title">{{ registerMode ? '계정 만들기' : '로그인' }}</h1>
      <form @submit.prevent="submit">
        <label>이메일<input v-model="email" type="email" required /></label>
        <label v-if="registerMode">닉네임<input v-model="nickname" required /></label>
        <label>비밀번호<input v-model="password" type="password" required /></label>
        <p v-if="message" class="form-message" role="status">{{ message }}</p>
        <button type="submit" :disabled="submitting">
          {{ registerMode ? 'Create & Connect' : 'Connect' }}
        </button>
      </form>
      <button type="button" class="text-button" @click="registerMode = !registerMode">
        {{ registerMode ? '로그인으로 돌아가기' : '회원가입 Register' }}
      </button>
      <div class="social-actions">
        <button type="button" @click="beginSocial('GOOGLE')">Google로 계속</button>
        <button type="button" @click="beginSocial('KAKAO')">Kakao로 계속</button>
      </div>
      <RouterLink to="/password-reset">비밀번호를 잊으셨나요?</RouterLink>
    </section>
  </main>
</template>
