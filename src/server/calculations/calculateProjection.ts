import federalSaversContributionLimits from "../../data/federalSaversContributionLimits.json";
import { runMonthlySimulation } from "../../core/simulation";
import { getFederalSaversCreditForStatus } from "../../lib/federalSavers";
import { getFederalRate } from "../../lib/federalTax";
import { Cadence, FilingStatus } from "../../lib/localization";
import { getStateBenefitInfo, getStateTaxRate } from "../../lib/stateTax";
import type {
  CalculationInput,
  CalculationResult,
  TaxAwareRow,
} from "../../types/calculations";

const ssiBalanceLimit = 100000;

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampMonth(month: number) {
  return Math.min(12, Math.max(1, month));
}

const isContributionDue = (cadence: Cadence, monthIndex: number) => {
  if (cadence === "monthly") {
    return true;
  }
  if (cadence === "annual") {
    return monthIndex % 12 === 0;
  }
  return false;
};

export function calculateProjection(
  input: CalculationInput,
): CalculationResult {
  const annualReturnRate = parseNumber(input.annualReturnOverride);
  const timeHorizon = Math.min(
    50,
    Math.max(1, parseNumber(input.timeHorizonYears)),
  );
  const beneficiaryUpfront = parseNumber(input.beneficiaryUpfrontContribution);
  const beneficiaryRecurring = parseNumber(
    input.beneficiaryRecurringContribution,
  );
  const monthlyWithdrawal = parseNumber(input.monthlyWithdrawalAmount);
  const monthlyStartMonth = clampMonth(
    Number.parseInt(input.monthlyWithdrawalStartMonth, 10) || 1,
  );
  const monthlyStartYear = Math.max(
    input.currentYear,
    Number.parseInt(input.monthlyWithdrawalStartYear, 10) || input.currentYear,
  );

  const recurringContributions =
    beneficiaryRecurring > 0
      ? [
          {
            amount: beneficiaryRecurring,
            cadence: input.beneficiaryRecurringCadence,
          },
        ]
      : [];

  const baseSchedule = runMonthlySimulation({
    startingBalance: parseNumber(input.startingBalance),
    additionalContribution: beneficiaryUpfront,
    recurringContributions,
    withdrawalPlan:
      input.withdrawalPlanDecision && monthlyWithdrawal > 0
        ? {
            monthlyAmount: monthlyWithdrawal,
            monthlyStartMonth,
            monthlyStartYear,
            annualAmount: 0,
            annualStartMonth: 1,
            annualStartYear: input.currentYear,
          }
        : undefined,
    annualReturnRate: annualReturnRate > 0 ? annualReturnRate / 100 : 0,
    timeHorizonYears: timeHorizon,
    planStartMonth: 1,
    planStartYear: input.currentYear,
    planMaxBalance: input.planMaxBalance,
  });

  const schedule = input.isSsiBeneficiary
    ? runMonthlySimulation({
        startingBalance: parseNumber(input.startingBalance),
        additionalContribution: beneficiaryUpfront,
        recurringContributions,
        withdrawalPlan:
          input.withdrawalPlanDecision && monthlyWithdrawal > 0
            ? {
                monthlyAmount: monthlyWithdrawal,
                monthlyStartMonth,
                monthlyStartYear,
                annualAmount: 0,
                annualStartMonth: 1,
                annualStartYear: input.currentYear,
              }
            : undefined,
        annualReturnRate: annualReturnRate > 0 ? annualReturnRate / 100 : 0,
        timeHorizonYears: timeHorizon,
        planStartMonth: 1,
        planStartYear: input.currentYear,
        planMaxBalance: input.planMaxBalance,
        ssiLimit: ssiBalanceLimit,
        enforceSsi: true,
      })
    : baseSchedule;

  const ssiExceedRow =
    baseSchedule.find((row) => row.endingBalance > ssiBalanceLimit) ?? null;
  const planMaxStopRow =
    schedule.find((entry) => entry.planMaxStop) ?? null;

  const contributionAllocations = schedule.map((row) => {
    const plannedBeneficiary =
      (row.monthIndex === 0 ? beneficiaryUpfront : 0) +
      (beneficiaryRecurring > 0 &&
      isContributionDue(input.beneficiaryRecurringCadence, row.monthIndex)
        ? beneficiaryRecurring
        : 0);
    const actualTotal = row.contributions;
    if (plannedBeneficiary <= 0 || actualTotal <= 0) {
      return 0;
    }
    const ratio = actualTotal / plannedBeneficiary;
    return plannedBeneficiary * ratio;
  });

  const fscHasAgi = input.fscEffectiveAgi > 0;
  const fscEligibilityResult =
    input.fscEligibleCriteriaMet && fscHasAgi
      ? getFederalSaversCreditForStatus(
          input.fscEffectiveFilingStatus as FilingStatus,
          input.fscEffectiveAgi,
        )
      : undefined;
  const fscCreditRate = fscEligibilityResult?.creditRate ?? 0;
  const fscContributionLimit =
    (federalSaversContributionLimits as Record<string, number>)[
      input.fscEffectiveFilingStatus
    ] ?? 0;
  const fscEligibleForCredit =
    input.fscEligibleCriteriaMet && fscHasAgi && fscCreditRate > 0;

  const earningsByYear = schedule.reduce<Record<number, number>>(
    (acc, row) => {
      acc[row.year] = (acc[row.year] ?? 0) + row.earnings;
      return acc;
    },
    {},
  );
  const contributionsByYearBySource = schedule.reduce<Record<number, number>>(
    (acc, row, index) => {
      acc[row.year] = (acc[row.year] ?? 0) + (contributionAllocations[index] ?? 0);
      return acc;
    },
    {},
  );
  const fscCreditByYear = fscEligibleForCredit
    ? Object.entries(contributionsByYearBySource).reduce<Record<number, number>>(
        (acc, [yearKey, contributions]) => {
          const year = Number(yearKey);
          const eligibleContribution = Math.min(
            contributions ?? 0,
            fscContributionLimit,
          );
          const creditAmount = eligibleContribution * fscCreditRate;
          if (creditAmount > 0) {
            acc[year] = creditAmount;
          }
          return acc;
        },
        {},
      )
    : {};

  const yearTaxData = Object.entries(earningsByYear).reduce<
    Record<
      number,
      {
        federalRate: number;
        federalTax: number;
        stateRate: number;
        stateTax: number;
        deductionTaxEffect: number;
        beneficiaryDeductionEffect: number;
      }
    >
  >((acc, [yearKey, earnings]) => {
    const year = Number(yearKey);
    const beneficiaryContributions = contributionsByYearBySource[year] ?? 0;
    const beneficiaryEarnings = earnings;

    const beneficiaryBenefit = getStateBenefitInfo(
      input.stateCode,
      input.filingStatus as FilingStatus,
      input.stateCode,
    );
    const beneficiaryDeduction =
      beneficiaryBenefit.applies && beneficiaryBenefit.type === "deduction"
        ? Math.min(beneficiaryBenefit.amount, beneficiaryContributions)
        : 0;
    const beneficiaryTaxableIncome = Math.max(
      0,
      parseNumber(input.accountAGI) + beneficiaryEarnings - beneficiaryDeduction,
    );
    const beneficiaryFederalRate = getFederalRate(
      input.filingStatus as FilingStatus,
      beneficiaryTaxableIncome,
    );
    const beneficiaryFederalTax = beneficiaryEarnings * beneficiaryFederalRate;
    const beneficiaryStateRate = getStateTaxRate(
      input.stateCode,
      input.filingStatus as FilingStatus,
      beneficiaryTaxableIncome,
    );
    const beneficiaryStateTax = beneficiaryEarnings * beneficiaryStateRate;
    const beneficiaryCreditBase =
      beneficiaryBenefit.applies && beneficiaryBenefit.type === "credit"
        ? beneficiaryContributions * beneficiaryBenefit.creditPercent
        : 0;
    const beneficiaryStateCredit =
      beneficiaryBenefit.applies && beneficiaryBenefit.type === "credit"
        ? Math.min(beneficiaryBenefit.amount, beneficiaryCreditBase)
        : 0;
    const beneficiaryDeductionEffect =
      beneficiaryDeduction * beneficiaryStateRate;

    const federalTax = beneficiaryFederalTax;
    const federalRate = beneficiaryFederalRate;
    const stateRate = beneficiaryStateRate;
    const stateCredit = beneficiaryStateCredit;
    const deductionTaxEffect = beneficiaryDeductionEffect;
    const stateTax = beneficiaryStateTax - stateCredit;
    acc[year] = {
      federalRate,
      federalTax,
      stateRate,
      stateTax,
      deductionTaxEffect,
      beneficiaryDeductionEffect,
    };
    return acc;
  }, {});

  const latestScheduleYear =
    schedule[schedule.length - 1]?.year ?? input.currentYear;
  const previousTaxYear = latestScheduleYear - 1;
  const previousYearData = yearTaxData[previousTaxYear];
  const previousYearFederalRate = previousYearData?.federalRate ?? 0.1;
  const previousYearStateRate = previousYearData?.stateRate ?? 0;

  const taxAwareSchedule: TaxAwareRow[] = schedule.map((row, index) => {
    const snapshot = yearTaxData[row.year];
    const rowFederalRate = snapshot?.federalRate ?? previousYearFederalRate;
    const rowStateRate = snapshot?.stateRate ?? previousYearStateRate;
    const decemberFederalTax = row.month === 12 ? snapshot?.federalTax ?? 0 : 0;
    const decemberStateTax = row.month === 12 ? snapshot?.stateTax ?? 0 : 0;
    const rowDeductionTaxEffect =
      row.month === 12 ? snapshot?.deductionTaxEffect ?? 0 : 0;
    const rowFederalSaversCredit =
      row.month === 12 ? fscCreditByYear[row.year] ?? 0 : 0;
    const allocation = contributionAllocations[index] ?? 0;
    return {
      ...row,
      rowFederalTax: decemberFederalTax,
      rowStateTax: decemberStateTax,
      rowFederalSaversCredit,
      rowDeductionTaxEffect,
      rowFederalRate,
      rowStateRate,
    };
  });

  return {
    schedule,
    taxAwareSchedule,
    ssiExceedRow,
    planMaxStopRow,
    fscCreditRate,
    fscEligibleForCredit,
    fscContributionLimit,
  };
}
