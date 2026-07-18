<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiClient, getErrorMessage } from '../api/client';

const route = useRoute();
const email = ref('');
const password = ref('');
const message = ref('');
const hasToken = computed(
  () => typeof route.query.uid === 'string' && typeof route.query.token === 'string',
);
async function submit() {
  try {
    if (hasToken.value)
      await apiClient.confirmPasswordReset(
        String(route.query.uid),
        String(route.query.token),
        password.value,
      );
    else await apiClient.requestPasswordReset(email.value);
    message.value = hasToken.value
      ? '비밀번호가 변경되었습니다.'
      : '비밀번호 재설정 메일을 보냈습니다.';
  } catch (error) {
    message.value = getErrorMessage(error);
  }
}
</script>
<template>
  <main class="auth-page">
    <section class="auth-panel">
      <h1>비밀번호 재설정</h1>
      <form @submit.prevent="submit">
        <label v-if="!hasToken">이메일<input v-model="email" type="email" required /></label
        ><label v-else>새 비밀번호<input v-model="password" type="password" required /></label>
        <p v-if="message" class="form-message">{{ message }}</p>
        <button>계속</button>
      </form>
      <RouterLink to="/login">로그인으로 이동</RouterLink>
    </section>
  </main>
</template>
