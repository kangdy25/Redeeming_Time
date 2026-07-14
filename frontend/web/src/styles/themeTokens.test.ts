import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const webRoot = basename(process.cwd()) === 'web' ? process.cwd() : resolve(process.cwd(), 'web');
const baseCss = readFileSync(resolve(webRoot, 'src/styles/base.css'), 'utf8');

function luminance(hex: string) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme token contract', () => {
  test('defines the required light, dark, and twelve-color preset tokens', () => {
    expect(baseCss).toContain(":root[data-theme='light']");
    expect(baseCss).toContain(":root[data-theme='dark']");
    expect(baseCss).toContain('--base-background: #ffffff');
    expect(baseCss).toContain('--base-background: #09090b');
    expect(baseCss).toContain('--border-primary: #e4e4e7');
    expect(baseCss).toContain('--border-primary: rgba(113, 113, 122, 0.3)');

    for (const preset of [
      'champagne-gold',
      'emerald-muted',
      'orchid-violet',
      'electric-indigo',
      'amber-sunset',
      'slate-grey',
      'coral-red',
      'tangerine-orange',
      'sky-blue',
      'lime-green',
      'cyan',
      'rose',
    ]) {
      expect(baseCss).toContain(`--preset-${preset}:`);
    }
  });

  test('keeps the text and accent foreground combinations at WCAG AA contrast', () => {
    expect(contrastRatio('#18181b', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#71717a', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#fafafa', '#09090b')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#a1a1aa', '#09090b')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#18181b', '#d9c9a6')).toBeGreaterThanOrEqual(4.5);
  });

  test('uses neutral black-and-white controls in light mode', () => {
    const lightThemeBlock = baseCss
      .split(":root[data-theme='light'] {")[1]
      .split('\n}\n\n:root,')[0];

    expect(lightThemeBlock).toContain('--color-bg-card: #ffffff');
    expect(lightThemeBlock).toContain('--color-border-hover: #18181b');
    expect(lightThemeBlock).toContain('--color-accent: #18181b');
    expect(lightThemeBlock).toContain('--color-on-accent: #ffffff');
    expect(lightThemeBlock).toContain('--brand-title-color: var(--text-primary)');
    expect(lightThemeBlock).toContain('--brand-title-gradient: linear-gradient');
    expect(lightThemeBlock).toContain('--gradient-accent: var(--color-accent)');
    expect(lightThemeBlock).not.toContain('preset-electric-indigo');
    expect(lightThemeBlock).not.toContain('preset-orchid-violet');
    expect(lightThemeBlock).not.toContain('#2563eb');
  });

  test('uses neutral and champagne gradients for the logo title', () => {
    expect(baseCss).toContain('--brand-title-color: var(--accent-core)');
    expect(baseCss).toContain('--brand-title-color: var(--text-primary)');
    expect(baseCss).toContain('--brand-title-gradient: linear-gradient');
  });
});
