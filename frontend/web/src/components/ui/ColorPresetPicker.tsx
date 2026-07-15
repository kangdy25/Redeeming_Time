import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COLOR_PRESETS, colorPresetForValue } from '../../utils/colorPresets';

type ColorPresetPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'select' | 'circle';
};

export function ColorPresetPicker({
  label,
  value,
  onChange,
  disabled = false,
  className,
  variant,
}: ColorPresetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPreset = colorPresetForValue(value);
  const swatchColor = selectedPreset ? selectedPreset.value : value;

  // Track the most recently selected color name
  const [lastSelectedName, setLastSelectedName] = useState<string | null>(null);

  // Sync last selected name when selectedPreset is found
  useEffect(() => {
    if (selectedPreset) {
      setLastSelectedName(selectedPreset.label);
    }
  }, [selectedPreset]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function positionDropdown() {
      const container = containerRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const dropdownHeight = Math.min(dropdownRef.current?.scrollHeight || 250, 250);
      const spaceBelow = window.innerHeight - bounds.bottom;
      const spaceAbove = bounds.top;

      setOpensUpward(spaceBelow < dropdownHeight + 8 && spaceAbove > spaceBelow);
    }

    positionDropdown();
    window.addEventListener('resize', positionDropdown);
    window.addEventListener('scroll', positionDropdown, true);
    return () => {
      window.removeEventListener('resize', positionDropdown);
      window.removeEventListener('scroll', positionDropdown, true);
    };
  }, [isOpen]);

  // Auto-detect variant based on className or label if not explicitly provided
  const resolvedVariant =
    variant ||
    (className?.includes('category') || label.toLowerCase().includes('category')
      ? 'circle'
      : 'select');

  const displayName =
    lastSelectedName ||
    (selectedPreset
      ? selectedPreset.label
      : value
        ? `현재 색상 (${value.toUpperCase()})`
        : '색상 선택');

  const classes = [
    'color-preset-picker',
    `is-${resolvedVariant}`,
    isOpen ? 'is-open' : 'is-closed',
    opensUpward ? 'opens-upward' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} ref={containerRef}>
      {resolvedVariant === 'select' ? (
        <button
          type="button"
          className="color-preset-picker__select-trigger"
          onClick={() => setIsOpen((current) => !current)}
          disabled={disabled}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label={`${label}: ${displayName}`}
        >
          <span className="color-preset-picker__select-trigger-content">
            <span
              className="color-preset-picker__swatch"
              style={{ '--preset-color': swatchColor } as CSSProperties}
              aria-hidden="true"
            />
            <span className="color-preset-picker__select-trigger-text">{displayName}</span>
          </span>
          <span className="color-preset-picker__arrow" aria-hidden="true">
            ▼
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="color-preset-picker__circle-trigger"
          onClick={() => setIsOpen((current) => !current)}
          disabled={disabled}
          style={{ '--preset-color': swatchColor } as CSSProperties}
          aria-label={`${label}: ${displayName}`}
          aria-haspopup="true"
          aria-expanded={isOpen}
        />
      )}

      <div
        className={`color-preset-picker__dropdown ${isOpen ? 'is-open' : 'is-closed'}`}
        role="group"
        aria-label={label}
        ref={dropdownRef}
      >
        {COLOR_PRESETS.map((preset) => {
          const selected = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`color-preset-picker__dropdown-option${selected ? ' is-selected' : ''}`}
              aria-label={`${preset.name} (${preset.value})`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => {
                onChange(preset.value);
                setLastSelectedName(preset.label);
                setIsOpen(false);
              }}
              style={{ '--preset-color': preset.value } as CSSProperties}
            >
              <span className="color-preset-picker__swatch" aria-hidden="true" />
              <span className="color-preset-picker__name">{preset.label}</span>
              <span className="color-preset-picker__bullet" aria-hidden="true">
                {selected ? '✓' : ''}
              </span>
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
