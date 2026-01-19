import stateTaxData from "../data/stateTaxRates.json";
import stateBenefitData from "../data/stateTaxDeductions.json";
import planLevelInfo from "../data/plan_level_info.json";
import { FilingStatus } from "./localization";

export type StateTaxBracket = {
  min: number;
  max?: number;
  rate: number;
};

const stateBracketMap: Record<string, Partial<Record<FilingStatus, StateTaxBracket[]>>> =
  stateTaxData;

export type StateBenefitType = "deduction" | "credit" | "none";
export type StateBenefit = {
  type: StateBenefitType;
  amount: number;
  creditPercent: number;
};

export type StatePlanInfo = {
  name: string;
  hasPlan: boolean;
  parity: boolean;
  residencyRequired: boolean;
  maxAccountBalance: number | null;
};

type StateBenefitEntry = {
  benefits?: Partial<Record<FilingStatus, StateBenefit>>;
};

const stateBenefitMap = stateBenefitData as unknown as Record<string, StateBenefitEntry>;
const statePlanMap: Record<string, StatePlanInfo> = planLevelInfo;

const emptyBenefit: StateBenefit = {
  type: "none",
  amount: 0,
  creditPercent: 0,
};

const emptyPlanInfo: StatePlanInfo = {
  name: "",
  hasPlan: false,
  parity: false,
  residencyRequired: false,
  maxAccountBalance: null,
};

function normalizeStateCode(stateCode?: string) {
  return stateCode?.trim().toUpperCase() ?? "";
}

function getBenefits(entry?: StateBenefitEntry) {
  if (!entry) {
    return {};
  }
  if ("benefits" in entry && entry.benefits) {
    return entry.benefits;
  }
  return entry as Partial<Record<FilingStatus, StateBenefit>>;
}

export function getStateBenefitInfo(
  stateCode: string | undefined,
  filingStatus: FilingStatus,
  planStateCode?: string,
): StateBenefit & {
  applies: boolean;
  parity: boolean;
} {
  const normalized = normalizeStateCode(stateCode);
  if (!normalized) {
    return { ...emptyBenefit, applies: false, parity: false };
  }
  const entry = stateBenefitMap[normalized];
  const benefit = getBenefits(entry)[filingStatus] ?? emptyBenefit;
  const planInfo = statePlanMap[normalized] ?? emptyPlanInfo;
  const normalizedPlan = normalizeStateCode(planStateCode);
  const applies =
    !normalizedPlan || normalizedPlan === normalized || planInfo.parity;
  return {
    ...benefit,
    applies,
    parity: planInfo.parity,
  };
}

export const availableStateCodes = Object.keys(stateTaxData).sort();

export function getStatePlanInfo(stateCode?: string) {
  const normalized = normalizeStateCode(stateCode);
  if (!normalized) {
    return emptyPlanInfo;
  }
  return statePlanMap[normalized] ?? emptyPlanInfo;
}

function findBracket(
  brackets: StateTaxBracket[] | undefined,
  income: number,
): StateTaxBracket | undefined {
  if (!brackets || !brackets.length) {
    return undefined;
  }

  const normalizedIncome = Math.max(0, income);
  return brackets.find((bracket) => {
    const meetsLower = normalizedIncome >= bracket.min;
    const meetsUpper =
      bracket.max === undefined || normalizedIncome <= bracket.max;
    return meetsLower && meetsUpper;
  });
}

export function getStateTaxRate(
  stateCode: string | undefined,
  filingStatus: FilingStatus,
  income: number,
): number {
  if (!stateCode) {
    return 0;
  }

  const normalizedCode = stateCode.trim().toUpperCase();
  const stateData = stateBracketMap[normalizedCode];
  const brackets = stateData?.[filingStatus];
  const bracket = findBracket(brackets, income);

  return bracket?.rate ?? 0;
}
