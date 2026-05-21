/**
 * The one place colour values are defined for the app.
 *
 * tailwind.config.ts feeds these into Tailwind, so styling classes like
 * text-band-low or bg-sidebar work. Code that needs a colour as a plain value
 * rather than a class (the SVG score gauge, the Recharts chart) imports this
 * same object. No file should write a raw colour code anywhere else.
 */
export const colors = {
  /*
   * The sidebar and the main accent colours: a deep navy, so the dashboard
   * reads as a serious analyst tool rather than a marketing site.
   */
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
  /*
   * Score band colours, used by the band chip, the gauge arc, and any
   * low/medium/high indicator.
   */
  band: {
    low: '#ef4444',
    medium: '#f59e0b',
    high: '#10b981',
  },
  /*
   * Money-in and money-out colours. On purpose the same green and red as the
   * high and low score bands, so "green is good" reads the same everywhere.
   */
  money: {
    inflow: '#10b981',
    outflow: '#ef4444',
  },
  /*
   * Colours used inside the SVG gauge and the Recharts chart, where a
   * colour must be a plain value rather than a Tailwind class.
   */
  chart: {
    ink: '#0f172a', // the gauge needle and the net cashflow line
    grid: '#e2e8f0', // chart gridlines and axis lines
    axis: '#64748b', // axis tick labels
  },
};
