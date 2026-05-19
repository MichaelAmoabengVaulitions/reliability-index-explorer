import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';

// Design tokens for the app. Adding here keeps colors, font sizes, and shadows
// in one place so a component file never needs a raw hex value.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The sidebar and primary accents — deep navy so the dashboard reads
        // as a serious analyst tool, not a marketing site.
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#4f46e5',
          600: '#4338ca',
          700: '#3730a3',
        },
        sidebar: {
          DEFAULT: '#0f172a',
          hover: '#1e293b',
          border: '#1e293b',
          text: '#cbd5e1',
          muted: '#64748b',
          active: '#4f46e5',
        },
        // Score band colors — same hue as the reference, used by chips, gauge,
        // and any "this is low/medium/high" indicator.
        band: {
          low: '#ef4444',
          medium: '#f59e0b',
          high: '#10b981',
        },
        // Inflow/outflow signals. Same as band.high/low on purpose so the eye
        // links "green = good" across all features.
        money: {
          inflow: '#10b981',
          outflow: '#ef4444',
        },
      },
      fontSize: {
        // The score number in the gauge. Large enough to be the visual anchor.
        score: ['72px', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [forms],
};

export default config;
