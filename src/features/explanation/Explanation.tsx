import type { ReliabilityResponse } from '@/api/schemas';
import { useReliability } from '@/data/useReliability';
import { type ParsedDriver, parseDriver } from '@/domain/scoring';
import { useSelectedUser } from '@/store/selectedUser';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

const BAND_SUMMARY: Record<ReliabilityResponse['score_band'], string> = {
  LOW:
    'This score sits in the low band. It usually means income is irregular ' +
    'or expenses are running close to (or above) what is coming in. ' +
    'Lenders are likely to ask for additional context before approving credit.',
  MEDIUM:
    'This score sits in the middle band. Income is generally regular and ' +
    'expenses are covered, but there are some weaker months or risk events. ' +
    'A clear story for the dips helps when this score is reviewed.',
  HIGH:
    'This score sits in the high band. Income is steady, essentials are ' +
    'paid consistently, and there are very few risk events in the window. ' +
    'This is a strong profile for approval at standard terms.',
};

interface DriverRowProps {
  driver: ParsedDriver;
}

function pointsChipClasses(driver: ParsedDriver): string {
  if (driver.kind === 'positive') return 'bg-emerald-100 text-emerald-800';
  if (driver.kind === 'risk') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function DriverRow({ driver }: DriverRowProps) {
  const showsPoints = driver.points !== undefined;
  const sign = driver.points !== undefined && driver.points > 0 ? '+' : '';
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <p className="m-0 text-sm text-slate-700">{driver.label}</p>
      {showsPoints && (
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pointsChipClasses(driver)}`}
        >
          {sign}
          {driver.points} pts
        </span>
      )}
    </li>
  );
}

interface ColumnProps {
  title: string;
  drivers: ParsedDriver[];
  emptyHint: string;
}

function Column({ title, drivers, emptyHint }: ColumnProps) {
  return (
    <div>
      <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </h3>
      {drivers.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">{emptyHint}</p>
      ) : (
        <ul className="m-0 divide-y divide-slate-100 p-0">
          {drivers.map((driver) => (
            <DriverRow key={driver.raw} driver={driver} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Splits the API's pre-rendered driver strings into "what's helping",
 * "what's hurting", and a Notes column for ones with no points value.
 *
 * The summary paragraph above the columns switches text based on the band
 * so the page always opens with a sentence the analyst can read out loud.
 */
export function Explanation() {
  const userId = useSelectedUser((state) => state.userId);
  const from = useSelectedUser((state) => state.from);
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <Card title="Score Explanation">
        <Skeleton height="220px" />
      </Card>
    );
  }

  if (reliability.error !== null) {
    return (
      <Card title="Score Explanation">
        <ErrorState
          title="Could not load explanations"
          description={reliability.error.message}
          onRetry={() => void reliability.refetch()}
        />
      </Card>
    );
  }

  const response = reliability.data;
  if (response === undefined) {
    return (
      <Card title="Score Explanation">
        <p className="text-sm text-slate-500">No explanation available.</p>
      </Card>
    );
  }

  const parsed = response.drivers.map(parseDriver);
  const helping = parsed.filter((driver) => driver.kind === 'positive');
  const hurting = parsed.filter((driver) => driver.kind === 'risk');
  const notes = parsed.filter((driver) => driver.kind === 'neutral');

  return (
    <Card title="Score Explanation" ariaLabel="Score Explanation">
      <p id="explanation" className="m-0 mb-4 text-sm text-slate-700">
        {BAND_SUMMARY[response.score_band]}
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Column
          title="What's helping"
          drivers={helping}
          emptyHint="No positive drivers in the window."
        />
        <Column
          title="What's hurting"
          drivers={hurting}
          emptyHint="No risk drivers in the window."
        />
      </div>
      {notes.length > 0 && (
        <div className="mt-6">
          <Column title="Notes" drivers={notes} emptyHint="" />
        </div>
      )}
    </Card>
  );
}
