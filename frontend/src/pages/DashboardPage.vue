<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { apiClient, getErrorMessage } from '../api/client';
import IdeaInbox from '../components/IdeaInbox.vue';
import ProfilePanel from '../components/ProfilePanel.vue';
import TaskBoard from '../components/TaskBoard.vue';
import { usePlannerSnapshot } from '../queries/plannerHooks';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';
import { isoDate, monthCells, sameDate, toApiDateTime } from '../utils/planner';
import type { Event } from '../types';

const router = useRouter();
const auth = useAuthStore();
const planner = usePlannerStore();
const snapshot = usePlannerSnapshot();
const section = ref<'calendar' | 'tasks' | 'inbox' | 'profile'>('calendar');
const calendarView = ref<'month' | 'week'>('month');
const anchor = ref(new Date());
const workspaceOpen = ref(false);
const sidebarCollapsed = ref(false);
const theme = ref<'dark' | 'light'>(
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
);
const createWorkspaceOpen = ref(false);
const eventDialogOpen = ref(false);
const eventEditorOpen = ref(false);
const selectedEvent = ref<Event | null>(null);
const selectedDate = ref(isoDate(new Date()));
const workspaceName = ref('');
const workspaceDescription = ref('');
const eventTitle = ref('');
const eventDescription = ref('');
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
const calendarTaskCount = computed(
  () => planner.tasks.filter((task) => task.calendar === activeCalendarId.value).length,
);
const selectedEvents = computed(() =>
  calendarEvents.value.filter((event) =>
    sameDate(event, new Date(`${selectedDate.value}T00:00:00`)),
  ),
);
const formattedMonth = computed(
  () => `${anchor.value.getFullYear()}년 ${anchor.value.getMonth() + 1}월`,
);
const weekDates = computed(() => {
  const start = new Date(anchor.value);
  start.setDate(start.getDate() - start.getDay());
  return Array.from(
    { length: 7 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
});

onMounted(async () => {
  await snapshot.refetch();
  if (!planner.activeCalendarId && planner.calendars[0])
    planner.setActiveCalendarId(planner.calendars[0].id);
});
watch(theme, (value) => {
  document.documentElement.dataset.theme = value;
  localStorage.setItem('redeeming-time.theme', value);
});

function previousMonth() {
  anchor.value =
    calendarView.value === 'month'
      ? new Date(anchor.value.getFullYear(), anchor.value.getMonth() - 1, 1)
      : new Date(anchor.value.getFullYear(), anchor.value.getMonth(), anchor.value.getDate() - 7);
}
function nextMonth() {
  anchor.value =
    calendarView.value === 'month'
      ? new Date(anchor.value.getFullYear(), anchor.value.getMonth() + 1, 1)
      : new Date(anchor.value.getFullYear(), anchor.value.getMonth(), anchor.value.getDate() + 7);
}
function openDate(date: Date) {
  selectedDate.value = isoDate(date);
  eventDialogOpen.value = true;
}
function selectCalendar(id: number) {
  planner.setActiveCalendarId(id);
  workspaceOpen.value = false;
}
async function deleteActiveWorkspace() {
  if (!activeCalendar.value || activeCalendar.value.is_global) return;
  if (!window.confirm(`"${activeCalendar.value.title}" 워크스페이스를 삭제할까요?`)) return;
  await apiClient.deleteCalendar(activeCalendar.value.id);
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

function openEventEditor(plannerEvent?: Event) {
  selectedEvent.value = plannerEvent ?? null;
  eventTitle.value = plannerEvent?.title ?? '';
  eventDescription.value = plannerEvent?.description ?? '';
  eventDialogOpen.value = false;
  eventEditorOpen.value = true;
}
async function createEvent() {
  if (!eventTitle.value.trim() || !activeCalendarId.value) return;
  try {
    const start = new Date(`${selectedDate.value}T09:00:00`);
    const end = new Date(`${selectedDate.value}T10:00:00`);
    const payload = {
      calendar: activeCalendarId.value,
      title: eventTitle.value.trim(),
      description: eventDescription.value,
      start_time: toApiDateTime(start.toISOString()),
      end_time: toApiDateTime(end.toISOString()),
      is_all_day: false,
      rrule: '',
    };
    if (selectedEvent.value) await apiClient.updateEvent(selectedEvent.value.id, payload);
    else await apiClient.createEvent(payload);
    eventTitle.value = '';
    eventDescription.value = '';
    selectedEvent.value = null;
    eventEditorOpen.value = false;
  } catch (error) {
    notice.value = getErrorMessage(error);
  }
}

async function deleteSelectedEvent() {
  if (!selectedEvent.value) return;
  await apiClient.deleteEvent(selectedEvent.value.id);
  selectedEvent.value = null;
  eventEditorOpen.value = false;
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
function eventLabel(event: Event) {
  return event.is_all_day
    ? event.title
    : `${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${event.title}`;
}
</script>

<template>
  <div class="app-container">
    <header class="dashboard-header top-nav">
      <div class="top-nav-left">
        <button class="brand-logo brand-home" type="button" @click="section = 'calendar'">
          <div class="logo-icon"><img src="/logo.png" alt="" /></div>
          <span>Redeeming Time</span>
        </button>
      </div>
      <div class="top-nav-right">
        <div class="workspace-switcher">
          <button
            class="workspace-switcher-button"
            :class="{ active: workspaceOpen }"
            :disabled="!calendars.length"
            :aria-expanded="workspaceOpen"
            @click="workspaceOpen = !workspaceOpen"
          >
            <span
              class="workspace-switcher-dot"
              :style="{ backgroundColor: activeCalendar?.theme_color }"
            />
            <strong>{{ calendars.length }}개 워크스페이스</strong><span aria-hidden="true">⌄</span>
          </button>
          <div v-if="workspaceOpen" class="workspace-switcher-popover">
            <span>워크스페이스 전환</span>
            <button
              v-for="calendar in calendars"
              :key="calendar.id"
              :class="{ active: calendar.id === activeCalendarId }"
              @click="selectCalendar(calendar.id)"
            >
              <i :style="{ backgroundColor: calendar.theme_color }" /><strong>{{
                calendar.title
              }}</strong
              ><span v-if="calendar.id === activeCalendarId">✓</span>
            </button>
            <button
              @click="
                createWorkspaceOpen = true;
                workspaceOpen = false;
              "
            >
              <i>＋</i><strong>워크스페이스 만들기</strong>
            </button>
            <button
              v-if="activeCalendar && !activeCalendar.is_global"
              class="workspace-delete-action"
              @click="deleteActiveWorkspace"
            >
              <i>−</i><strong>현재 워크스페이스 삭제</strong>
            </button>
          </div>
        </div>
        <button class="primary-button subtle" type="button" @click="logout">로그아웃</button>
        <button
          class="icon-btn"
          type="button"
          aria-label="Toggle Theme"
          @click="theme = theme === 'dark' ? 'light' : 'dark'"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <button
          class="icon-btn profile-nav-button"
          type="button"
          aria-label="My profile"
          @click="section = 'profile'"
        >
          👤
        </button>
      </div>
    </header>
    <div class="workspace-layout">
      <aside class="dashboard-sidebar sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-workspace-card">
          <div class="workspace-header">
            <button
              v-if="sidebarCollapsed"
              class="workspace-toggle-btn collapsed-arrow-toggle"
              aria-label="Toggle Sidebar"
              @click="sidebarCollapsed = false"
            >
              ▶
            </button>
            <template v-else
              ><div
                class="workspace-color-dot"
                :style="{ backgroundColor: activeCalendar?.theme_color }"
              />
              <h3>{{ activeCalendar?.title ?? '전체 캘린더' }}</h3>
              <button
                class="icon-btn collapse-btn"
                aria-label="Toggle Sidebar"
                @click="sidebarCollapsed = true"
              >
                ◀
              </button></template
            >
          </div>
          <div v-if="!sidebarCollapsed" class="workspace-stats">
            <div class="stat-item">
              <span class="stat-val">{{ calendarEvents.length }}</span
              ><span class="stat-lbl">일정</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">{{ calendarTaskCount }}</span
              ><span class="stat-lbl">할일</span>
            </div>
          </div>
        </div>
        <nav class="sidebar-menu" aria-label="주요 메뉴">
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'calendar' }"
            @click="section = 'calendar'"
          >
            <span class="menu-icon">📅</span><span v-if="!sidebarCollapsed">전체 일정</span>
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'tasks' }"
            @click="section = 'tasks'"
          >
            <span class="menu-icon">📋</span><span v-if="!sidebarCollapsed">할일 보드</span>
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'inbox' }"
            @click="section = 'inbox'"
          >
            <span class="menu-icon">📥</span><span v-if="!sidebarCollapsed">아이디어 보관함</span>
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ active: section === 'profile' }"
            @click="section = 'profile'"
          >
            <span class="menu-icon">👤</span><span v-if="!sidebarCollapsed">마이페이지</span>
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
            <div class="calendar-controls-bar">
              <div class="segmented calendar-view-tabs">
                <button :class="{ active: calendarView === 'week' }" @click="calendarView = 'week'">
                  Week
                </button>
                <button
                  :class="{ active: calendarView === 'month' }"
                  @click="calendarView = 'month'"
                >
                  Month
                </button>
              </div>
            </div>
            <div v-if="calendarView === 'month'" class="month-grid">
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
            <div v-else class="week-rail">
              <div v-for="date in weekDates" :key="date.toISOString()" class="week-day">
                <button
                  type="button"
                  class="week-date-select-button"
                  :aria-label="`${isoDate(date)} 일정 보기`"
                  @click="openDate(date)"
                />
                <span>{{ ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] }}</span>
                <strong>{{ date.getDate() }}</strong>
                <button
                  v-for="event in eventsForDate(date)"
                  :key="event.id"
                  type="button"
                  class="week-event"
                  @click="openEventEditor(event)"
                >
                  {{ eventLabel(event) }}
                </button>
              </div>
            </div>
          </section>
          <TaskBoard v-else-if="section === 'tasks'" :calendar-id="activeCalendarId" />
          <IdeaInbox v-else-if="section === 'inbox'" />
          <ProfilePanel v-else @logout="logout" />
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
          <li v-for="event in selectedEvents" :key="event.id">
            <button type="button" class="event-pill" @click="openEventEditor(event)">
              {{ eventLabel(event) }}
            </button>
          </li>
        </ul>
        <button @click="() => openEventEditor()">일정 추가</button>
      </section>
    </div>
    <div v-if="eventEditorOpen" class="modal-overlay visible">
      <section class="modal-content" role="dialog" aria-label="일정 추가">
        <button class="close-button" @click="eventEditorOpen = false">닫기</button>
        <h2>일정 추가</h2>
        <form @submit.prevent="createEvent">
          <label>Event<input v-model="eventTitle" required /></label
          ><label>설명<textarea v-model="eventDescription" /></label
          ><button type="submit">{{ selectedEvent ? 'Save Event' : 'Add Event' }}</button
          ><button v-if="selectedEvent" type="button" @click="deleteSelectedEvent">
            Delete Event
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
