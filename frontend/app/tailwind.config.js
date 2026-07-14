const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  content: ['./App.{js,jsx,ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: withOpacity('--base-background-rgb'),
        surface: withOpacity('--surface-background-rgb'),
        outline: withOpacity('--border-primary-rgb'),
        ink: withOpacity('--text-primary-rgb'),
        muted: withOpacity('--text-secondary-readable-rgb'),
        'accent-core': withOpacity('--accent-core-rgb'),
        'on-accent': withOpacity('--text-on-accent-rgb'),
        action: withOpacity('--action-background-rgb'),
        'on-action': withOpacity('--action-foreground-rgb'),
        danger: withOpacity('--danger-color-rgb'),
        'preset-champagne': withOpacity('--preset-champagne-rgb'),
        'preset-emerald': withOpacity('--preset-emerald-rgb'),
        'preset-orchid': withOpacity('--preset-orchid-rgb'),
        'preset-indigo': withOpacity('--preset-indigo-rgb'),
        'preset-amber': withOpacity('--preset-amber-rgb'),
        'preset-slate': withOpacity('--preset-slate-rgb'),
        'preset-coral': withOpacity('--preset-coral-rgb'),
        'preset-tangerine': withOpacity('--preset-tangerine-rgb'),
        'preset-sky': withOpacity('--preset-sky-rgb'),
        'preset-lime': withOpacity('--preset-lime-rgb'),
        'preset-cyan': withOpacity('--preset-cyan-rgb'),
        'preset-rose': withOpacity('--preset-rose-rgb'),
      },
    },
  },
  plugins: [],
};
