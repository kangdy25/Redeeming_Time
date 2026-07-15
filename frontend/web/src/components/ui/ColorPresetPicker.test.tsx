import { fireEvent, render, screen, within } from '@testing-library/react';
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

  test('renders select variant and reports selection', () => {
    const onChange = vi.fn();
    render(
      <ColorPresetPicker
        label="Event color"
        value="#818CF8"
        onChange={onChange}
        variant="select"
      />,
    );

    // There should be a trigger button
    const trigger = screen.getByRole('button', { name: /Event color/i });
    expect(trigger).toBeInTheDocument();

    // The option group should contain 12 buttons
    const group = screen.getByRole('group', { name: 'Event color' });
    expect(group).toBeInTheDocument();

    const optionButtons = within(group).getAllByRole('button');
    expect(optionButtons).toHaveLength(12);

    expect(
      within(group).getByRole('button', { name: 'Electric Indigo (#818CF8)' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Click Coral Red option
    fireEvent.click(within(group).getByRole('button', { name: 'Coral Red (#F87171)' }));
    expect(onChange).toHaveBeenCalledWith('#F87171');
  });

  test('renders circle variant and reports selection', () => {
    const onChange = vi.fn();
    render(
      <ColorPresetPicker
        label="Category color"
        value="#66A283"
        onChange={onChange}
        variant="circle"
      />,
    );

    // There should be a trigger button
    const trigger = screen.getByRole('button', { name: /Category color/i });
    expect(trigger).toBeInTheDocument();

    // The option group should contain 12 buttons
    const group = screen.getByRole('group', { name: 'Category color' });
    expect(group).toBeInTheDocument();

    const optionButtons = within(group).getAllByRole('button');
    expect(optionButtons).toHaveLength(12);

    // Click Rose option
    fireEvent.click(within(group).getByRole('button', { name: 'Rose (#F472B6)' }));
    expect(onChange).toHaveBeenCalledWith('#F472B6');
  });

  test('opens upward when there is not enough space below the trigger', () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    const bounds = {
      bottom: 520,
      height: 40,
      left: 0,
      right: 240,
      toJSON: () => ({}),
      top: 480,
      width: 240,
      x: 0,
      y: 480,
    } as DOMRect;
    const boundsSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(bounds);

    render(<ColorPresetPicker label="Event color" value="#818CF8" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /Event color/i });
    fireEvent.click(trigger);

    expect(trigger.parentElement).toHaveClass('opens-upward');

    boundsSpy.mockRestore();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  test('keeps a legacy color visible without treating it as a selected preset', () => {
    render(<ColorPresetPicker label="Category color" value="#123456" onChange={vi.fn()} />);

    expect(screen.getByText('현재 색상 (#123456)')).toBeInTheDocument();

    // Check that none of the options are marked selected
    const group = screen.getByRole('group', { name: 'Category color' });
    const optionButtons = within(group).getAllByRole('button');
    optionButtons.forEach((opt) => {
      expect(opt).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
