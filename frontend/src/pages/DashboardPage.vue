<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { apiClient, getErrorMessage } from '../api/client';
import { usePlannerSnapshot, useToggleTask } from '../queries/plannerHooks';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';
import { isoDate, monthCells, sameDate, toApiDateTime } from '../utils/planner';
import type { Event, TaskPriority } from '../types';

const router = useRouter();
const auth = useAuthStore();
const planner = usePlannerStore();
const snapshot = usePlannerSnapshot();
const toggleTask = useToggleTask();
const section = ref<'calendar' | 'tasks' | 'inbox' | 'profile'>('calendar');
const anchor = ref(new Date());
const workspaceOpen = ref(false);
const createWorkspaceOpen = ref(false);
const eventDialogOpen = ref(false);
const eventEditorOpen = ref(false);
const selectedDate = ref(isoDate(new Date()));
const workspaceName = ref('');
const workspaceDescription = ref('');
const eventTitle = ref('');
const eventDescription = ref('');
const taskTitle = ref('');
const notice = ref('');

const calendars = computed(() => planner.calendars);
const activeCalendarId = computed(() => planner.activeCalendarId ?? calendars.value[0]?.id ?? 0);
const activeCalendar = computed(() =>
  calendars.value.find((item) => item.id === activeCalendarId.value),
);
const cells = computed(() => monthCells(anchor.value));
const currentMonth = computed(() => anchor.value.getMonth());
const calendarEvents = computed(() =>
  planner.events.filter((event) => event.calendar === activeCalendarId.value),
);
const selectedEvents = computed(() =>
  calendarEvents.value.filter((event) =>
    sameDate(event, new Date(`${selectedDate.value}T00:00:00`)),
  ),
);
const activeTasks = computed(() =>
  planner.tasks.filter((task) => task.calendar === activeCalendarId.value),
);
const formattedMonth = computed(
  () => `${anchor.value.getFullYear()}년 ${anchor.value.getMonth() + 1}월`,
);

onMounted(async () => {
  await snapshot.refetch();
  if (!planner.activeCalendarId && planner.calendars[0])
    planner.setActiveCalendarId(planner.calendars[0].id);
});

function previousMonth() {
  anchor.value = new Date(anchor.value.getFullYear(), anchor.value.getMonth() - 1, 1);
}
function nextMonth() {
  anchor.value = new Date(anchor.value.getFullYear(), anchor.value.getMonth() + 1, 1);
}
function openDate(date: Date) {
  selectedDate.value = isoDate(date);
  eventDialogOpen.value = true;
}
function selectCalendar(id: number) {
  planner.setActiveCalendarId(id);
  workspaceOpen.value = false;
}

async function createWorkspace() {
  if (!workspaceName.value.trim()) return;
  try {
    const calendar = await apiClient.createCalendar({
      title: workspaceName.value.trim(),
      description: workspaceDescription.value,
      theme_color: '#1F9D8A',
    });
    planner.setActiveCalendarId(calendar.id);
    workspaceName.value = '';
    workspaceDescription.value = '';
    createWorkspaceOpen.value = false;
    workspaceOpen.value = false;
  } catch (error) {
    notice.value = getErrorMessage(error);
  }
}

function openEventEditor() {
  eventDialogOpen.value = false;
  eventEditorOpen.value = true;
}
async function createEvent() {
  if (!eventTitle.value.trim() || !activeCalendarId.value) return;
  try {
    const start = new Date(`${selectedDate.value}T09:00:00`);
    const end = new Date(`${selectedDate.value}T10:00:00`);
    await apiClient.createEvent({
      calendar: activeCalendarId.value,
      title: eventTitle.value.trim(),
      description: eventDescription.value,
      start_time: toApiDateTime(start.toISOString()),
      end_time: toApiDateTime(end.toISOString()),
      is_all_day: false,
      rrule: '',
    });
    eventTitle.value = '';
    eventDescription.value = '';
    eventEditorOpen.value = false;
  } catch (error) {
    notice.value = getErrorMessage(error);
  }
}

async function createTask() {
  if (!taskTitle.value.trim() || !activeCalendarId.value) return;
  try {
    await apiClient.createTask({
      calendar: activeCalendarId.value,
      title: taskTitle.value.trim(),
      target_date: isoDate(new Date()),
      priority: 'NONE' as TaskPriority,
      order: activeTasks.value.length,
    });
    taskTitle.value = '';
  } catch (error) {
    notice.value = getErrorMessage(error);
  }
}

async function logout() {
  try {
    if (auth.refreshToken) await apiClient.logout(auth.refreshToken);
  } finally {
    auth.clearTokens();
    await router.replace('/login');
  }
}

function eventsForDate(date: Date) {
  return calendarEvents.value.filter((event) => sameDate(event, date));
}
function toggle(task: (typeof planner.tasks)[number]) {
  toggleTask.mutate(task);
}
function eventLabel(event: Event) {
  return event.is_all_day
    ? event.title
    : `${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${event.title}`;
}
</script>

