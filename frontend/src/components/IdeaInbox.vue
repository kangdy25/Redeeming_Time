<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

type IdeaNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const storageKey = 'redeeming-time.idea-notes';
function id() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
function starter(): IdeaNote {
  const now = new Date().toISOString();
  return {
    id: id(),
    title: '아이디어 보관함에 오신 것을 환영해요',
    content:
      '# 떠오른 생각을 붙잡아 두세요\n\n아이디어가 완성될 필요는 없습니다. **지금의 단서**만 남겨도 충분해요.\n\n- 생각나는 즉시 기록하기\n- [ ] 다음에 발전시킬 아이디어 표시\n- [x] 검토한 항목 체크',
    tags: ['시작하기'],
    isPinned: true,
    createdAt: now,
    updatedAt: now,
  };
}
function load(): IdeaNote[] {
  try {
    const saved = localStorage.getItem(storageKey);
    const notes = saved ? JSON.parse(saved) : null;
    return Array.isArray(notes) ? notes : [starter()];
  } catch {
    return [starter()];
  }
}
const notes = ref<IdeaNote[]>(load());
const selectedId = ref(notes.value[0]?.id ?? '');
const search = ref('');
const mode = ref<'write' | 'preview' | 'split'>('write');
const mobilePane = ref<'list' | 'editor'>('list');
const isCompact = ref(false);
const tagDraft = ref(notes.value[0]?.tags.join(', ') ?? '');
const selected = computed(() => notes.value.find((note) => note.id === selectedId.value));
const filtered = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase();
  return [...notes.value]
    .filter(
      (note) =>
        !keyword ||
        `${note.title} ${note.content} ${note.tags.join(' ')}`
          .toLocaleLowerCase()
          .includes(keyword),
    )
    .sort(
      (a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.localeCompare(a.updatedAt),
    );
});
const previewHtml = computed(() => renderMarkdown(selected.value?.content ?? ''));
watch(notes, (value) => localStorage.setItem(storageKey, JSON.stringify(value)), { deep: true });
watch(selected, (note) => {
  tagDraft.value = note?.tags.join(', ') ?? '';
});
watch([isCompact, mode], () => {
  if (isCompact.value && mode.value === 'split') mode.value = 'write';
});
let compactQuery: MediaQueryList | null = null;
function syncCompactView() {
  isCompact.value = compactQuery?.matches ?? false;
}
onMounted(() => {
  compactQuery = window.matchMedia('(max-width: 1024px)');
  syncCompactView();
  compactQuery.addEventListener('change', syncCompactView);
});
onUnmounted(() => compactQuery?.removeEventListener('change', syncCompactView));
function excerpt(note: IdeaNote) {
  return (
    note.content
      .replace(/[#>*_`\-[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90) || '내용 없는 메모'
  );
}
function createNote() {
  const now = new Date().toISOString();
  const note: IdeaNote = {
    id: id(),
    title: '제목 없는 아이디어',
    content: '',
    tags: [],
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  };
  notes.value.unshift(note);
  selectedId.value = note.id;
  mode.value = 'write';
  mobilePane.value = 'editor';
}
function patch(patchValue: Partial<IdeaNote>) {
  if (!selected.value) return;
  notes.value = notes.value.map((note) =>
    note.id === selected.value?.id
      ? { ...note, ...patchValue, updatedAt: new Date().toISOString() }
      : note,
  );
}
function updateTags(value: string) {
  tagDraft.value = value.split(',').slice(0, 3).join(',');
  patch({
    tags: [
      ...new Set(
        tagDraft.value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ].slice(0, 3),
  });
}
function titleFromEvent(event: Event) {
  patch({ title: (event.target as HTMLInputElement).value });
}
function contentFromEvent(event: Event) {
  patch({ content: (event.target as HTMLTextAreaElement).value });
}
function tagsFromEvent(event: Event) {
  updateTags((event.target as HTMLInputElement).value);
}
function remove() {
  if (!selected.value || !window.confirm(`"${selected.value.title}" 메모를 삭제할까요?`)) return;
  notes.value = notes.value.filter((note) => note.id !== selected.value?.id);
  selectedId.value = notes.value[0]?.id ?? '';
  mobilePane.value = 'list';
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );
}
function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}
function renderMarkdown(value: string) {
  let inCode = false;
  const code: string[] = [];
  const output: string[] = [];
  for (const line of value.split('\n')) {
    if (line.trim().startsWith('```')) {
      if (inCode) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      code.length = 0;
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (line.startsWith('### ')) output.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    else if (line.startsWith('## ')) output.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    else if (line.startsWith('# ')) output.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    else if (/^- \[[ xX]\] /.test(line))
      output.push(
        `<label class="markdown-check"><input type="checkbox" ${/^- \[[xX]\]/.test(line) ? 'checked' : ''} disabled><span>${inlineMarkdown(line.replace(/^- \[[ xX]\] /, ''))}</span></label>`,
      );
    else if (line.startsWith('- '))
      output.push(
        `<div class="markdown-list-item">• <span>${inlineMarkdown(line.slice(2))}</span></div>`,
      );
    else if (line.startsWith('> '))
      output.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else if (/^---+$/.test(line.trim())) output.push('<hr>');
    else if (line.trim()) output.push(`<p>${inlineMarkdown(line)}</p>`);
    else output.push('<div class="markdown-spacer"></div>');
  }
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return output.join('');
}
</script>

<template>
  <section class="idea-inbox">
    <aside class="idea-note-rail" :class="{ 'mobile-pane-hidden': mobilePane === 'editor' }">
      <header class="idea-rail-header">
        <div>
          <p class="eyebrow">Idea Inbox</p>
          <h2>아이디어 보관함</h2>
        </div>
        <button aria-label="새 아이디어" @click="createNote">+</button>
      </header>
      <label class="idea-search"
        ><span aria-hidden="true">⌕</span><input v-model="search" placeholder="아이디어 검색"
      /></label>
      <div class="idea-note-list">
        <button
          v-for="note in filtered"
          :key="note.id"
          class="idea-note-card"
          :class="{ active: note.id === selectedId }"
          @click="
            selectedId = note.id;
            mobilePane = 'editor';
          "
        >
          <span class="idea-card-heading"
            ><strong>{{ note.title || '제목 없는 아이디어' }}</strong
            ><span v-if="note.isPinned" class="idea-card-pin" aria-label="고정된 메모"
              >📌</span
            ></span
          ><span class="idea-card-excerpt">{{ excerpt(note) }}</span
          ><span class="idea-card-meta"
            >{{
              new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(
                new Date(note.updatedAt),
              )
            }}<em v-for="tag in note.tags.slice(0, 3)" :key="tag">#{{ tag }}</em></span
          >
        </button>
        <p v-if="!filtered.length" class="idea-empty">검색 결과가 없습니다.</p>
      </div>
    </aside>
    <main
      v-if="selected"
      class="idea-editor-shell"
      :class="{ 'mobile-pane-hidden': mobilePane === 'list' }"
    >
      <header class="idea-editor-toolbar">
        <button
          class="idea-mobile-back"
          aria-label="아이디어 목록으로 돌아가기"
          @click="mobilePane = 'list'"
        >
          ← <span>목록</span>
        </button>
        <span class="idea-save-state">자동 저장됨</span>
        <div class="idea-view-switch">
          <button :class="{ active: mode === 'write' }" @click="mode = 'write'">편집</button
          ><button v-if="!isCompact" :class="{ active: mode === 'split' }" @click="mode = 'split'">
            나란히</button
          ><button :class="{ active: mode === 'preview' }" @click="mode = 'preview'">
            미리보기
          </button>
        </div>
        <button
          class="idea-pin-button"
          :class="{ active: selected.isPinned }"
          @click="patch({ isPinned: !selected.isPinned })"
        >
          {{ selected.isPinned ? '고정됨' : '고정' }}</button
        ><button class="idea-delete-button" @click="remove">삭제</button>
      </header>
      <div class="idea-document-header">
        <input
          class="idea-title-input"
          aria-label="아이디어 제목"
          :value="selected.title"
          placeholder="제목 없는 아이디어"
          @input="titleFromEvent"
        /><input
          class="idea-tags-input"
          aria-label="아이디어 태그"
          :value="tagDraft"
          placeholder="태그를 쉼표로 구분해 입력 (최대 3개)"
          @input="tagsFromEvent"
        />
      </div>
      <div class="idea-editor-body" :class="`mode-${mode}`">
        <textarea
          v-if="mode !== 'preview'"
          aria-label="마크다운 내용"
          :value="selected.content"
          placeholder="떠오른 생각을 마크다운으로 기록하세요..."
          @input="contentFromEvent"
        />
        <!-- Preview HTML is escaped before its limited Markdown formatting is applied. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <article v-if="mode !== 'write'" class="markdown-preview" v-html="previewHtml" />
      </div>
    </main>
    <main v-else class="idea-editor-shell">
      <div class="idea-blank-state">
        <span>✦</span>
        <h2>첫 아이디어를 기록해 보세요</h2>
        <p>완성되지 않은 생각도 괜찮습니다.</p>
        <button @click="createNote">새 아이디어 만들기</button>
      </div>
    </main>
  </section>
</template>
