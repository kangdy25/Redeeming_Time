<script setup lang="ts">
import { computed, ref } from 'vue';

import { apiClient } from '../api/client';
import { useToggleTask } from '../queries/plannerHooks';
import { usePlannerStore } from '../stores/plannerStore';
import type { Category, TaskPriority } from '../types';
import { isoDate, monthCells } from '../utils/planner';

const props = defineProps<{ calendarId: number }>();
const planner = usePlannerStore();
const toggleTask = useToggleTask();
const selectedDate = ref(isoDate(new Date()));
const miniMonth = ref(new Date());
const taskTitle = ref('');
const quickTaskInput = ref<HTMLInputElement | null>(null);
const taskPriority = ref<TaskPriority>('NONE');
const taskCategory = ref('');
const categoryName = ref('');
const categoryColor = ref('#1F9D8A');
const message = ref('');
const editingTaskId = ref<number | null>(null);
const editingCategoryId = ref<number | null>(null);
const editCategoryName = ref('');
const editCategoryColor = ref('#1F9D8A');
const editTitle = ref('');
const editDate = ref('');
const editPriority = ref<TaskPriority>('NONE');
const editCategory = ref('');

const today = isoDate(new Date());
const priorities: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];
const selectedTasks = computed(() =>
  planner.tasks.filter(
    (task) => task.calendar === props.calendarId && task.target_date === selectedDate.value,
  ),
);
const categories = computed(() =>
  planner.categories.filter((category) => category.calendar === props.calendarId),
);
const openTasks = computed(() => selectedTasks.value.filter((task) => !task.is_completed));
const overdueTasks = computed(() =>
  planner.tasks.filter(
    (task) => task.calendar === props.calendarId && !task.is_completed && task.target_date < today,
  ),
);
const completionRate = computed(() =>
  selectedTasks.value.length
    ? Math.round(
        ((selectedTasks.value.length - openTasks.value.length) / selectedTasks.value.length) * 100,
      )
    : 0,
);
const cells = computed(() => monthCells(miniMonth.value));
const taskCountByDate = computed(() => {
  const counts: Record<string, number> = {};
  for (const task of planner.tasks.filter((item) => item.calendar === props.calendarId)) {
    counts[task.target_date] = (counts[task.target_date] ?? 0) + 1;
  }
  return counts;
});
const sections = computed(() => {
  const items: { category: Category | null; tasks: typeof selectedTasks.value }[] = [
    ...categories.value.map((category) => ({
      category,
      tasks: selectedTasks.value.filter((task) => task.category === category.id),
    })),
    { category: null, tasks: selectedTasks.value.filter((task) => !task.category) },
  ];
  return items.filter((item) => item.category || item.tasks.length);
});
const dateTitle = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 TODO`;
});

function moveMonth(offset: number) {
  miniMonth.value = new Date(miniMonth.value.getFullYear(), miniMonth.value.getMonth() + offset, 1);
}
function selectDate(value: string) {
  selectedDate.value = value;
  miniMonth.value = new Date(`${value}T00:00:00`);
}
function prepareTask(categoryId: number | null) {
  taskCategory.value = categoryId ? String(categoryId) : '';
  quickTaskInput.value?.focus();
}
async function addTask(categoryId?: number | null) {
  if (!taskTitle.value.trim() || !props.calendarId) return;
  try {
    await apiClient.createTask({
      calendar: props.calendarId,
      category: categoryId ?? (taskCategory.value ? Number(taskCategory.value) : null),
      title: taskTitle.value.trim(),
      target_date: selectedDate.value,
      priority: taskPriority.value,
      order: selectedTasks.value.length,
    });
    taskTitle.value = '';
    message.value = '';
  } catch {
    message.value = '할 일을 저장하지 못했습니다.';
  }
}
async function addCategory() {
  if (!categoryName.value.trim() || !props.calendarId) return;
  try {
    await apiClient.createCategory({
      calendar: props.calendarId,
      name: categoryName.value.trim(),
      color_code: categoryColor.value,
    });
    categoryName.value = '';
  } catch {
    message.value = '카테고리를 저장하지 못했습니다.';
  }
}
async function removeCategory(category: Category) {
  if (
    window.confirm(
      `"${category.name}" 카테고리를 삭제할까요? 포함된 할일은 카테고리 없음으로 이동합니다.`,
    )
  )
    await apiClient.deleteCategory(category.id);
}
function startCategoryEdit(category: Category) {
  editingCategoryId.value = category.id;
  editCategoryName.value = category.name;
  editCategoryColor.value = category.color_code;
}
async function saveCategory(category: Category) {
  if (!editCategoryName.value.trim()) return;
  await apiClient.updateCategory(category.id, {
    name: editCategoryName.value.trim(),
    color_code: editCategoryColor.value,
  });
  editingCategoryId.value = null;
}
function startEdit(task: (typeof selectedTasks.value)[number]) {
  editingTaskId.value = task.id;
  editTitle.value = task.title;
  editDate.value = task.target_date;
  editPriority.value = task.priority;
  editCategory.value = task.category ? String(task.category) : '';
}
async function saveTask(taskId: number) {
  if (!editTitle.value.trim()) return;
  await apiClient.editTask(taskId, {
    title: editTitle.value.trim(),
    target_date: editDate.value,
    priority: editPriority.value,
    category: editCategory.value ? Number(editCategory.value) : null,
  });
  editingTaskId.value = null;
}
async function removeTask(task: (typeof selectedTasks.value)[number]) {
  if (!window.confirm(`"${task.title}" 할일을 삭제할까요?`)) return;
  await apiClient.deleteTask(task.id);
  if (editingTaskId.value === task.id) editingTaskId.value = null;
}
async function rollover() {
  if (!overdueTasks.value.length) return;
  await Promise.all(overdueTasks.value.map((task) => apiClient.updateTaskTargetDate(task, today)));
  message.value = `${overdueTasks.value.length}개의 밀린 할 일을 오늘로 가져왔습니다.`;
}
</script>

<template>
  <section class="task-board">
    <div class="task-board-hero">
      <div>
        <p class="eyebrow">할일 보드</p>
        <h2>{{ dateTitle }}</h2>
      </div>
      <div class="task-board-hero-side">
        <div class="task-board-stats">
          <div>
            <strong>{{ selectedTasks.length }}</strong
            ><span>전체</span>
          </div>
          <div class="task-board-progress-copy">
            <strong>{{ openTasks.length }}</strong
            ><span>남은 할일</span>
          </div>
          <div>
            <strong>{{ completionRate }}%</strong><span>완료율</span>
          </div>
          <button
            class="rollover-compact-button"
            :disabled="!overdueTasks.length"
            @click="rollover"
          >
            밀린 할일 가져오기
          </button>
        </div>
      </div>
    </div>
    <p v-if="message" class="rollover-message" role="status">{{ message }}</p>
    <div class="task-workspace">
      <aside class="mini-calendar-panel">
        <div class="mini-calendar-header">
          <div>
            <span>Calendar</span>
            <h3>{{ miniMonth.getFullYear() }}년 {{ miniMonth.getMonth() + 1 }}월</h3>
          </div>
          <div class="mini-month-controls">
            <button aria-label="Previous task month" @click="moveMonth(-1)">◀</button
            ><button @click="selectDate(today)">오늘</button
            ><button aria-label="Next task month" @click="moveMonth(1)">▶</button>
          </div>
        </div>
        <div class="mini-calendar-grid">
          <span
            v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
            :key="day"
            class="mini-weekday"
            >{{ day }}</span
          >
          <button
            v-for="date in cells"
            :key="date.toISOString()"
            class="mini-day"
            :class="{
              selected: isoDate(date) === selectedDate,
              today: isoDate(date) === today,
              muted: date.getMonth() !== miniMonth.getMonth(),
            }"
            @click="selectDate(isoDate(date))"
          >
            <span>{{ date.getDate() }}</span
            ><b v-if="taskCountByDate[isoDate(date)]">{{ taskCountByDate[isoDate(date)] }}</b>
          </button>
        </div>
      </aside>
      <section class="todo-panel">
        <form class="quick-task-form" @submit.prevent="addTask()">
          <input
            ref="quickTaskInput"
            v-model="taskTitle"
            aria-label="Quick Task"
            :placeholder="`${selectedDate}에 할일 추가`"
            :disabled="!calendarId"
          /><select v-model="taskPriority" aria-label="Quick Task Priority">
            <option v-for="priority in priorities" :key="priority" :value="priority">
              {{ priority }}
            </option></select
          ><select v-model="taskCategory" aria-label="Quick Task Category">
            <option value="">카테고리 없음</option>
            <option v-for="category in categories" :key="category.id" :value="String(category.id)">
              {{ category.name }}
            </option></select
          ><button :disabled="!calendarId">추가</button>
        </form>
        <form class="task-category-form" @submit.prevent="addCategory">
          <input
            v-model="categoryName"
            aria-label="Category"
            placeholder="새 할일 카테고리"
            :disabled="!calendarId"
          /><input v-model="categoryColor" aria-label="Category color" type="color" /><button
            :disabled="!calendarId"
          >
            카테고리 추가
          </button>
        </form>
        <div class="task-board-list">
          <section
            v-for="section in sections"
            :key="section.category?.id ?? 'none'"
            class="task-category-section"
            :style="section.category ? { '--category-color': section.category.color_code } : {}"
          >
            <form
              v-if="section.category && editingCategoryId === section.category.id"
              class="category-edit-form"
              @submit.prevent="saveCategory(section.category)"
            >
              <input v-model="editCategoryName" aria-label="Edit category name" /><input
                v-model="editCategoryColor"
                aria-label="Edit category color"
                type="color"
              /><button>저장</button
              ><button type="button" @click="editingCategoryId = null">취소</button>
            </form>
            <header v-else class="task-category-pill">
              <span class="task-category-mark">{{ section.category ? '●' : '○' }}</span
              ><strong>{{ section.category?.name ?? '카테고리 없음' }}</strong
              ><span class="task-category-progress"
                >{{ section.tasks.filter((task) => task.is_completed).length }}/{{
                  section.tasks.length
                }}</span
              ><button
                v-if="section.category"
                class="category-manage-button"
                :aria-label="`${section.category.name} 수정`"
                @click="startCategoryEdit(section.category)"
              >
                ✎</button
              ><button
                v-if="section.category"
                class="category-manage-button category-delete-button"
                :aria-label="`${section.category.name} 삭제`"
                @click="removeCategory(section.category)"
              >
                ×</button
              ><button
                :aria-label="`${section.category?.name ?? '카테고리 없음'}에 할일 추가`"
                @click="prepareTask(section.category?.id ?? null)"
              >
                +
              </button>
            </header>
            <div class="task-category-items">
              <template v-for="task in section.tasks" :key="task.id">
                <form
                  v-if="editingTaskId === task.id"
                  class="task-edit-form"
                  @submit.prevent="saveTask(task.id)"
                >
                  <input v-model="editTitle" aria-label="Edit task title" /><input
                    v-model="editDate"
                    aria-label="Edit task date"
                    type="date"
                  /><select v-model="editPriority" aria-label="Edit task priority">
                    <option v-for="priority in priorities" :key="priority" :value="priority">
                      {{ priority }}
                    </option></select
                  ><select v-model="editCategory" aria-label="Edit task category">
                    <option value="">카테고리 없음</option>
                    <option
                      v-for="category in categories"
                      :key="category.id"
                      :value="String(category.id)"
                    >
                      {{ category.name }}
                    </option></select
                  ><button>저장</button
                  ><button type="button" @click="editingTaskId = null">취소</button>
                </form>
                <div
                  v-else
                  class="todo-row"
                  :class="[`priority-${task.priority.toLowerCase()}`, { done: task.is_completed }]"
                >
                  <button class="todo-toggle" @click="toggleTask.mutate(task)">
                    <span class="todo-check">{{ task.is_completed ? '✓' : '' }}</span
                    ><span class="todo-main"
                      ><strong>{{ task.title }}</strong
                      ><span
                        ><em
                          class="badge-priority"
                          :class="`badge-${task.priority.toLowerCase()}`"
                          >{{ task.priority }}</em
                        ><em
                          v-if="!task.is_completed && task.target_date < today"
                          class="badge-rollover"
                          >이월 대기</em
                        ></span
                      ></span
                    >
                  </button>
                  <div class="todo-manage-actions">
                    <button :aria-label="`${task.title} 수정`" @click="startEdit(task)">✎</button
                    ><button :aria-label="`${task.title} 삭제`" @click="removeTask(task)">×</button>
                  </div>
                </div>
              </template>
              <button
                v-if="!section.tasks.length"
                class="category-empty-row"
                @click="prepareTask(section.category?.id ?? null)"
              >
                이 카테고리에 첫 할일 추가 <span>+</span>
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  </section>
</template>
