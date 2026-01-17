import fplData from "../data/fpl.json";

export type FplEntry = {
  stateCode: string;
  year: number;
  amount: number;
};

const entries: FplEntry[] = fplData;

export const fplYears = Array.from(
  new Set(entries.map((entry) => entry.year)),
).sort((a, b) => b - a);

export const latestFplYear = fplYears[0] ?? new Date().getFullYear();

export function getFplForState(
  stateCode?: string,
  year?: number,
): FplEntry | undefined {
  const normalized = stateCode?.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  const targetYear = year ?? latestFplYear;
  return entries.find(
    (entry) => entry.stateCode === normalized && entry.year === targetYear,
  );
}

export function getFplTable(year?: number): FplEntry[] {
  const targetYear = year ?? latestFplYear;
  return entries
    .filter((entry) => entry.year === targetYear)
    .sort((a, b) => a.stateCode.localeCompare(b.stateCode));
}