<template>
  <div class="app-container">
    <header class="dashboard-header top-nav">
      <div>
        <strong>Redeeming Time</strong
        ><span v-if="activeCalendar"> · {{ activeCalendar.title }}</span>
      </div>
      <button type="button" @click="logout">로그아웃</button>
    </header>
    <div class="workspace-layout">
      <aside class="dashboard-sidebar sidebar">
        <div class="sidebar-workspace-card">
          <button
            type="button"
            class="workspace-trigger workspace-toggle-btn"
            @click="workspaceOpen = !workspaceOpen"
          >
            {{ calendars.length }}개 워크스페이스
          </button>
        </div>
        <div v-if="workspaceOpen" class="workspace-menu">
          <button
            v-for="calendar in calendars"
            :key="calendar.id"
            type="button"
            @click="selectCalendar(calendar.id)"
          >
            {{ calendar.title }}
          </button>
          <button type="button" @click="createWorkspaceOpen = true">워크스페이스 만들기</button>
        </div>
        <nav class="sidebar-menu" aria-label="주요 메뉴">
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'calendar' }"
            @click="section = 'calendar'"
          >
            캘린더
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'tasks' }"
            @click="section = 'tasks'"
          >
            할일 보드
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'inbox' }"
            @click="section = 'inbox'"
          >
            아이디어 보관함
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'profile' }"
            @click="section = 'profile'"
          >
            프로필
          </button>
        </nav>
      </aside>
      <main class="main-content">
        <div class="center-panel">
          <p v-if="notice" class="form-message" role="status">{{ notice }}</p>
          <section v-if="section === 'calendar'" class="planner-panel calendar-area">
            <div class="calendar-heading">
              <div class="calendar-title-group">
                <h2>{{ formattedMonth }}</h2>
                <div class="nav-buttons">
                  <button class="nav-btn" @click="previousMonth">◀</button
                  ><button class="nav-btn" @click="nextMonth">▶</button
                  ><button class="nav-btn" @click="anchor = new Date()">오늘</button>
                </div>
              </div>
              <span class="event-count">{{ calendarEvents.length }} scheduled events</span>
            </div>
            <div class="month-grid">
              <div
                v-for="weekday in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
                :key="weekday"
                class="weekday"
              >
                {{ weekday }}
              </div>
              <div
                v-for="date in cells"
                :key="date.toISOString()"
                class="date-cell"
                :class="{
                  'muted-cell': date.getMonth() !== currentMonth,
                  'today-cell': isoDate(date) === isoDate(new Date()),
                }"
              >
                <button
                  type="button"
                  class="date-select-button"
                  :aria-label="`${isoDate(date)} 일정 보기`"
                  @click="openDate(date)"
                />
                <div class="date-number">{{ date.getDate() }}</div>
                <div class="event-stack">
                  <button
                    v-for="event in eventsForDate(date).slice(0, 3)"
                    :key="event.id"
                    type="button"
                    class="event-pill"
                    @click="openDate(date)"
                  >
                    {{ eventLabel(event) }}
                  </button>
                </div>
              </div>
            </div>
          </section>
          <section v-else-if="section === 'tasks'" class="task-board">
            <div class="task-board-hero"><h2>할일 보드</h2></div>
            <form class="quick-task-form" @submit.prevent="createTask">
              <label>Quick Task<input v-model="taskTitle" /></label
              ><button type="submit">추가</button>
            </form>
            <ul>
              <li v-for="task in activeTasks" :key="task.id">
                <label
                  ><input
                    type="checkbox"
                    :checked="task.is_completed"
                    @change="toggle(task)"
                  /><span :class="{ completed: task.is_completed }">{{ task.title }}</span></label
                >
              </li>
            </ul>
          </section>
          <section v-else-if="section === 'inbox'" class="idea-inbox">
            <h2>아이디어 보관함</h2>
            <p>아이디어를 기록하고 정리할 수 있습니다.</p>
          </section>
          <section v-else class="profile-panel">
            <h2>프로필</h2>
            <p>계정 설정은 API와 연결된 프로필 화면에서 관리합니다.</p>
          </section>
        </div>
      </main>
    </div>

    <div v-if="createWorkspaceOpen" class="modal-overlay visible">
      <section class="modal-content" role="dialog" aria-label="워크스페이스 만들기">
        <button class="close-button" @click="createWorkspaceOpen = false">닫기</button>
        <h2>워크스페이스 만들기</h2>
        <form @submit.prevent="createWorkspace">
          <label>Workspace name<input v-model="workspaceName" required /></label
          ><label>설명<textarea v-model="workspaceDescription" /></label
          ><button type="submit">Create Workspace</button>
        </form>
      </section>
    </div>
    <div v-if="eventDialogOpen" class="modal-overlay visible">
      <section class="modal-content" role="dialog" :aria-label="`${selectedDate} 일정`">
        <button class="close-button" @click="eventDialogOpen = false">닫기</button>
        <h2>{{ selectedDate }} 일정</h2>
        <ul>
          <li v-for="event in selectedEvents" :key="event.id">{{ eventLabel(event) }}</li>
        </ul>
        <button @click="openEventEditor">일정 추가</button>
      </section>
    </div>
    <div v-if="eventEditorOpen" class="modal-overlay visible">
      <section class="modal-content" role="dialog" aria-label="일정 추가">
        <button class="close-button" @click="eventEditorOpen = false">닫기</button>
        <h2>일정 추가</h2>
        <form @submit.prevent="createEvent">
          <label>Event<input v-model="eventTitle" required /></label
          ><label>설명<textarea v-model="eventDescription" /></label
          ><button type="submit">Add Event</button>
        </form>
      </section>
    </div>
  </div>
</template>
