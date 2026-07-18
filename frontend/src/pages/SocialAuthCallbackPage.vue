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
onMounted(async () => {
  try {
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
