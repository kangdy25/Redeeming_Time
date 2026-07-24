<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient, getErrorMessage } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { clearSocialAuthVerifier, getSocialAuthVerifier } from '../utils/browserNavigation';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const message = ref('소셜 로그인을 연결하고 있습니다.');

const socialErrorMessages: Record<string, string> = {
  ACCESS_DENIED: '소셜 로그인이 취소되었습니다.',
  ACCOUNT_CONFLICT: '이 이메일은 다른 로그인 방식으로 이미 가입되어 있습니다.',
  ACCOUNT_DISABLED: '비활성화된 계정입니다.',
  INVALID_STATE: '로그인 세션이 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.',
  PROVIDER_UNAVAILABLE: '현재 소셜 로그인 서비스를 사용할 수 없습니다.',
  RATE_LIMITED: '소셜 로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
};

onMounted(async () => {
  try {
    const errorCode = typeof route.query.error === 'string' ? route.query.error : '';
    if (errorCode) {
      clearSocialAuthVerifier();
      message.value = socialErrorMessages[errorCode] ?? '소셜 로그인에 실패했습니다. 다시 시도해 주세요.';
      return;
    }

    const code = typeof route.query.code === 'string' ? route.query.code : '';
    const verifier = getSocialAuthVerifier() ?? '';
    auth.setTokens(await apiClient.exchangeSocialCode(code, verifier));
    clearSocialAuthVerifier();
    await router.replace('/dashboard');
  } catch (error) {
    clearSocialAuthVerifier();
    message.value = getErrorMessage(error, '소셜 로그인에 실패했습니다.');
  }
});
</script>
<template>
  <main class="auth-page">
    <section class="auth-panel">
      <p>{{ message }}</p>
      <RouterLink v-if="message !== '소셜 로그인을 연결하고 있습니다.'" to="/login"
        >로그인으로 이동</RouterLink
      >
    </section>
  </main>
</template>
