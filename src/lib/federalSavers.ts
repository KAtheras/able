import creditData from "../data/federal_savers_credit_brackets.json";

import { FilingStatus } from "./localization";

export type FederalSaversBracket = {
  type?: "max" | "min" | "range" | "exact" | "raw";
  value?: number;
  min?: number;
  max?: number;
  label: string;
};

export type FederalSaversRow = {
  creditRate: number | null;
  brackets: Partial<Record<FilingStatus, FederalSaversBracket>>;
};

export type FederalSaversResult = {
  creditRate: number | null;
  bracketLabel?: string;
};

const data = creditData as unknown as FederalSaversRow[];

function matchesBracket(agi: number, bracket?: FederalSaversBracket): boolean {
  if (!bracket) {
    return false;
  }
  if (bracket.type === "max") {
    return bracket.value !== undefined && agi <= bracket.value;
  }
  if (bracket.type === "min") {
    return bracket.value !== undefined && agi > bracket.value;
  }
  if (bracket.type === "range") {
    return (
      bracket.min !== undefined &&
      bracket.max !== undefined &&
      agi >= bracket.min &&
      agi <= bracket.max
    );
  }
  if (bracket.type === "exact") {
    return bracket.value !== undefined && agi === bracket.value;
  }

  return false;
}

export function getFederalSaversCreditForStatus(
  filingStatus: FilingStatus,
  agi: number,
): FederalSaversResult | undefined {
  for (const row of data) {
    if (matchesBracket(agi, row.brackets[filingStatus])) {
      return {
        creditRate: row.creditRate,
        bracketLabel: row.brackets[filingStatus]?.label,
      };
    }
  }

  return undefined;
}
