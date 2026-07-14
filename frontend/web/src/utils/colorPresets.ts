export const CHAMPAGNE_GOLD = '#D9C9A6';
export const EMERALD_MUTED = '#66A283';
export const ORCHID_VIOLET = '#A78BFA';
export const ELECTRIC_INDIGO = '#818CF8';
export const AMBER_SUNSET = '#FBBF24';
export const SLATE_GREY = '#71717A';
export const CORAL_RED = '#F87171';
export const TANGERINE_ORANGE = '#FB923C';
export const SKY_BLUE = '#60A5FA';
export const LIME_GREEN = '#A3E635';
export const CYAN = '#22D3EE';
export const ROSE = '#F472B6';

export const COLOR_PRESETS = [
  { id: 'champagne-gold', name: 'Champagne Gold', label: '샴페인 골드', value: CHAMPAGNE_GOLD },
  { id: 'emerald-muted', name: 'Emerald Muted', label: '에메랄드', value: EMERALD_MUTED },
  { id: 'orchid-violet', name: 'Orchid Violet', label: '오키드 바이올렛', value: ORCHID_VIOLET },
  {
    id: 'electric-indigo',
    name: 'Electric Indigo',
    label: '일렉트릭 인디고',
    value: ELECTRIC_INDIGO,
  },
  { id: 'amber-sunset', name: 'Amber Sunset', label: '앰버 선셋', value: AMBER_SUNSET },
  { id: 'slate-grey', name: 'Slate Grey', label: '슬레이트 그레이', value: SLATE_GREY },
  { id: 'coral-red', name: 'Coral Red', label: '코랄 레드', value: CORAL_RED },
  {
    id: 'tangerine-orange',
    name: 'Tangerine Orange',
    label: '탠저린 오렌지',
    value: TANGERINE_ORANGE,
  },
  { id: 'sky-blue', name: 'Sky Blue', label: '스카이 블루', value: SKY_BLUE },
  { id: 'lime-green', name: 'Lime Green', label: '라임 그린', value: LIME_GREEN },
  { id: 'cyan', name: 'Cyan', label: '시안', value: CYAN },
  { id: 'rose', name: 'Rose', label: '로즈', value: ROSE },
] as const;

export type ColorPreset = (typeof COLOR_PRESETS)[number];
export type ColorPresetValue = ColorPreset['value'];

export const DEFAULT_EVENT_COLOR = ELECTRIC_INDIGO;
export const DEFAULT_CATEGORY_COLOR = EMERALD_MUTED;
export const DEFAULT_WORKSPACE_COLOR = ELECTRIC_INDIGO;

export function colorPresetForValue(value: string) {
  return COLOR_PRESETS.find((preset) => preset.value.toLowerCase() === value.toLowerCase());
}
