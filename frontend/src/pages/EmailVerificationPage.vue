<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient, getErrorMessage } from '../api/client';

const route = useRoute();
const message = ref('이메일 인증을 확인하고 있습니다.');
onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : '';
  try {
    await apiClient.confirmEmailVerification(token);
    message.value = '이메일 인증이 완료되었습니다. 이제 로그인할 수 있어요.';
  } catch (error) {
    message.value = getErrorMessage(error, '이메일 인증에 실패했습니다.');
  }
});
</script>
<template>
  <main class="auth-page">
    <section class="auth-panel">
      <p>{{ message }}</p>
      <RouterLink to="/login">로그인으로 이동</RouterLink>
    </section>
  </main>
</template>
