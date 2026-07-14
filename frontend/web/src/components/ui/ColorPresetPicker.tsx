import { type CSSProperties } from 'react';
import { COLOR_PRESETS, colorPresetForValue } from '../../utils/colorPresets';

type ColorPresetPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function ColorPresetPicker({
  label,
  value,
  onChange,
  disabled = false,
  className,
}: ColorPresetPickerProps) {
  const selectedPreset = colorPresetForValue(value);
  const classes = ['color-preset-picker', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="color-preset-picker__options" role="group" aria-label={label}>
        {COLOR_PRESETS.map((preset) => {
          const selected = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`color-preset-picker__option${selected ? ' is-selected' : ''}`}
              aria-label={`${preset.name} (${preset.value})`}
              aria-pressed={selected}
              data-color-preset={preset.id}
              disabled={disabled}
              onClick={() => onChange(preset.value)}
              style={{ '--preset-color': preset.value } as CSSProperties}
            >
              <span className="color-preset-picker__swatch" aria-hidden="true" />
              <span className="color-preset-picker__name">{preset.label}</span>
            </button>
          );
        })}
      </div>
      <output className="color-preset-picker__current" aria-live="polite">
        {selectedPreset
          ? `${selectedPreset.label} (${value.toUpperCase()})`
          : `현재 색상 (${value.toUpperCase()})`}
      </output>
    </div>
  );
}
