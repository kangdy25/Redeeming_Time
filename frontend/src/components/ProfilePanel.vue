<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';
import type { User } from '../types';

const emit = defineEmits<{ logout: [] }>();
const planner = usePlannerStore();
const user = ref<User | null>(null);
const nickname = ref('');
const imageUrl = ref('');
const workspaceTitle = ref('');
const notice = ref('');
onMounted(async () => {
  try {
    user.value = await apiClient.currentUser();
    nickname.value = user.value.nickname;
    imageUrl.value = user.value.profile_image_url;
  } catch {
    notice.value = '프로필을 불러오지 못했습니다.';
  }
});
async function saveProfile() {
  if (!user.value) return;
  user.value = await apiClient.updateUser(user.value.id, {
    nickname: nickname.value.trim(),
    profile_image_url: imageUrl.value.trim(),
  });
  notice.value = '프로필을 저장했습니다.';
}
async function createWorkspace() {
  if (!workspaceTitle.value.trim()) return;
  await apiClient.createCalendar({
    title: workspaceTitle.value.trim(),
    description: '',
    theme_color: '#1F9D8A',
  });
  workspaceTitle.value = '';
}
async function deleteWorkspace(calendar: (typeof planner.calendars)[number]) {
  if (window.confirm(`"${calendar.title}" 워크스페이스를 삭제할까요?`))
    await apiClient.deleteCalendar(calendar.id);
}
async function deleteAccount() {
  if (!user.value || !window.confirm('계정과 모든 데이터가 삭제됩니다. 정말 탈퇴할까요?')) return;
  await apiClient.deleteUser(user.value.id);
  useAuthStore().clearTokens();
  emit('logout');
}
</script>

<template>
  <section class="profile-page dashboard-profile-page">
    <section class="profile-card">
      <div class="profile-hero">
        <div class="profile-page-avatar">
          <img v-if="imageUrl" :src="imageUrl" alt="프로필" /><template v-else>{{
            (nickname || user?.email || '?').slice(0, 1).toUpperCase()
          }}</template>
        </div>
        <div>
          <p class="eyebrow">My page</p>
          <h1>{{ nickname || '내 프로필' }}</h1>
          <p>{{ user?.email }}</p>
        </div>
      </div>
      <p v-if="notice" class="form-message" role="status">{{ notice }}</p>
      <div class="profile-settings-layout">
        <section class="profile-settings-column">
          <h2>프로필 설정</h2>
          <form class="profile-form" @submit.prevent="saveProfile">
            <label>이메일<input :value="user?.email ?? ''" disabled /></label
            ><label>이름<input v-model="nickname" required /></label
            ><label
              >프로필 사진 URL <span>(선택)</span
              ><input
                v-model="imageUrl"
                type="url"
                placeholder="https://example.com/profile.png" /></label
            ><button class="primary-button">프로필 저장</button>
          </form>
        </section>
        <section class="profile-settings-column">
          <h2>워크스페이스 설정</h2>
          <div class="profile-stats">
            <div>
              <strong>{{ planner.calendars.length }}</strong
              ><span>워크스페이스</span>
            </div>
            <div>
              <strong>{{ planner.events.length }}</strong
              ><span>일정</span>
            </div>
            <div>
              <strong>{{ planner.tasks.length }}</strong
              ><span>할 일</span>
            </div>
          </div>
          <div class="workspace-settings-list">
            <span v-for="calendar in planner.calendars" :key="calendar.id"
              >{{ calendar.title
              }}<button
                v-if="!calendar.is_global"
                :aria-label="`${calendar.title} 삭제`"
                @click="deleteWorkspace(calendar)"
              >
                ×
              </button></span
            >
          </div>
          <form class="workspace-create-form" @submit.prevent="createWorkspace">
            <input
              v-model="workspaceTitle"
              placeholder="새 워크스페이스 이름"
              maxlength="120"
            /><button class="primary-button">추가</button>
          </form>
        </section>
      </div>
      <footer class="profile-footer">
        <a href="#terms">이용약관</a><span>|</span><a href="#privacy">개인정보 처리방침</a
        ><span>|</span><a href="mailto:support@redeemingtime.app">고객센터</a><span>|</span
        ><button @click="deleteAccount">회원 탈퇴</button>
      </footer>
    </section>
  </section>
</template>
