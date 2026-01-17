import type { AmortizationRow } from "../core/simulation";

export type TaxAwareRow = AmortizationRow & {
  rowFederalTax: number;
  rowStateTax: number;
  rowFederalSaversCredit: number;
  rowDeductionTaxEffect: number;
  rowFederalRate: number;
  rowStateRate: number;
};

export type CalculationInput = {
  startingBalance: string;
  beneficiaryUpfrontContribution: string;
  beneficiaryRecurringContribution: string;
  beneficiaryRecurringCadence: "monthly" | "annual";
  monthlyWithdrawalAmount: string;
  monthlyWithdrawalStartMonth: string;
  monthlyWithdrawalStartYear: string;
  withdrawalPlanDecision: boolean;
  annualReturnOverride: string;
  timeHorizonYears: string;
  currentYear: number;
  planMaxBalance: number | null;
  isSsiBeneficiary: boolean;
  filingStatus: string;
  accountAGI: string;
  stateCode: string;
  fscEffectiveFilingStatus: string;
  fscEffectiveAgi: number;
  fscEligibleCriteriaMet: boolean;
};

export type CalculationResult = {
  schedule: AmortizationRow[];
  taxAwareSchedule: TaxAwareRow[];
  ssiExceedRow: AmortizationRow | null;
  planMaxStopRow: AmortizationRow | null;
  fscCreditRate: number;
  fscEligibleForCredit: boolean;
  fscContributionLimit: number;
};
