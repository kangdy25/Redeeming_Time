import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ColorPresetPicker } from './ColorPresetPicker';
import { COLOR_PRESETS } from '../../utils/colorPresets';

describe('ColorPresetPicker', () => {
  test('uses the specified twelve-color palette', () => {
    expect(COLOR_PRESETS.map((preset) => preset.value)).toEqual([
      '#D9C9A6',
      '#66A283',
      '#A78BFA',
      '#818CF8',
      '#FBBF24',
      '#71717A',
      '#F87171',
      '#FB923C',
      '#60A5FA',
      '#A3E635',
      '#22D3EE',
      '#F472B6',
    ]);
  });

  test('renders all twelve accessible color presets and reports its selection', () => {
    const onChange = vi.fn();
    render(<ColorPresetPicker label="Event color" value="#818CF8" onChange={onChange} />);

    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Electric Indigo (#818CF8)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Coral Red (#F87171)' }));
    expect(onChange).toHaveBeenCalledWith('#F87171');
  });

  test('keeps a legacy color visible without treating it as a selected preset', () => {
    render(<ColorPresetPicker label="Category color" value="#123456" onChange={vi.fn()} />);

    expect(screen.getByText('현재 색상 (#123456)')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });
});
