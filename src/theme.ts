/**
 * The single source of colour values for the app.
 *
 * tailwind.config.ts spreads these into the Tailwind theme, so utility
 * classes like `text-band-low` or `bg-sidebar` work. Code that needs a
 * colour as a plain value instead of a class — the SVG score gauge, the
 * Recharts chart — imports the same object from here. No file should
 * write a raw hex string anywhere else.
 */
export const colors = {
  // The sidebar and primary accents — deep navy so the dashboard reads as
  // a serious analyst tool, not a marketing site.
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
  // Score band colours, used by the band chip, the gauge arc, and any
  // low/medium/high indicator.
  band: {
    low: '#ef4444',
    medium: '#f59e0b',
    high: '#10b981',
  },
  // Inflow/outflow signals. Deliberately the same hues as band high/low so
  // the eye links "green = good" across every feature.
  money: {
    inflow: '#10b981',
    outflow: '#ef4444',
  },
  // Colours used inside the SVG gauge and the Recharts chart, where a
  // colour must be a plain value rather than a Tailwind class.
  chart: {
    ink: '#0f172a', // the gauge needle and the net cashflow line
    grid: '#e2e8f0', // chart gridlines and axis lines
    axis: '#64748b', // axis tick labels
  },
};
