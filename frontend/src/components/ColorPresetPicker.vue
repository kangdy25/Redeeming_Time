<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { COLOR_PRESETS, colorPresetForValue } from '../utils/colorPresets';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label: string;
    disabled?: boolean;
    variant?: 'select' | 'circle';
  }>(),
  { disabled: false, variant: 'select' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const open = ref(false);
const container = ref<HTMLElement | null>(null);
const selected = computed(() => colorPresetForValue(props.modelValue));
const displayName = computed(
  () => selected.value?.label ?? `현재 색상 (${props.modelValue.toUpperCase()})`,
);
const color = computed(() => selected.value?.value ?? props.modelValue);
function closeOutside(event: MouseEvent) {
  if (container.value && !container.value.contains(event.target as Node)) open.value = false;
}
function choose(value: string) {
  emit('update:modelValue', value);
  open.value = false;
}
onMounted(() => document.addEventListener('mousedown', closeOutside));
onUnmounted(() => document.removeEventListener('mousedown', closeOutside));
</script>

<template>
  <div
    ref="container"
    class="color-preset-picker"
    :class="[`is-${variant}`, { 'is-open': open, 'is-closed': !open }]"
  >
    <button
      v-if="variant === 'select'"
      type="button"
      class="color-preset-picker__select-trigger"
      :disabled="disabled"
      :aria-label="`${label}: ${displayName}`"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="color-preset-picker__select-trigger-content"
        ><span class="color-preset-picker__swatch" :style="{ '--preset-color': color }" /><span
          class="color-preset-picker__select-trigger-text"
          >{{ displayName }}</span
        ></span
      ><span class="color-preset-picker__arrow">▼</span>
    </button>
    <button
      v-else
      type="button"
      class="color-preset-picker__circle-trigger"
      :disabled="disabled"
      :style="{ '--preset-color': color }"
      :aria-label="`${label}: ${displayName}`"
      :aria-expanded="open"
      @click="open = !open"
    />
    <div
      class="color-preset-picker__dropdown"
      :class="{ 'is-open': open, 'is-closed': !open }"
      role="group"
      :aria-label="label"
    >
      <button
        v-for="preset in COLOR_PRESETS"
        :key="preset.id"
        type="button"
        class="color-preset-picker__dropdown-option"
        :class="{ 'is-selected': selected?.id === preset.id }"
        :style="{ '--preset-color': preset.value }"
        :aria-pressed="selected?.id === preset.id"
        :disabled="disabled"
        @click="choose(preset.value)"
      >
        <span class="color-preset-picker__swatch" /><span class="color-preset-picker__name">{{
          preset.label
        }}</span
        ><span class="color-preset-picker__bullet">{{
          selected?.id === preset.id ? '✓' : ''
        }}</span>
      </button>
    </div>
    <output class="color-preset-picker__current" aria-live="polite">{{ displayName }}</output>
  </div>
</template>
