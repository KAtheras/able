import { FilingStatus } from "./localization";
import federalTaxBrackets from "../data/federalTaxBrackets.json";

export type FederalBracket = {
  filingStatus: FilingStatus;
  rate: number;
  min: number;
  max?: number;
};

const bracketMatrix =
  federalTaxBrackets as Record<FilingStatus, FederalBracket[]>;

export function getFederalRate(
  filingStatus: FilingStatus,
  taxableIncome: number,
): number {
  const brackets = bracketMatrix[filingStatus];
  if (!brackets || Number.isNaN(taxableIncome)) {
    return 0.1;
  }

  const normalizedIncome = Math.max(0, taxableIncome);

  const match = brackets.find((bracket) => {
    const meetsLower = normalizedIncome >= bracket.min;
    const meetsUpper =
      bracket.max === undefined || normalizedIncome <= bracket.max;
    return meetsLower && meetsUpper;
  });

  return match?.rate ?? brackets[brackets.length - 1].rate;
}
