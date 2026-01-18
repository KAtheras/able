import { Cadence } from "../lib/localization";

export type RecurringContribution = {
  amount: number;
  cadence: Cadence;
};

export type WithdrawalPlan = {
  monthlyAmount: number;
  monthlyStartMonth: number;
  monthlyStartYear: number;
  annualAmount: number;
  annualStartMonth: number;
  annualStartYear: number;
};

export type SimulationInput = {
  startingBalance: number;
  additionalContribution: number;
  recurringContribution?: RecurringContribution;
  recurringContributions?: RecurringContribution[];
  withdrawalPlan?: WithdrawalPlan;
  annualReturnRate: number;
  timeHorizonYears: number;
  planStartMonth?: number;
  planStartYear?: number;
  planMaxBalance?: number | null;
  ssiLimit?: number | null;
  enforceSsi?: boolean;
  contributionEndMonth?: number | null;
  contributionEndYear?: number | null;
};

export type AmortizationRow = {
  monthIndex: number;
  month: number;
  year: number;
  contributions: number;
  earnings: number;
  withdrawals: number;
  monthlyWithdrawals: number;
  annualWithdrawals: number;
  endingBalance: number;
  monthlyRate: number;
  planMaxStop?: boolean;
};

export function annualRateToMonthly(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
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

export function runMonthlySimulation(input: SimulationInput): AmortizationRow[] {
  const months = Math.max(1, Math.round(input.timeHorizonYears * 12));
  const planStartMonth = input.planStartMonth ?? 1;
  const planStartYear = input.planStartYear ?? new Date().getFullYear();
  const monthlyRate = annualRateToMonthly(input.annualReturnRate);
  const recurringContributions = input.recurringContributions ??
    (input.recurringContribution ? [input.recurringContribution] : []);
  const planMaxBalance = input.planMaxBalance ?? null;
  const ssiLimit = input.ssiLimit ?? null;
  const enforceSsi = Boolean(input.enforceSsi && ssiLimit != null);
  let balance = input.startingBalance;
  let upfrontContributionApplied = false;
  let contributionsStopped = false;
  const contributionEndYear = input.contributionEndYear ?? null;
  const contributionEndMonth = input.contributionEndMonth ?? null;
  const hasContributionCutoff =
    contributionEndYear != null && contributionEndMonth != null;
  const contributionEndYearValue = contributionEndYear ?? 0;
  const contributionEndMonthValue = contributionEndMonth ?? 0;
  const schedule: AmortizationRow[] = [];

  for (let monthIndex = 0; monthIndex < months; monthIndex += 1) {
    const totalMonthsFromStart = planStartMonth - 1 + monthIndex;
    const rowMonth = (totalMonthsFromStart % 12) + 1;
    const rowYear =
      planStartYear + Math.floor(totalMonthsFromStart / 12);
    let planMaxStopThisRow = false;
    if (hasContributionCutoff) {
      const afterEndDate =
        rowYear > contributionEndYearValue ||
        (rowYear === contributionEndYearValue &&
          rowMonth > contributionEndMonthValue);
      if (afterEndDate) {
        contributionsStopped = true;
      }
    }
    if (planMaxBalance != null && balance >= planMaxBalance) {
      contributionsStopped = true;
      planMaxStopThisRow = true;
    }
    if (
      enforceSsi &&
      ssiLimit != null &&
      balance >= ssiLimit
    ) {
      contributionsStopped = true;
    }
    const recurringContributionThisMonth = recurringContributions.reduce(
      (sum, contribution) => {
        if (!isContributionDue(contribution.cadence, monthIndex)) {
          return sum;
        }
        return sum + contribution.amount;
      },
      0,
    );
    const canContribute =
      !contributionsStopped &&
      (planMaxBalance == null || balance < planMaxBalance);
    const upfrontContributionThisMonth =
      !upfrontContributionApplied && input.additionalContribution
        ? input.additionalContribution
        : 0;
    let contributionsThisMonth = canContribute
      ? upfrontContributionThisMonth + recurringContributionThisMonth
      : 0;
    const monthlyWithdrawals =
      input.withdrawalPlan &&
      input.withdrawalPlan.monthlyAmount > 0 &&
      (rowYear > input.withdrawalPlan.monthlyStartYear ||
        (rowYear === input.withdrawalPlan.monthlyStartYear &&
          rowMonth >= input.withdrawalPlan.monthlyStartMonth))
        ? input.withdrawalPlan.monthlyAmount
        : 0;
    const annualAmount = input.withdrawalPlan?.annualAmount ?? 0;
    const annualStartMonth =
      input.withdrawalPlan?.annualStartMonth ?? planStartMonth;
    const annualStartYear =
      input.withdrawalPlan?.annualStartYear ?? planStartYear;
    const annualWithdrawals =
      annualAmount > 0 &&
      rowMonth === annualStartMonth &&
      (rowYear > annualStartYear ||
        (rowYear === annualStartYear && rowMonth >= annualStartMonth))
        ? annualAmount
        : 0;
    const plannedWithdrawals = monthlyWithdrawals + annualWithdrawals;

    let balanceAfterContributions = balance + contributionsThisMonth;
    let earnings =
      monthIndex === 0 || balanceAfterContributions <= 0
        ? 0
        : balanceAfterContributions * monthlyRate;
    const projectedPreWithdrawalBalance =
      balanceAfterContributions + earnings;

    if (
      planMaxBalance != null &&
      canContribute &&
      projectedPreWithdrawalBalance >= planMaxBalance
    ) {
      contributionsThisMonth = 0;
      contributionsStopped = true;
      planMaxStopThisRow = true;
      balanceAfterContributions = balance;
      earnings =
        monthIndex === 0 || balanceAfterContributions <= 0
          ? 0
          : balanceAfterContributions * monthlyRate;
    }

    if (upfrontContributionThisMonth > 0 && contributionsThisMonth > 0) {
      upfrontContributionApplied = true;
    }

    balance = balanceAfterContributions + earnings;
    const ssiExcessWithdrawal =
      enforceSsi && ssiLimit != null && balance - plannedWithdrawals > ssiLimit
        ? balance - plannedWithdrawals - ssiLimit
        : 0;
    const requestedWithdrawals =
      plannedWithdrawals + ssiExcessWithdrawal;
    const withdrawalsApplied = balance > 0
      ? Math.min(requestedWithdrawals, balance)
      : 0;
    const withdrawalRatio =
      requestedWithdrawals > 0 ? withdrawalsApplied / requestedWithdrawals : 0;
    const appliedMonthlyWithdrawals =
      (monthlyWithdrawals + ssiExcessWithdrawal) * withdrawalRatio;
    const appliedAnnualWithdrawals = annualWithdrawals * withdrawalRatio;

    balance -= withdrawalsApplied;
    if (planMaxBalance != null && balance >= planMaxBalance) {
      contributionsStopped = true;
      planMaxStopThisRow = true;
    }
    if (enforceSsi && ssiLimit != null && balance >= ssiLimit) {
      contributionsStopped = true;
    }

    schedule.push({
      monthIndex,
      month: rowMonth,
      year: rowYear,
      contributions: contributionsThisMonth,
      earnings,
      withdrawals: withdrawalsApplied,
      monthlyWithdrawals: appliedMonthlyWithdrawals,
      annualWithdrawals: appliedAnnualWithdrawals,
      endingBalance: balance,
      monthlyRate,
      planMaxStop: planMaxStopThisRow,
    });
  }

  return schedule;
}
