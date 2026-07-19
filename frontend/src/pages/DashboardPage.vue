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
import {
  createKoreaHolidayEvents,
  eventStyle,
  isKoreaHolidayEvent,
  isoDate,
  monthCells,
  sameDate,
  toApiDateTime,
} from '../utils/planner';
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
const eventDate = ref(selectedDate.value);
const eventStartTime = ref('09:00');
const eventEndTime = ref('10:00');
const eventAllDay = ref(false);
const eventRrule = ref('');
const eventColor = ref('#818CF8');
const notice = ref('');

const calendars = computed(() => planner.calendars);
const activeCalendarId = computed(() => planner.activeCalendarId ?? calendars.value[0]?.id ?? 0);
const activeCalendar = computed(() =>
  calendars.value.find((item) => item.id === activeCalendarId.value),
);
const cells = computed(() => monthCells(anchor.value));
const currentMonth = computed(() => anchor.value.getMonth());
const storedCalendarEvents = computed(() =>
  activeCalendar.value?.is_global
    ? planner.events
    : planner.events.filter((event) => event.calendar === activeCalendarId.value),
);
const calendarEvents = computed(() => [
  ...storedCalendarEvents.value,
  ...createKoreaHolidayEvents(activeCalendarId.value),
]);
const calendarTaskCount = computed(
  () => planner.tasks.filter((task) => task.calendar === activeCalendarId.value).length,
);
const selectedEvents = computed(() =>
  calendarEvents.value
    .filter((event) => sameDate(event, new Date(`${selectedDate.value}T00:00:00`)))
    .sort(
      (first, second) =>
        Number(second.is_all_day) - Number(first.is_all_day) ||
        first.start_time.localeCompare(second.start_time),
    ),
);
const eventReadOnly = computed(() =>
  Boolean(selectedEvent.value && isKoreaHolidayEvent(selectedEvent.value)),
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
  const start = plannerEvent
    ? new Date(plannerEvent.start_time)
    : new Date(`${selectedDate.value}T09:00:00`);
  const end = plannerEvent
    ? new Date(plannerEvent.end_time)
    : new Date(`${selectedDate.value}T10:00:00`);
  eventDate.value = isoDate(start);
  eventStartTime.value = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  eventEndTime.value = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  eventAllDay.value = plannerEvent?.is_all_day ?? false;
  eventRrule.value = plannerEvent?.rrule ?? '';
  eventColor.value = plannerEvent?.color_code ?? '#818CF8';
  eventDialogOpen.value = false;
  eventEditorOpen.value = true;
}
async function createEvent() {
  if (eventReadOnly.value) return;
  if (!eventTitle.value.trim() || !activeCalendarId.value) return;
  try {
    const start = new Date(
      `${eventDate.value}T${eventAllDay.value ? '00:00' : eventStartTime.value}:00`,
    );
    const end = new Date(
      `${eventDate.value}T${eventAllDay.value ? '23:59' : eventEndTime.value}:00`,
    );
    if (end <= start) {
      notice.value = '종료 시간은 시작 시간보다 늦어야 합니다.';
      return;
    }
    const payload = {
      calendar: activeCalendarId.value,
      title: eventTitle.value.trim(),
      description: eventDescription.value,
      start_time: toApiDateTime(start.toISOString()),
      end_time: toApiDateTime(end.toISOString()),
      is_all_day: eventAllDay.value,
      rrule: eventRrule.value,
      color_code: eventColor.value,
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
  if (!selectedEvent.value || eventReadOnly.value) return;
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
function dailyTitle(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}요일`;
}
function eventTime(event: Event) {
  if (event.is_all_day) return '하루 종일';
  const format = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${format.format(new Date(event.start_time))} – ${format.format(new Date(event.end_time))}`;
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
              <span class="stat-val">{{ storedCalendarEvents.length }}</span
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
              <span class="event-count">{{ storedCalendarEvents.length }} scheduled events</span>
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
                  'holiday-cell': eventsForDate(date).some(isKoreaHolidayEvent),
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
                    :class="event.is_all_day ? 'all-day-event' : 'timed-event'"
                    :style="eventStyle(event)"
                    @click.stop="openEventEditor(event)"
                  >
                    {{ event.title }}
                  </button>
                  <span v-if="eventsForDate(date).length > 3" class="more-count"
                    >+{{ eventsForDate(date).length - 3 }}</span
                  >
                </div>
              </div>
            </div>
            <div v-else class="week-rail">
              <div
                v-for="date in weekDates"
                :key="date.toISOString()"
                class="week-day"
                :class="{ 'today-week-day': isoDate(date) === isoDate(new Date()) }"
              >
                <button
                  type="button"
                  class="week-date-select-button"
                  :aria-label="`${isoDate(date)} 일정 보기`"
                  @click="openDate(date)"
                />
                <span>{{ ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] }}</span>
                <strong>{{ date.getDate() }}</strong>
                <button
                  v-for="event in eventsForDate(date).slice(0, 2)"
                  :key="event.id"
                  type="button"
                  class="week-event"
                  :class="event.is_all_day ? 'all-day-event' : 'timed-event'"
                  :style="eventStyle(event)"
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

    <div
      v-if="createWorkspaceOpen"
      class="modal-overlay visible"
      @click.self="createWorkspaceOpen = false"
    >
      <section
        class="planner-panel controls-panel"
        role="dialog"
        aria-modal="true"
        aria-label="워크스페이스 만들기"
        @keydown.esc="createWorkspaceOpen = false"
      >
        <div class="control-header">
          <div>
            <p class="eyebrow">Settings</p>
            <h2>워크스페이스 만들기</h2>
          </div>
          <button
            class="icon-btn close-btn"
            aria-label="워크스페이스 만들기 닫기"
            @click="createWorkspaceOpen = false"
          >
            ✕
          </button>
        </div>
        <form class="event-form" @submit.prevent="createWorkspace">
          <div class="event-form-grid">
            <div class="field-stack field-span-2">
              <label for="workspace-title-input">새 워크스페이스</label
              ><input
                id="workspace-title-input"
                v-model="workspaceName"
                aria-label="Workspace name"
                placeholder="예: 업무"
                maxlength="120"
                required
              />
            </div>
            <div class="field-stack field-span-2">
              <label for="workspace-description-input">설명 (선택)</label
              ><textarea
                id="workspace-description-input"
                v-model="workspaceDescription"
                aria-label="Workspace description"
                rows="2"
              />
            </div>
          </div>
          <div class="modal-action-row">
            <button class="primary-button" type="submit">워크스페이스 만들기</button>
          </div>
        </form>
      </section>
    </div>
    <div v-if="eventDialogOpen" class="modal-overlay visible" @click.self="eventDialogOpen = false">
      <section
        class="planner-panel controls-panel daily-events-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-events-title"
        @keydown.esc="eventDialogOpen = false"
      >
        <div class="control-header">
          <div>
            <p class="eyebrow">Daily schedule</p>
            <h2 id="daily-events-title">{{ dailyTitle(selectedDate) }} 일정</h2>
          </div>
          <button
            class="icon-btn close-btn"
            aria-label="날짜별 일정 목록 닫기"
            @click="eventDialogOpen = false"
          >
            ✕
          </button>
        </div>
        <div class="daily-events-list">
          <p v-if="!selectedEvents.length" class="daily-events-empty">
            이 날짜에는 등록된 일정이 없습니다.
          </p>
          <ul v-else>
            <li v-for="event in selectedEvents" :key="event.id">
              <button
                class="daily-event-row"
                :style="{ '--event-color': event.color_code ?? '#818CF8' }"
                :aria-label="`${event.title} 일정 상세 보기`"
                @click="openEventEditor(event)"
              >
                <span class="daily-event-row__swatch" /><span class="daily-event-row__content"
                  ><strong>{{ event.title }}</strong
                  ><span class="daily-event-row__time">{{ eventTime(event) }}</span
                  ><span v-if="event.description" class="daily-event-row__description">{{
                    event.description
                  }}</span></span
                >
              </button>
            </li>
          </ul>
        </div>
        <button class="primary-button daily-events-add" @click="openEventEditor()">
          일정 추가
        </button>
      </section>
    </div>
    <div v-if="eventEditorOpen" class="modal-overlay visible" @click.self="eventEditorOpen = false">
      <section
        class="planner-panel controls-panel"
        role="dialog"
        aria-modal="true"
        aria-label="일정 편집"
        @keydown.esc="eventEditorOpen = false"
      >
        <div class="control-header">
          <div>
            <p class="eyebrow">Schedule</p>
            <h2>{{ selectedEvent ? '일정 상세' : '일정 추가' }}</h2>
          </div>
          <button
            class="icon-btn close-btn"
            aria-label="일정 편집 닫기"
            @click="eventEditorOpen = false"
          >
            ✕
          </button>
        </div>
        <form class="event-form" @submit.prevent="createEvent">
          <div class="event-form-grid">
            <div class="field-stack field-span-2">
              <label for="event-title-input">새 일정명</label
              ><input
                id="event-title-input"
                v-model="eventTitle"
                aria-label="Event"
                :disabled="eventReadOnly"
                required
              />
            </div>
            <div class="field-stack field-span-2">
              <label for="event-description-input">설명</label
              ><textarea
                id="event-description-input"
                v-model="eventDescription"
                aria-label="Event Description"
                :disabled="eventReadOnly"
                rows="2"
              />
            </div>
            <div class="field-stack field-span-2">
              <label for="visual-date-input">일정 날짜</label
              ><input
                id="visual-date-input"
                v-model="eventDate"
                :disabled="eventReadOnly"
                type="date"
                required
              />
            </div>
            <div class="time-pair">
              <div class="field-stack">
                <label for="visual-start-time">시작</label
                ><input
                  id="visual-start-time"
                  v-model="eventStartTime"
                  aria-label="Start Time"
                  type="time"
                  :disabled="eventAllDay || eventReadOnly"
                />
              </div>
              <div class="field-stack">
                <label for="visual-end-time">종료</label
                ><input
                  id="visual-end-time"
                  v-model="eventEndTime"
                  aria-label="End Time"
                  type="time"
                  :disabled="eventAllDay || eventReadOnly"
                />
              </div>
              <label class="compact-toggle"
                ><input
                  v-model="eventAllDay"
                  aria-label="All Day Event"
                  :disabled="eventReadOnly"
                  type="checkbox"
                />하루종일</label
              >
            </div>
            <div class="field-stack repeat-field">
              <label for="event-repeat-input">반복</label
              ><select
                id="event-repeat-input"
                v-model="eventRrule"
                aria-label="Repeat Rule"
                :disabled="eventReadOnly"
              >
                <option value="">반복 없음</option>
                <option value="FREQ=DAILY">매일</option>
                <option value="FREQ=WEEKLY">매주</option>
                <option value="FREQ=MONTHLY">매월</option>
              </select>
            </div>
            <div class="field-stack event-color-field">
              <label for="event-color-input">일정 색상</label
              ><input
                id="event-color-input"
                v-model="eventColor"
                aria-label="Event color"
                :disabled="eventReadOnly"
                type="color"
              />
            </div>
          </div>
          <div class="modal-action-row">
            <button
              v-if="selectedEvent && !eventReadOnly"
              class="danger-button"
              type="button"
              @click="deleteSelectedEvent"
            >
              일정 삭제</button
            ><button class="primary-button" type="submit" :disabled="eventReadOnly">
              {{ eventReadOnly ? '공휴일 보기' : selectedEvent ? '일정 저장' : '일정 추가' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
