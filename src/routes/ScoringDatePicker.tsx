import { useState } from 'react';

import { config } from '@/config';
import { useDashboardParams } from '@/data/useDashboardParams';
import { isSelectableDate } from '@/domain/dashboardParams';
import { todayAsIsoDate } from '@/domain/dates';

/**
 * Picks the date the scoring window ends on. A date box reports half-typed
 * years as real dates, so the box keeps its own draft and the URL only changes
 * for a date inside the allowed range. Emptying the box goes back to today.
 */
export function ScoringDatePicker() {
  const { from, updateFrom } = useDashboardParams();
  const [draft, setDraft] = useState(from);

  // Follow the URL when it changes elsewhere, for example with the back button.
  const [lastFrom, setLastFrom] = useState(from);
  if (from !== lastFrom) {
    setLastFrom(from);
    setDraft(from);
  }

  function changeDate(date: string) {
    setDraft(date);
    if (date === '' || isSelectableDate(date)) updateFrom(date);
  }

  return (
    <label className="flex flex-col gap-0.5 text-xs text-slate-500">
      Scoring window ends
      <input
        type="date"
        value={draft}
        min={config.api.earliestScoringDate}
        max={todayAsIsoDate()}
        onChange={(event) => changeDate(event.target.value)}
        onBlur={() => setDraft(from)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
      />
    </label>
  );
}
