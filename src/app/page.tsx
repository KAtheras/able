"use client";

import { pdf } from "@react-pdf/renderer";
import ReactECharts from "echarts-for-react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";

import { ReportPdf, type ReportPdfProps } from "../pdf";
import annualContributionLimits from "../data/annualContributionLimits.json";
import { fplYears, getFplForState, latestFplYear } from "../lib/fpl";
import {
  availableStateCodes,
  getStatePlanInfo,
} from "../lib/stateTax";
import { getThemeForClient, themeToCssVars } from "../lib/theme";
import { uiPreviewCopy, type UiPreviewLanguage } from "../data/copy";
import type {
  CalculationInput,
  CalculationResult,
} from "../types/calculations";

const cadenceOptions = ["monthly", "annual"] as const;
const filingStatusValues = [
  "single",
  "married_joint",
  "married_separate",
  "head_of_household",
] as const;
const ssiBalanceLimit = 100000;
const averageAnnualReturnsStackSeriesOrder = [
  "state-taxes",
  "federal-taxes",
  "able-base",
  "federal-savers",
  "state-deduction",
];
const taxBenefitsPalette = ["#3A7FBE", "#F2A65A", "#6BCB77", "#C06C84"];
const averageAnnualReturnsChartRange = 0.25;

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampMonth(month: number) {
  return Math.min(12, Math.max(1, month));
}

function isRecurringContributionDue(
  cadence: "monthly" | "annual",
  monthIndex: number,
) {
  if (cadence === "monthly") {
    return true;
  }
  if (cadence === "annual") {
    return monthIndex % 12 === 0;
  }
  return false;
}

function isRowAfterContributionEndDate(
  row: { month: number; year: number },
  endMonth?: number | null,
  endYear?: number | null,
) {
  if (endMonth == null || endYear == null) {
    return false;
  }
  if (row.year > endYear) {
    return true;
  }
  if (row.year === endYear && row.month > endMonth) {
    return true;
  }
  return false;
}

function getAnnualContributionLimit(year: number) {
  const entry = (annualContributionLimits as { year: number; limit: number }[]).find(
    (item) => item.year === year,
  );
  return entry?.limit ?? annualContributionLimits[0]?.limit ?? 20000;
}

function getPlanStateCodeForClient(clientId: string) {
  if (clientId === "state-ca") {
    return "CA";
  }
  if (clientId === "state-tx") {
    return "TX";
  }
  if (clientId === "state-il") {
    return "IL";
  }
  if (clientId === "state-ut") {
    return "UT";
  }
  return null;
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const start = toRadians(startAngle);
  const end = toRadians(endAngle);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const advancedBudgetFields = [
  { key: "housing", label: "Housing" },
  { key: "healthcare", label: "Healthcare" },
  { key: "transportation", label: "Transportation" },
  { key: "education", label: "Education" },
  { key: "other", label: "Other" },
] as const;
type AdvancedBudgetKey = (typeof advancedBudgetFields)[number]["key"];

type PickerPlacement = "above" | "below";

const wheelItemClass = (isActive: boolean) =>
  `cursor-pointer rounded-lg px-3 py-1 ${
    isActive
      ? "bg-[color:var(--theme-accent)] text-white font-semibold"
      : "text-[color:var(--theme-muted)] hover:bg-[color:var(--theme-surface-1)] hover:font-semibold hover:text-[color:var(--theme-fg)]"
  }`;

const determinePickerPlacement = (
  buttonRect: DOMRect,
  pickerHeight: number,
  viewportHeight: number,
): PickerPlacement => {
  const cushion = 16;
  const availableAbove = buttonRect.top;
  const availableBelow = viewportHeight - buttonRect.bottom;
  const canFitAbove = availableAbove >= pickerHeight + cushion;
  const canFitBelow = availableBelow >= pickerHeight + cushion;
  if (canFitAbove && !canFitBelow) {
    return "above";
  }
  if (canFitBelow && !canFitAbove) {
    return "below";
  }
  return availableBelow >= availableAbove ? "below" : "above";
};

function formatCurrencyInput(value: number) {
  const fixed = Number.isFinite(value) ? value.toFixed(2) : "0";
  return fixed.replace(/\.00$/, "");
}

function calculateMonthlyIrr(cashflows: number[]) {
  const hasInflow = cashflows.some((value) => value > 0);
  const hasOutflow = cashflows.some((value) => value < 0);
  if (!hasInflow || !hasOutflow) {
    return 0;
  }
  const npv = (rate: number) => {
    if (rate <= -0.999) {
      return Number.NaN;
    }
    let total = 0;
    for (let i = 0; i < cashflows.length; i += 1) {
      total += cashflows[i] / Math.pow(1 + rate, i);
    }
    return total;
  };
  const candidateBounds: Array<[number, number]> = [
    [-0.5, 0.5],
    [-0.5, 1],
    [-0.5, 2],
    [-0.5, 5],
    [-0.5, 10],
    [-0.9, 10],
  ];
  let lower = -0.5;
  let upper = 0.5;
  let lowerValue = npv(lower);
  let upperValue = npv(upper);
  let hasBracket = false;
  for (const [candidateLower, candidateUpper] of candidateBounds) {
    const candidateLowerValue = npv(candidateLower);
    const candidateUpperValue = npv(candidateUpper);
    if (
      Number.isFinite(candidateLowerValue) &&
      Number.isFinite(candidateUpperValue) &&
      candidateLowerValue * candidateUpperValue <= 0
    ) {
      lower = candidateLower;
      upper = candidateUpper;
      lowerValue = candidateLowerValue;
      upperValue = candidateUpperValue;
      hasBracket = true;
      break;
    }
  }
  if (!hasBracket) {
    return 0;
  }
  if (lowerValue === 0) {
    return lower;
  }
  if (upperValue === 0) {
    return upper;
  }
  for (let i = 0; i < 100; i += 1) {
    const mid = (lower + upper) / 2;
    const midValue = npv(mid);
    if (Math.abs(midValue) < 1e-7) {
      return mid;
    }
    if (lowerValue * midValue < 0) {
      upper = mid;
      upperValue = midValue;
    } else {
      lower = mid;
      lowerValue = midValue;
    }
  }
  return (lower + upper) / 2;
}


export default function UiPreviewPage() {
  const [step, setStep] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("state-il");
  const [language, setLanguage] = useState<UiPreviewLanguage>("en");
  const [residencyOverride, setResidencyOverride] = useState(false);

  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [isSsiBeneficiary, setIsSsiBeneficiary] = useState(false);
  const [filingStatus, setFilingStatus] = useState("single");
  const [accountAGI, setAccountAGI] = useState("");
  const [stateCode, setStateCode] = useState(
    () =>
      getPlanStateCodeForClient(selectedClientId) ??
      availableStateCodes[0] ??
      "",
  );
  const [annualReturnOverride, setAnnualReturnOverride] = useState("6.00");
  const [timeHorizonYears, setTimeHorizonYears] = useState("2");
  const [messageOrder, setMessageOrder] = useState<string[]>([]);
  const pushMessageToTop = useCallback((key: string) => {
    setMessageOrder((prev) => [key, ...prev.filter((item) => item !== key)]);
  }, []);
  const removeMessageFromOrder = useCallback((key: string) => {
    setMessageOrder((prev) => prev.filter((item) => item !== key));
  }, []);

  const [startingBalance, setStartingBalance] = useState("0");
  const [beneficiaryUpfrontContribution, setBeneficiaryUpfrontContribution] =
    useState("0");
  const [beneficiaryRecurringContribution, setBeneficiaryRecurringContribution] =
    useState("0");
  const [beneficiaryRecurringCadence, setBeneficiaryRecurringCadence] = useState<
    (typeof cadenceOptions)[number]
  >("monthly");
  const [contributionEndMonth, setContributionEndMonth] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [contributionEndYear, setContributionEndYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [hasTouchedContributionEndDate, setHasTouchedContributionEndDate] =
    useState(false);

  type WorkToAbleDecision = "undecided" | "yes" | "no";

  const [workToAbleDecision, setWorkToAbleDecision] = useState<WorkToAbleDecision>("undecided");
  const [workToAbleHasEarnedIncome, setWorkToAbleHasEarnedIncome] =
    useState<boolean | null>(null);
  const [workToAbleHasEmployerPlan, setWorkToAbleHasEmployerPlan] =
    useState<boolean | null>(null);
  const [workToAbleEarnedIncome, setWorkToAbleEarnedIncome] = useState("0");
  const [workToAbleYear, setWorkToAbleYear] = useState(latestFplYear);
  const [workToAbleStateCode, setWorkToAbleStateCode] = useState(stateCode);

  const [monthlyWithdrawalAmount, setMonthlyWithdrawalAmount] = useState("0");
  const [monthlyWithdrawalStartMonth, setMonthlyWithdrawalStartMonth] =
    useState("01");
  const [monthlyWithdrawalStartYear, setMonthlyWithdrawalStartYear] =
    useState(new Date().getFullYear().toString());
  const [showMonthlyWithdrawalPicker, setShowMonthlyWithdrawalPicker] =
    useState(false);
  const [showContributionEndPicker, setShowContributionEndPicker] =
    useState(false);
  const [withdrawalPlanDecision, setWithdrawalPlanDecision] = useState(true);
  const [showAdvancedBudgetBreakdown, setShowAdvancedBudgetBreakdown] =
    useState(false);
  const [advancedBudgetValues, setAdvancedBudgetValues] = useState(
    () =>
      advancedBudgetFields.reduce((acc, field) => {
        acc[field.key] = "0";
        return acc;
      }, {} as Record<AdvancedBudgetKey, string>),
  );
  const [showFscEligibility, setShowFscEligibility] = useState(false);
  const [fscOutcome, setFscOutcome] = useState<"eligible" | "ineligible" | null>(
    null,
  );
  const [ssiLimitDecision, setSsiLimitDecision] = useState<
    "yes" | "no" | null
  >(null);
  const [workToAbleTestLocked, setWorkToAbleTestLocked] = useState(false);
  const [fscHasTaxLiability, setFscHasTaxLiability] =
    useState<boolean | null>(null);
  const [fscIsOver18, setFscIsOver18] = useState<boolean | null>(null);
  const [fscIsStudent, setFscIsStudent] = useState<boolean | null>(null);
  const [fscIsDependent, setFscIsDependent] = useState<boolean | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<number | "max">("max");
  const [showAnnualReturns, setShowAnnualReturns] = useState(false);
  const [rightCardView, setRightCardView] = useState<"charts" | "tables">(
    "charts",
  );
  const [reportViewMode, setReportViewMode] = useState<"default" | "table">(
    "default",
  );

  const copy = uiPreviewCopy[language];
  const timeHorizonLabel = copy.labels.timeHorizonYears.replace(
    /years/gi,
    "YRS",
  );
  const steps = copy.steps;
  const monthNames = copy.monthNamesShort;
  const monthNamesLong = copy.monthNamesLong;
  const filingStatusOptions = filingStatusValues.map((value) => ({
    value,
    label: copy.filingStatusLabels[value],
  }));
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const monthWheelRef = useRef<HTMLDivElement | null>(null);
  const yearWheelRef = useRef<HTMLDivElement | null>(null);
  const monthlyPickerRef = useRef<HTMLDivElement | null>(null);
  const monthlyPickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const contributionMonthWheelRef = useRef<HTMLDivElement | null>(null);
  const contributionYearWheelRef = useRef<HTMLDivElement | null>(null);
  const contributionPickerRef = useRef<HTMLDivElement | null>(null);
  const contributionEndTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [monthlyPickerStyle, setMonthlyPickerStyle] = useState<CSSProperties | null>(null);
  const [contributionPickerStyle, setContributionPickerStyle] = useState<CSSProperties | null>(null);
  const [hasHydrated] = useState(true);
  const [showEarnedIncomeTooltip, setShowEarnedIncomeTooltip] = useState(false);
  const earnedIncomeTooltipRef = useRef<HTMLDivElement | null>(null);
  const earnedIncomeTooltipAnchorRef = useRef<HTMLDivElement | null>(null);
  const earnedIncomeTooltipBoxRef = useRef<HTMLDivElement | null>(null);
  const [earnedIncomeTooltipStyle, setEarnedIncomeTooltipStyle] =
    useState<CSSProperties | null>(null);

  const themeVars = useMemo(() => {
    const theme = getThemeForClient(selectedClientId);
    return themeToCssVars(theme);
  }, [selectedClientId]);
  const planStateCode = getPlanStateCodeForClient(selectedClientId);
  const planMaxBalance = planStateCode
    ? getStatePlanInfo(planStateCode).maxAccountBalance ?? null
    : null;
  const planStateName = planStateCode
    ? getStatePlanInfo(planStateCode).name
    : null;

  const currentStep = steps[step];
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();
  const remainingMonthsInYear = 12 - currentMonthIndex;
  const annualLimit = getAnnualContributionLimit(currentYear);
  const horizonYears = Math.min(
    50,
    Math.max(1, Math.round(parseNumber(timeHorizonYears))),
  );
  const beneficiaryUpfrontAmount = parseNumber(beneficiaryUpfrontContribution);
  const beneficiaryRecurringAmount = parseNumber(
    beneficiaryRecurringContribution,
  );
  const beneficiaryAnnualRecurring =
    beneficiaryRecurringCadence === "monthly"
      ? beneficiaryRecurringAmount * 12
      : beneficiaryRecurringAmount;
  const currentYearRecurring =
    beneficiaryRecurringCadence === "monthly"
      ? beneficiaryRecurringAmount * remainingMonthsInYear
      : beneficiaryRecurringAmount;
  const currentYearContributionTotal =
    beneficiaryUpfrontAmount + currentYearRecurring;
  const nextFullYearContributionTotal = beneficiaryAnnualRecurring;

  const workToAbleFplEntry = getFplForState(
    workToAbleStateCode || stateCode,
    workToAbleYear,
  );
  const workToAbleIncomeAmount = parseNumber(workToAbleEarnedIncome);
  const workToAbleEligible =
    workToAbleHasEarnedIncome === true &&
    workToAbleHasEmployerPlan === false &&
    workToAbleIncomeAmount > 0 &&
    Boolean(workToAbleFplEntry);
  const workToAbleEligibilityAnswered =
    workToAbleHasEarnedIncome === false ||
    (workToAbleHasEarnedIncome === true &&
      workToAbleHasEmployerPlan !== null);
  const workToAbleTestFinalized =
    workToAbleDecision !== "undecided" && workToAbleDecision === "yes" && workToAbleEligibilityAnswered;
  const workToAbleAdditionalContribution =
    workToAbleEligible && workToAbleFplEntry
      ? Math.min(workToAbleIncomeAmount, workToAbleFplEntry.amount)
      : 0;
  const combinedLimit = annualLimit + workToAbleAdditionalContribution;
  const currentYearOverAnnualLimit = currentYearContributionTotal > annualLimit;
  const nextFullYearOverAnnualLimit = nextFullYearContributionTotal > annualLimit;
  const exceedsLimit = currentYearOverAnnualLimit || nextFullYearOverAnnualLimit;
  const currentYearOverCombinedLimit =
    currentYearContributionTotal > combinedLimit;
  const nextFullYearOverCombinedLimit =
    nextFullYearContributionTotal > combinedLimit;
  const exceedsCombinedLimit =
    currentYearOverCombinedLimit || nextFullYearOverCombinedLimit;
  const annualOverage = currentYearOverAnnualLimit
    ? currentYearContributionTotal - annualLimit
    : nextFullYearOverAnnualLimit
      ? nextFullYearContributionTotal - annualLimit
      : 0;
  const annualOveragePeriod = currentYearOverAnnualLimit
    ? "current"
    : nextFullYearOverAnnualLimit
      ? "full"
      : null;
  const combinedOverage = currentYearOverCombinedLimit
    ? currentYearContributionTotal - combinedLimit
    : nextFullYearOverCombinedLimit
      ? nextFullYearContributionTotal - combinedLimit
      : 0;
  const combinedOveragePeriod = currentYearOverCombinedLimit
    ? "current"
    : nextFullYearOverCombinedLimit
      ? "full"
      : null;
  const workToAbleOverLimit = workToAbleEligible && exceedsCombinedLimit;
  const workToAbleNotEligible = workToAbleTestFinalized && !workToAbleEligible;
  const amountOverCombinedLimit = Math.max(0, combinedOverage);
  const amountOverAnnualLimit = Math.max(0, annualOverage);
  const showWorkToAblePrompt =
    exceedsLimit &&
    exceedsCombinedLimit &&
    workToAbleDecision === "undecided" &&
    !workToAbleTestLocked;
  const workToAbleTestCompleted =
    showWorkToAblePrompt
      ? false
      : workToAbleDecision !== "undecided" || workToAbleEligibilityAnswered;
  const contributionLimitResolved =
    !exceedsCombinedLimit ||
    workToAbleDecision !== "undecided" && workToAbleDecision === "no" ||
    (workToAbleDecision !== "undecided" && workToAbleDecision === "yes" && workToAbleEligibilityAnswered);

  const prevCombinedLimitRef = useRef(combinedLimit);
  useEffect(() => {
    if (
      combinedLimit < prevCombinedLimitRef.current &&
      workToAbleDecision !== "yes"
    ) {
      setWorkToAbleTestLocked(false);
      setWorkToAbleDecision("undecided");
    }
    prevCombinedLimitRef.current = combinedLimit;
  }, [combinedLimit, workToAbleDecision]);

  useEffect(() => {
    if (!exceedsCombinedLimit && workToAbleDecision !== "yes") {
      setWorkToAbleTestLocked(false);
      setWorkToAbleDecision("undecided");
    }
  }, [exceedsCombinedLimit, workToAbleDecision]);

  useEffect(() => {
    if (!workToAbleHasEarnedIncome || workToAbleIncomeAmount <= 0) {
      setWorkToAbleHasEmployerPlan(null);
    }
  }, [workToAbleHasEarnedIncome, workToAbleIncomeAmount]);

  useEffect(() => {
    if (workToAbleDecision !== "undecided" && workToAbleDecision === "no") {
      setWorkToAbleTestLocked(true);
      return;
    }
    if (workToAbleDecision !== "undecided" && workToAbleDecision === "yes" && workToAbleEligibilityAnswered) {
      setWorkToAbleTestLocked(true);
    }
  }, [workToAbleDecision, workToAbleEligibilityAnswered]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    [copy.locale],
  );
  const currencyFormatterWhole = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [copy.locale],
  );
  const formatCurrencyForComparison = (value: number): string =>
    currencyFormatterWhole.format(value);
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [copy.locale],
  );

  const pdfFootnotes = useMemo(() => [...copy.misc.pdfFootnotes], [copy.misc.pdfFootnotes]);
  const pdfDisclosures = useMemo(() => [...copy.misc.pdfDisclosures], [copy.misc.pdfDisclosures]);


  const monthlyWithdrawalMonths = copy.monthNamesLong.map((label, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label,
  }));
  const monthlyWithdrawalMonthLabel =
    monthlyWithdrawalMonths.find(
      (month) => month.value === monthlyWithdrawalStartMonth,
    )?.label ?? copy.selectMonthPlaceholder;
  const contributionEndMonthLabel =
    monthlyWithdrawalMonths.find(
      (month) => month.value === contributionEndMonth,
    )?.label ?? copy.selectMonthPlaceholder;

  const [calcData, setCalcData] = useState<CalculationResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const fscButtonStyle = (outcome: "eligible" | "ineligible" | null) => {
    if (outcome === "eligible") {
      return {
        backgroundColor: "#059669",
        borderColor: "#047857",
        color: "#ffffff",
      };
    }
    if (outcome === "ineligible") {
      return {
        backgroundColor: "#e11d48",
        borderColor: "#be123c",
        color: "#ffffff",
      };
    }
    return undefined;
  };

  const fscEligibleCriteriaMet =
    fscHasTaxLiability === true &&
    fscIsOver18 === true &&
    fscIsStudent === false &&
    fscIsDependent === false;
  const fscDisqualifyingMessage = (() => {
    if (fscHasTaxLiability === false) {
      return copy.federalSavers.disqualifyingMessages.noTaxLiability;
    }
    if (fscIsOver18 === false) {
      return copy.federalSavers.disqualifyingMessages.under18;
    }
    if (fscIsStudent === true) {
      return copy.federalSavers.disqualifyingMessages.student;
    }
    if (fscIsDependent === true) {
      return copy.federalSavers.disqualifyingMessages.dependent;
    }
    return null;
  })();
  const fscEffectiveFilingStatus = filingStatus;
  const fscEffectiveAgi = parseNumber(accountAGI);
  const fscHasAgi = fscEffectiveAgi > 0;

  const calcInput = useMemo<CalculationInput>(() => {
    const parsedContributionEndMonth = Number.parseInt(contributionEndMonth, 10);
    const parsedContributionEndYear = Number.parseInt(contributionEndYear, 10);
    return {
      startingBalance,
      beneficiaryUpfrontContribution,
      beneficiaryRecurringContribution,
      beneficiaryRecurringCadence,
      monthlyWithdrawalAmount,
      monthlyWithdrawalStartMonth,
      monthlyWithdrawalStartYear,
      withdrawalPlanDecision,
      annualReturnOverride,
      timeHorizonYears,
      currentYear,
      planMaxBalance,
      isSsiBeneficiary,
      filingStatus,
      accountAGI,
      stateCode,
      fscEffectiveFilingStatus,
      fscEffectiveAgi,
      fscEligibleCriteriaMet,
      contributionEndMonth: Number.isFinite(parsedContributionEndMonth)
        ? parsedContributionEndMonth
        : null,
      contributionEndYear: Number.isFinite(parsedContributionEndYear)
        ? parsedContributionEndYear
        : null,
    };
  }, [
    startingBalance,
    beneficiaryUpfrontContribution,
    beneficiaryRecurringContribution,
    beneficiaryRecurringCadence,
    monthlyWithdrawalAmount,
    monthlyWithdrawalStartMonth,
    monthlyWithdrawalStartYear,
    withdrawalPlanDecision,
    annualReturnOverride,
    timeHorizonYears,
    currentYear,
    planMaxBalance,
    isSsiBeneficiary,
    filingStatus,
    accountAGI,
    stateCode,
    fscEffectiveFilingStatus,
    fscEffectiveAgi,
    fscEligibleCriteriaMet,
    contributionEndMonth,
    contributionEndYear,
  ]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    const runCalculation = async () => {
      try {
        setCalcError(null);
        const response = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(calcInput),
          signal: controller.signal,
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            message || `Calculation failed (${response.status})`,
          );
        }
        const payload = (await response.json()) as CalculationResult;
        if (isActive) {
          setCalcData(payload);
        }
      } catch (error) {
        if (!controller.signal.aborted && isActive) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to calculate results.";
          setCalcError(message);
        }
      }
    };
    runCalculation();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [calcInput]);

  const taxAwareSchedule = calcData?.taxAwareSchedule ?? [];
  const ssiExceedRow = calcData?.ssiExceedRow ?? null;
  const planMaxStopRow = calcData?.planMaxStopRow ?? null;
  const fscCreditRate = calcData?.fscCreditRate ?? 0;
  const fscEligibleForCredit = calcData?.fscEligibleForCredit ?? false;

  const parsedContributionEndMonth = Number.parseInt(contributionEndMonth, 10);
  const parsedContributionEndYear = Number.parseInt(contributionEndYear, 10);
  const contributionEndMonthValue = Number.isFinite(parsedContributionEndMonth)
    ? parsedContributionEndMonth
    : null;
  const contributionEndYearValue = Number.isFinite(parsedContributionEndYear)
    ? parsedContributionEndYear
    : null;
  const ssiContributionsActiveAtCrossing = useMemo(() => {
    if (!ssiExceedRow) {
      return false;
    }
    const recurringAmount = parseNumber(beneficiaryRecurringContribution);
    const upfrontAmount = parseNumber(beneficiaryUpfrontContribution);
    if (ssiExceedRow.monthIndex === 0 && upfrontAmount > 0) {
      return true;
    }
    if (recurringAmount <= 0) {
      return false;
    }
    if (
      isRowAfterContributionEndDate(
        ssiExceedRow as any,
        contributionEndMonthValue,
        contributionEndYearValue,
      )
    ) {
      return false;
    }
    return isRecurringContributionDue(
      beneficiaryRecurringCadence,
      ssiExceedRow.monthIndex,
    );
  }, [
    ssiExceedRow,
    beneficiaryRecurringContribution,
    beneficiaryRecurringCadence,
    beneficiaryUpfrontContribution,
    contributionEndMonthValue,
    contributionEndYearValue,
  ]);
  const fscResultMessage = (() => {
    if (fscDisqualifyingMessage) {
      return fscDisqualifyingMessage;
    }
    if (!fscEligibleCriteriaMet) {
      return copy.federalSavers.resultMessages.answerQuestions;
    }
    if (!fscHasAgi) {
      return copy.federalSavers.resultMessages.enterAgi;
    }
    if (!calcData) {
      return copy.federalSavers.resultMessages.answerQuestions;
    }
    if (fscCreditRate > 0) {
      return copy.federalSavers.resultMessages.eligible;
    }
    return copy.federalSavers.resultMessages.ineligible;
  })();
  const fscShowResult =
    fscDisqualifyingMessage !== null || fscEligibleCriteriaMet;
  const fscOutcomeResolved =
    fscDisqualifyingMessage !== null ||
    (fscEligibleCriteriaMet && fscHasAgi && fscHasTaxLiability !== null);
  const fscHasMissingInputs =
    fscHasTaxLiability === null ||
    fscIsOver18 === null ||
    fscIsStudent === null ||
    fscIsDependent === null ||
    fscEffectiveAgi <= 0;

  const runFscEligibilityCheck = () => {
    if (fscHasMissingInputs) {
      setFscOutcome("ineligible");
      setShowFscEligibility(false);
      return;
    }
    if (fscEligibleForCredit) {
      setFscOutcome("eligible");
      setShowFscEligibility(false);
      return;
    }
    if (fscOutcomeResolved && !fscEligibleForCredit) {
      setFscOutcome("ineligible");
      setShowFscEligibility(false);
    }
  };

  useEffect(() => {
    if (fscOutcome === null) {
      return;
    }
    if (fscHasMissingInputs) {
      setFscOutcome("ineligible");
      return;
    }
    if (fscOutcomeResolved) {
      setFscOutcome(fscEligibleForCredit ? "eligible" : "ineligible");
    }
  }, [
    fscEligibleForCredit,
    fscHasMissingInputs,
    fscOutcome,
    fscOutcomeResolved,
  ]);

  const maxProjectedBalance = useMemo(() => {
    return taxAwareSchedule.reduce((max, row) => {
      return Math.max(max, row.endingBalance);
    }, 0);
  }, [taxAwareSchedule]);

  const beneficiaryStateCode = stateCode;
  const residencyMismatch =
    Boolean(planStateCode) && beneficiaryStateCode !== planStateCode;
  const residencyWarningMessage = (() => {
    if (!hasHydrated || !residencyMismatch || !planStateName) {
      return null;
    }
    const planInfo = getStatePlanInfo(planStateCode as string);
    return planInfo.residencyRequired
      ? copy.residency.restrictedMessage(planStateName)
      : copy.residency.openMessage;
  })();

  useEffect(() => {
    setResidencyOverride(false);
  }, [beneficiaryStateCode, planStateCode]);
  const planMaxStopLabel = planMaxStopRow
    ? `${copy.monthNamesLong[planMaxStopRow.month - 1]} ${planMaxStopRow.year}`
    : null;
  const ssiExceedLabel = ssiExceedRow
    ? `${copy.monthNamesLong[ssiExceedRow.month - 1]} ${ssiExceedRow.year}`
    : null;
  const showSsiPrompt = Boolean(isSsiBeneficiary && ssiExceedRow);
  const planMaxContributionClamped = useMemo(() => {
    if (!planMaxBalance || !planMaxStopRow) {
      return false;
    }
    const upfrontAmount = parseNumber(beneficiaryUpfrontContribution);
    const recurringAmount = parseNumber(beneficiaryRecurringContribution);
    const cadence = beneficiaryRecurringCadence;
    let upfrontApplied = false;
    let breachIndex = -1;
    let plannedAfterBreach = false;
    let clampedAfterBreach = false;
    for (let index = 0; index < taxAwareSchedule.length; index += 1) {
      const row = taxAwareSchedule[index];
      const plannedUpfront =
        !upfrontApplied && row.monthIndex === 0 ? upfrontAmount : 0;
      if (row.monthIndex === 0 && !upfrontApplied) {
        upfrontApplied = true;
      }
      const plannedRecurring =
        recurringAmount > 0 && isRecurringContributionDue(cadence, row.monthIndex)
          ? recurringAmount
          : 0;
      const plannedTotal = plannedUpfront + plannedRecurring;
      if (row.planMaxStop && breachIndex === -1) {
        breachIndex = index;
      }
      if (breachIndex === -1) {
        continue;
      }
      if (plannedTotal > 0) {
        plannedAfterBreach = true;
        if (row.contributions < plannedTotal) {
          clampedAfterBreach = true;
        }
      }
      if (plannedAfterBreach && clampedAfterBreach) {
        break;
      }
    }
    return plannedAfterBreach && clampedAfterBreach;
  }, [
    taxAwareSchedule,
    beneficiaryUpfrontContribution,
    beneficiaryRecurringContribution,
    beneficiaryRecurringCadence,
    planMaxBalance,
    planMaxStopRow,
  ]);
  const showPlanMaxStopMessage = Boolean(
    !showSsiPrompt &&
    planMaxBalance != null &&
    planMaxStopRow &&
    planMaxStopLabel &&
    planMaxContributionClamped,
  );
  const workToAbleDeclineActive =
    workToAbleDecision !== "undecided" &&
    workToAbleDecision === "no" &&
    exceedsLimit;
  const workToAbleNotEligibleActive =
    workToAbleDecision !== "undecided" &&
    workToAbleDecision === "yes" &&
    workToAbleNotEligible &&
    exceedsLimit;
  const workToAbleOverLimitActive =
    workToAbleDecision !== "undecided" &&
    workToAbleDecision === "yes" &&
    workToAbleTestFinalized &&
    workToAbleOverLimit;
  const workToAbleInfoActive =
    workToAbleDecision !== "undecided" &&
    workToAbleDecision === "yes" &&
    !workToAbleTestFinalized;
  const applyMaxAllowedContribution = (limit: number) => {
    if (limit <= 0) {
      setBeneficiaryUpfrontContribution("0");
      setBeneficiaryRecurringContribution("0");
      return;
    }
    let nextRecurring = beneficiaryRecurringAmount;
    if (beneficiaryAnnualRecurring > limit) {
      const maxRecurring =
        beneficiaryRecurringCadence === "monthly" ? limit / 12 : limit;
      const roundedDown = Math.floor(Math.max(0, maxRecurring) * 100) / 100;
      nextRecurring = roundedDown;
      setBeneficiaryRecurringContribution(formatCurrencyInput(roundedDown));
    }
    const nextCurrentYearRecurring =
      beneficiaryRecurringCadence === "monthly"
        ? nextRecurring * remainingMonthsInYear
        : nextRecurring;
    const currentYearTotal = beneficiaryUpfrontAmount + nextCurrentYearRecurring;
    if (currentYearTotal > limit) {
      const adjustedUpfront = Math.max(0, limit - nextCurrentYearRecurring);
      const roundedUpfront = Math.floor(adjustedUpfront * 100) / 100;
      setBeneficiaryUpfrontContribution(formatCurrencyInput(roundedUpfront));
    }
  };
  const getApplyMaxNote = (limit: number) => {
    if (beneficiaryAnnualRecurring > limit) {
      return copy.workToAble.applyMaxNoteMonthlyFirst;
    }
    if (currentYearContributionTotal > limit) {
      return copy.workToAble.applyMaxNoteUpfront(
        currencyFormatter.format(limit),
      );
    }
    return null;
  };
  const getOveragePeriodNote = (period: "current" | "full" | null) => {
    if (period === "current") {
      return copy.workToAble.overagePeriodCurrentYear;
    }
    if (period === "full") {
      return copy.workToAble.overagePeriodNextFullYear;
    }
    return null;
  };
  useEffect(() => {
    if (!showAdvancedBudgetBreakdown) {
      return;
    }
    const sum = advancedBudgetFields.reduce(
      (acc, field) => acc + parseNumber(advancedBudgetValues[field.key] ?? "0"),
      0,
    );
    const formatted = formatCurrencyInput(sum);
    if (formatted !== monthlyWithdrawalAmount) {
      setMonthlyWithdrawalAmount(formatted);
    }
  }, [advancedBudgetValues, showAdvancedBudgetBreakdown, monthlyWithdrawalAmount]);
  const disableNextForLimit = step === 1 && exceedsCombinedLimit;
  const disableNextForWarning = false;
  const disableNextForResidency =
    step === 0 && residencyMismatch && !residencyOverride;
  const disableNextForAgi =
    step === 0 && parseNumber(accountAGI) <= 0;
  const disableNextForContribution =
    step === 1 &&
    beneficiaryUpfrontAmount <= 0 &&
    beneficiaryRecurringAmount <= 0;
  const disableNext =
    disableNextForLimit ||
    disableNextForWarning ||
    disableNextForResidency ||
    disableNextForAgi ||
    disableNextForContribution;


  const startYear = taxAwareSchedule[0]?.year ?? currentYear;
  const totalYearsInSchedule =
    taxAwareSchedule.length > 0
      ? taxAwareSchedule[taxAwareSchedule.length - 1].year - startYear + 1
      : 0;

  const scheduleLastYear =
    totalYearsInSchedule > 0
      ? startYear + totalYearsInSchedule - 1
      : startYear + Math.max(1, horizonYears) - 1;
  const scheduleYears = useMemo(() => {
    const years: number[] = [];
    for (let year = startYear; year <= scheduleLastYear; year += 1) {
      years.push(year);
    }
    return years;
  }, [startYear, scheduleLastYear]);
  const horizonEndDate = useMemo(() => {
    if (taxAwareSchedule.length > 0) {
      const lastRow = taxAwareSchedule[taxAwareSchedule.length - 1];
      return {
        month: String(lastRow.month).padStart(2, "0"),
        year: lastRow.year.toString(),
      };
    }
    const months = horizonYears * 12;
    const end = new Date(currentYear, currentMonthIndex + months - 1);
    return {
      month: String(end.getMonth() + 1).padStart(2, "0"),
      year: end.getFullYear().toString(),
    };
  }, [taxAwareSchedule, currentYear, currentMonthIndex, horizonYears]);
  useEffect(() => {
    if (hasTouchedContributionEndDate) {
      return;
    }
    setContributionEndMonth(horizonEndDate.month);
    setContributionEndYear(horizonEndDate.year);
  }, [hasTouchedContributionEndDate, horizonEndDate.month, horizonEndDate.year]);
  const monthlyWithdrawalYears = scheduleYears.map(String);
  const minWithdrawalYear = scheduleYears[0] ?? startYear;
  const maxWithdrawalYear = scheduleLastYear;
  const wheelItemHeight = 40;
  const wheelPadding = 1;
  const wheelVisibleItems = 5;

  const monthWheelItems = [
    ...Array.from({ length: wheelPadding }).map(() => null),
    ...monthlyWithdrawalMonths,
    ...Array.from({ length: wheelPadding }).map(() => null),
  ];
  const yearWheelItems = [
    ...Array.from({ length: wheelPadding }).map(() => null),
    ...monthlyWithdrawalYears,
    ...Array.from({ length: wheelPadding }).map(() => null),
  ];
  const contributionMonthWheelItems = monthWheelItems;
  const contributionYearWheelItems = yearWheelItems;
  const snapMonthWheel = (target: HTMLDivElement | null, index: number) => {
    if (!target) {
      return;
    }
    target.scrollTo({
      top: index * wheelItemHeight,
      behavior: "auto",
    });
  };
  const snapYearWheel = (target: HTMLDivElement | null, index: number) => {
    if (!target) {
      return;
    }
    target.scrollTo({
      top: index * wheelItemHeight,
      behavior: "auto",
    });
  };

  useEffect(() => {
    const parsed = Number.parseInt(monthlyWithdrawalStartYear, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    const clamped = Math.max(
      minWithdrawalYear,
      Math.min(maxWithdrawalYear, parsed),
    );
    if (clamped !== parsed) {
      setMonthlyWithdrawalStartYear(String(clamped));
    }
  }, [monthlyWithdrawalStartYear, minWithdrawalYear, maxWithdrawalYear]);

  useEffect(() => {
    const parsed = Number.parseInt(contributionEndYear, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    const clamped = Math.max(
      minWithdrawalYear,
      Math.min(maxWithdrawalYear, parsed),
    );
    if (clamped !== parsed) {
      setContributionEndYear(String(clamped));
    }
  }, [contributionEndYear, minWithdrawalYear, maxWithdrawalYear]);

  useLayoutEffect(() => {
    if (!showMonthlyWithdrawalPicker || typeof window === "undefined") {
      setMonthlyPickerStyle(null);
      return;
    }
    const updatePlacement = () => {
      if (!monthlyPickerButtonRef.current || !monthlyPickerRef.current) {
        return;
      }
      const buttonRect = monthlyPickerButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const fallbackHeight = wheelVisibleItems * wheelItemHeight + 32;
      const maxAvailableHeight = Math.max(
        Math.min(26 * 16, viewportHeight - 96),
        fallbackHeight,
      );
      const measuredHeight = monthlyPickerRef.current.offsetHeight;
      const pickerHeight = Math.min(
        Math.max(measuredHeight || fallbackHeight, fallbackHeight),
        maxAvailableHeight,
      );
      const placement = determinePickerPlacement(
        buttonRect,
        pickerHeight,
        viewportHeight,
      );
      const margin = 8;
      const rawTop =
        placement === "below"
          ? buttonRect.bottom + margin
          : buttonRect.top - pickerHeight - margin;
      const clampedTop = Math.max(
        margin,
        Math.min(rawTop, viewportHeight - pickerHeight - margin),
      );
      const maxWidth = Math.max(viewportWidth - margin * 2, 0);
      const targetWidth = Math.min(Math.max(buttonRect.width, 0), maxWidth);
      const rawLeft = Math.min(buttonRect.left, viewportWidth - targetWidth - margin);
      const clampedLeft = Math.max(margin, rawLeft);
      setMonthlyPickerStyle({
        position: "fixed",
        top: clampedTop,
        left: clampedLeft,
        width: targetWidth,
        zIndex: 1200,
      });
    };
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => {
      window.removeEventListener("resize", updatePlacement);
    };
  }, [
    showMonthlyWithdrawalPicker,
    wheelItemHeight,
    wheelVisibleItems,
    monthlyWithdrawalMonths.length,
    monthlyWithdrawalYears.length,
  ]);

  useLayoutEffect(() => {
    if (!showContributionEndPicker || typeof window === "undefined") {
      setContributionPickerStyle(null);
      return;
    }
    const updatePlacement = () => {
      if (!contributionEndTriggerRef.current || !contributionPickerRef.current) {
        return;
      }
      const anchorRect = contributionEndTriggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const fallbackHeight = wheelVisibleItems * wheelItemHeight + 32;
      const maxAvailableHeight = Math.max(
        Math.min(26 * 16, viewportHeight - 96),
        fallbackHeight,
      );
      const measuredHeight = contributionPickerRef.current.offsetHeight;
      const pickerHeight = Math.min(
        Math.max(measuredHeight || fallbackHeight, fallbackHeight),
        maxAvailableHeight,
      );
      const gap = 8;
      const viewportPadding = 12;
      const beforeClampTop = anchorRect.bottom + gap;
      const needsFlip =
        beforeClampTop + pickerHeight > viewportHeight - viewportPadding;
      const computedTopBeforeClamp = needsFlip
        ? anchorRect.top - pickerHeight - gap
        : beforeClampTop;
      const computedTopAfterClamp = Math.max(
        viewportPadding,
        Math.min(
          computedTopBeforeClamp,
          viewportHeight - pickerHeight - viewportPadding,
        ),
      );
      const margin = 8;
      const maxWidth = Math.max(viewportWidth - margin * 2, 0);
      const targetWidth = Math.min(Math.max(anchorRect.width, 0), maxWidth);
      const rawLeft = Math.min(anchorRect.left, viewportWidth - targetWidth - margin);
      const clampedLeft = Math.max(margin, rawLeft);
      setContributionPickerStyle({
        position: "fixed",
        top: computedTopAfterClamp,
        left: clampedLeft,
        width: targetWidth,
        zIndex: 1200,
      });
    };
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => {
      window.removeEventListener("resize", updatePlacement);
    };
  }, [
    showContributionEndPicker,
    wheelItemHeight,
    wheelVisibleItems,
    monthlyWithdrawalMonths.length,
    monthlyWithdrawalYears.length,
  ]);

  const filteredScheduleRows = useMemo(() => {
    if (selectedHorizon === "max") {
      return taxAwareSchedule;
    }
    const horizonMonths = Math.min(
      taxAwareSchedule.length,
      selectedHorizon * 12,
    );
    return taxAwareSchedule.slice(0, horizonMonths);
  }, [taxAwareSchedule, selectedHorizon]);

  const zeroBalanceEvent = useMemo(() => {
    const zeroIndex = filteredScheduleRows.findIndex(
      (row) => row.endingBalance <= 0,
    );
    if (zeroIndex === -1) {
      return null;
    }
    const row = filteredScheduleRows[zeroIndex];
    const monthsRemaining = Math.max(
      0,
      filteredScheduleRows.length - (zeroIndex + 1),
    );
    const yearsBeforeEnd = Number((monthsRemaining / 12).toFixed(1));
    return {
      row,
      label: `${monthNamesLong[row.month - 1]} ${row.year}`,
      yearsBeforeEnd,
    };
  }, [filteredScheduleRows, monthNamesLong]);
  const zeroBalanceYearsLabel = zeroBalanceEvent
    ? Number.isInteger(zeroBalanceEvent.yearsBeforeEnd)
      ? `${zeroBalanceEvent.yearsBeforeEnd}`
      : `${zeroBalanceEvent.yearsBeforeEnd.toFixed(1)}`
    : null;

  const zeroBalanceActive = Boolean(zeroBalanceEvent && !disableNext);
  const projectedBalanceActive = !zeroBalanceEvent;

  useEffect(() => {
    if (showSsiPrompt) {
      pushMessageToTop("ssi-warning");
    } else {
      removeMessageFromOrder("ssi-warning");
    }
  }, [
    showSsiPrompt,
    ssiBalanceLimit,
    ssiExceedLabel,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (showWorkToAblePrompt) {
      pushMessageToTop("work-to-able-prompt");
    } else {
      removeMessageFromOrder("work-to-able-prompt");
    }
  }, [
    showWorkToAblePrompt,
    exceedsLimit,
    exceedsCombinedLimit,
    workToAbleDecision,
    workToAbleTestLocked,
    annualLimit,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (workToAbleDeclineActive) {
      pushMessageToTop("work-to-able-decline");
    } else {
      removeMessageFromOrder("work-to-able-decline");
    }
  }, [
    workToAbleDeclineActive,
    amountOverAnnualLimit,
    annualOveragePeriod,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (workToAbleNotEligibleActive) {
      pushMessageToTop("work-to-able-not-eligible");
    } else {
      removeMessageFromOrder("work-to-able-not-eligible");
    }
  }, [
    workToAbleNotEligibleActive,
    amountOverAnnualLimit,
    annualOveragePeriod,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (workToAbleOverLimitActive) {
      pushMessageToTop("work-to-able-over-limit");
    } else {
      removeMessageFromOrder("work-to-able-over-limit");
    }
  }, [
    workToAbleOverLimitActive,
    combinedLimit,
    amountOverCombinedLimit,
    combinedOveragePeriod,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (workToAbleInfoActive) {
      pushMessageToTop("work-to-able-info");
    } else {
      removeMessageFromOrder("work-to-able-info");
    }
  }, [
    workToAbleInfoActive,
    workToAbleHasEarnedIncome,
    workToAbleHasEmployerPlan,
    workToAbleEarnedIncome,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (showPlanMaxStopMessage) {
      pushMessageToTop("plan-max-stop");
    } else {
      removeMessageFromOrder("plan-max-stop");
    }
  }, [
    showPlanMaxStopMessage,
    planMaxBalance,
    planMaxStopRow,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (showFscEligibility) {
      pushMessageToTop("fsc-eligibility");
    } else {
      removeMessageFromOrder("fsc-eligibility");
    }
  }, [
    showFscEligibility,
    fscOutcome,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  useEffect(() => {
    if (zeroBalanceActive) {
      pushMessageToTop("zero-balance");
    } else {
      removeMessageFromOrder("zero-balance");
    }
  }, [
    zeroBalanceActive,
    zeroBalanceEvent?.label,
    zeroBalanceYearsLabel,
    disableNext,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
  const scheduleByYear = useMemo(() => {
    return taxAwareSchedule.reduce<Record<number, typeof taxAwareSchedule>>(
      (acc, row) => {
        acc[row.year] ??= [];
        acc[row.year].push(row);
        return acc;
      },
      {},
    );
  }, [taxAwareSchedule]);

  const yearSummaries = useMemo(() => {
    return Object.entries(scheduleByYear)
      .map(([yearKey, rows]) => {
        const totals = rows.reduce(
          (acc, row) => {
            acc.contributions += row.contributions;
            acc.monthlyWithdrawals += row.monthlyWithdrawals;
            acc.earnings += row.earnings;
            acc.endingBalance = row.endingBalance;
            acc.federalTax += row.rowFederalTax;
            acc.stateTax += row.rowStateTax;
            acc.federalSaversCredit += row.rowFederalSaversCredit;
            acc.stateDeductionCredit += row.rowDeductionTaxEffect;
            return acc;
          },
          {
            contributions: 0,
            monthlyWithdrawals: 0,
            earnings: 0,
            endingBalance: 0,
            federalTax: 0,
            stateTax: 0,
            federalSaversCredit: 0,
            stateDeductionCredit: 0,
          },
        );
        return { year: Number(yearKey), rows, totals };
      })
      .sort((a, b) => a.year - b.year);
  }, [scheduleByYear]);

  const filteredMonthlyTotals = useMemo(() => {
    return filteredScheduleRows.reduce(
      (acc, row) => {
        acc.contributions += row.contributions;
        acc.earnings += row.earnings;
        acc.monthlyWithdrawals += row.monthlyWithdrawals;
        acc.federalTax += row.rowFederalTax;
        acc.stateTax += row.rowStateTax;
        acc.federalSaversCredit += row.rowFederalSaversCredit;
        acc.stateDeductionCredit += row.rowDeductionTaxEffect;
        return acc;
      },
      {
        contributions: 0,
        earnings: 0,
        monthlyWithdrawals: 0,
        federalTax: 0,
        stateTax: 0,
        federalSaversCredit: 0,
        stateDeductionCredit: 0,
      },
    );
  }, [filteredScheduleRows]);

  const availableHorizons = useMemo(() => {
    const totalYears = Math.floor(taxAwareSchedule.length / 12);
    const options = [1, 3, 5, 10, 20, 40].filter(
      (value) => value <= totalYears,
    );
    return [...options, "max"] as const;
  }, [taxAwareSchedule.length]);
  const totalYearsForDisplay = useMemo(() => {
    return Math.max(1, Math.floor(taxAwareSchedule.length / 12));
  }, [taxAwareSchedule.length]);

  useEffect(() => {
    if (selectedHorizon === "max") {
      return;
    }
    const totalYears = Math.floor(taxAwareSchedule.length / 12);
    if (selectedHorizon > totalYears) {
      setSelectedHorizon("max");
    }
  }, [selectedHorizon, taxAwareSchedule.length]);

  const reportTotals = useMemo(() => {
    const startingBalanceValue = parseNumber(startingBalance);
    const totalContributions = filteredMonthlyTotals.contributions;
    const totalEarnings = filteredMonthlyTotals.earnings;
    const totalWithdrawals = filteredMonthlyTotals.monthlyWithdrawals;
    const endingBalance =
      startingBalanceValue +
      totalContributions +
      totalEarnings -
      totalWithdrawals;
    return {
      startingBalance: startingBalanceValue,
      totalContributions,
      totalEarnings,
      totalWithdrawals,
      endingBalance,
    };
  }, [filteredMonthlyTotals, startingBalance]);
  useEffect(() => {
    if (projectedBalanceActive) {
      pushMessageToTop("projected-balance");
    } else {
      removeMessageFromOrder("projected-balance");
    }
  }, [
    projectedBalanceActive,
    reportTotals.endingBalance,
    language,
    pushMessageToTop,
    removeMessageFromOrder,
  ]);
const taxableTaxAmount =
  filteredMonthlyTotals.federalTax + filteredMonthlyTotals.stateTax;
const taxableEndingAfterTaxes = reportTotals.endingBalance - taxableTaxAmount;
const taxableTotalEconomicValue =
  reportTotals.totalEarnings - taxableTaxAmount;
const ableTaxSavings =
  Math.abs(filteredMonthlyTotals.federalSaversCredit) +
  Math.abs(filteredMonthlyTotals.stateDeductionCredit);
const comparisonRows = useMemo(
  () => [
    {
      label: copy.ableVsTaxable.startingBalance,
      able: reportTotals.startingBalance,
      taxable: reportTotals.startingBalance,
    },
    {
      label: copy.ableVsTaxable.contributions,
      able: reportTotals.totalContributions,
      taxable: reportTotals.totalContributions,
    },
    {
      label: copy.ableVsTaxable.withdrawals,
      able: -reportTotals.totalWithdrawals,
      taxable: -reportTotals.totalWithdrawals,
    },
    {
      label: copy.ableVsTaxable.investmentReturns,
      able: reportTotals.totalEarnings,
      taxable: reportTotals.totalEarnings,
    },
    {
      label: copy.ableVsTaxable.accountEndingBalance,
      able: reportTotals.endingBalance,
      taxable: reportTotals.endingBalance,
    },
    {
      label: copy.ableVsTaxable.taxes,
      able: ableTaxSavings,
      taxable: -taxableTaxAmount,
    },
    {
      label: copy.ableVsTaxable.endingValueAfterTaxes,
      able: reportTotals.endingBalance + ableTaxSavings,
      taxable: taxableEndingAfterTaxes,
    },
    {
      label: copy.ableVsTaxable.totalEconomicValueCreated,
      able: reportTotals.totalEarnings + ableTaxSavings,
      taxable: taxableTotalEconomicValue,
    },
  ],
  [
    copy,
    reportTotals,
    ableTaxSavings,
    taxableTaxAmount,
    taxableEndingAfterTaxes,
    taxableTotalEconomicValue,
  ],
);
  const comparisonLabelClassName =
    "text-[0.9rem] font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-fg)] opacity-80";
  const comparisonPillClassName =
    "w-full rounded-2xl border border-[color:rgba(15,23,42,0.08)] bg-[color:var(--theme-surface-1)] px-5 py-1.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:border-[color:rgba(15,23,42,0.15)]";
  const ableCashflows = useMemo(() => {
    if (filteredScheduleRows.length === 0) {
      return [];
    }
    const flows = Array.from({ length: filteredScheduleRows.length + 1 }).map(
      () => 0,
    );
    flows[1] -= reportTotals.startingBalance;
    filteredScheduleRows.forEach((row, index) => {
      if (row.monthIndex === 0) {
        flows[index + 1] -= row.contributions;
      } else {
        flows[index] -= row.contributions;
      }
      flows[index + 1] +=
        row.withdrawals +
        row.rowFederalSaversCredit +
        row.rowDeductionTaxEffect;
    });
    flows[flows.length - 1] += reportTotals.endingBalance;
    return flows;
  }, [filteredScheduleRows, reportTotals.endingBalance, reportTotals.startingBalance]);
  const baseCashflows = useMemo(() => {
    if (filteredScheduleRows.length === 0) {
      return [];
    }
    const flows = Array.from({ length: filteredScheduleRows.length + 1 }).map(
      () => 0,
    );
    flows[1] -= reportTotals.startingBalance;
    filteredScheduleRows.forEach((row, index) => {
      if (row.monthIndex === 0) {
        flows[index + 1] -= row.contributions;
      } else {
        flows[index] -= row.contributions;
      }
      flows[index + 1] += row.withdrawals;
    });
    flows[flows.length - 1] += reportTotals.endingBalance;
    return flows;
  }, [filteredScheduleRows, reportTotals.endingBalance, reportTotals.startingBalance]);
  const federalSaversCashflows = useMemo(() => {
    if (baseCashflows.length === 0) {
      return [];
    }
    const flows = [...baseCashflows];
    filteredScheduleRows.forEach((row, index) => {
      flows[index + 1] += row.rowFederalSaversCredit;
    });
    return flows;
  }, [baseCashflows, filteredScheduleRows]);
  const stateDeductionCashflows = useMemo(() => {
    if (baseCashflows.length === 0) {
      return [];
    }
    const flows = [...baseCashflows];
    filteredScheduleRows.forEach((row, index) => {
      flows[index + 1] += row.rowDeductionTaxEffect;
    });
    return flows;
  }, [baseCashflows, filteredScheduleRows]);
  const taxableCashflows = useMemo(() => {
    if (filteredScheduleRows.length === 0) {
      return [];
    }
    const flows = Array.from({ length: filteredScheduleRows.length + 1 }).map(
      () => 0,
    );
    flows[1] -= reportTotals.startingBalance;
    filteredScheduleRows.forEach((row, index) => {
      if (row.monthIndex === 0) {
        flows[index + 1] -= row.contributions;
      } else {
        flows[index] -= row.contributions;
      }
      flows[index + 1] += row.withdrawals - row.rowFederalTax - row.rowStateTax;
    });
    flows[flows.length - 1] += reportTotals.endingBalance;
    return flows;
  }, [filteredScheduleRows, reportTotals.endingBalance, reportTotals.startingBalance]);
  const federalTaxCashflows = useMemo(() => {
    if (filteredScheduleRows.length === 0) {
      return [];
    }
    const flows = Array.from({ length: filteredScheduleRows.length + 1 }).map(
      () => 0,
    );
    flows[1] -= reportTotals.startingBalance;
    filteredScheduleRows.forEach((row, index) => {
      if (row.monthIndex === 0) {
        flows[index + 1] -= row.contributions;
      } else {
        flows[index] -= row.contributions;
      }
      flows[index + 1] += row.withdrawals - row.rowFederalTax;
    });
    flows[flows.length - 1] += reportTotals.endingBalance;
    return flows;
  }, [filteredScheduleRows, reportTotals.endingBalance, reportTotals.startingBalance]);
  const stateTaxCashflows = useMemo(() => {
    if (filteredScheduleRows.length === 0) {
      return [];
    }
    const flows = Array.from({ length: filteredScheduleRows.length + 1 }).map(
      () => 0,
    );
    flows[1] -= reportTotals.startingBalance;
    filteredScheduleRows.forEach((row, index) => {
      if (row.monthIndex === 0) {
        flows[index + 1] -= row.contributions;
      } else {
        flows[index] -= row.contributions;
      }
      flows[index + 1] += row.withdrawals - row.rowStateTax;
    });
    flows[flows.length - 1] += reportTotals.endingBalance;
    return flows;
  }, [filteredScheduleRows, reportTotals.endingBalance, reportTotals.startingBalance]);
  const monthlyIrrAble = useMemo(
    () => calculateMonthlyIrr(ableCashflows),
    [ableCashflows],
  );
  const monthlyIrrTaxable = useMemo(
    () => calculateMonthlyIrr(taxableCashflows),
    [taxableCashflows],
  );
  const monthlyIrrBase = useMemo(
    () => calculateMonthlyIrr(baseCashflows),
    [baseCashflows],
  );
  const monthlyIrrFederalSavers = useMemo(
    () => calculateMonthlyIrr(federalSaversCashflows),
    [federalSaversCashflows],
  );
  const monthlyIrrStateDeduction = useMemo(
    () => calculateMonthlyIrr(stateDeductionCashflows),
    [stateDeductionCashflows],
  );
  const monthlyIrrFederalTaxes = useMemo(
    () => calculateMonthlyIrr(federalTaxCashflows),
    [federalTaxCashflows],
  );
  const monthlyIrrStateTaxes = useMemo(
    () => calculateMonthlyIrr(stateTaxCashflows),
    [stateTaxCashflows],
  );
  const averageAnnualReturnTaxable = Math.pow(1 + monthlyIrrTaxable, 12) - 1;
  const averageAnnualReturnBase = Math.pow(1 + monthlyIrrBase, 12) - 1;
  const averageAnnualReturnAble = averageAnnualReturnBase;
  const averageAnnualReturnFederalSavers =
    Math.pow(1 + monthlyIrrFederalSavers, 12) - 1;
  const averageAnnualReturnStateDeduction =
    Math.pow(1 + monthlyIrrStateDeduction, 12) - 1;
  const averageAnnualReturnFederalTaxes =
    Math.pow(1 + monthlyIrrFederalTaxes, 12) - 1;
  const averageAnnualReturnStateTaxes =
    Math.pow(1 + monthlyIrrStateTaxes, 12) - 1;
  const averageAnnualReturnFederalSaversImpact =
    averageAnnualReturnFederalSavers - averageAnnualReturnBase;
  const averageAnnualReturnStateDeductionImpact =
    averageAnnualReturnStateDeduction - averageAnnualReturnBase;
  const hasFederalSaversImpact =
    Math.abs(averageAnnualReturnFederalSaversImpact) > 0.000001;
  const hasStateDeductionImpact =
    Math.abs(averageAnnualReturnStateDeductionImpact) > 0.000001;
  const averageAnnualReturnAbleTotal =
    averageAnnualReturnBase +
    (hasStateDeductionImpact ? averageAnnualReturnStateDeductionImpact : 0) +
    (hasFederalSaversImpact ? averageAnnualReturnFederalSaversImpact : 0);
  const averageAnnualReturnFederalTaxesImpact =
    averageAnnualReturnFederalTaxes - averageAnnualReturnBase;
  const averageAnnualReturnStateTaxesImpact =
    averageAnnualReturnStateTaxes - averageAnnualReturnBase;

  const averageAnnualReturnsTableItems = useMemo(
    () => [
      {
        key: "able-total",
        label: copy.report.cards.averageAnnualReturnsTable.items.ableTotal,
        value: averageAnnualReturnAbleTotal,
        sign: "",
        color: "#2E8BC0",
      },
      {
        key: "state-deduction",
        label: copy.report.cards.averageAnnualReturnsTable.items.stateDeduction,
        value: averageAnnualReturnStateDeductionImpact,
        sign: "+",
        color: taxBenefitsPalette[3],
      },
      {
        key: "federal-savers",
        label: copy.report.cards.averageAnnualReturnsTable.items.federalSavers,
        value: averageAnnualReturnFederalSaversImpact,
        sign: "+",
        color: taxBenefitsPalette[2],
      },
      {
        key: "able-base",
        label: copy.report.cards.averageAnnualReturnsTable.items.ableBase,
        value: averageAnnualReturnBase,
        sign: "",
        color: "#7F8C8D",
      },
      {
        key: "federal-taxes",
        label: copy.report.cards.averageAnnualReturnsTable.items.federalTaxesOnEarnings,
        value: averageAnnualReturnFederalTaxesImpact,
        sign: "-",
        color: taxBenefitsPalette[0],
      },
      {
        key: "state-taxes",
        label: copy.report.cards.averageAnnualReturnsTable.items.stateTaxesOnEarnings,
        value: averageAnnualReturnStateTaxesImpact,
        sign: "-",
        color: taxBenefitsPalette[1],
      },
      {
        key: "taxable",
        label: copy.report.cards.averageAnnualReturnsTable.items.taxable,
        value: averageAnnualReturnTaxable,
        sign: "",
        color: "#7A6FF0",
      },
    ],
    [
      averageAnnualReturnAbleTotal,
      averageAnnualReturnBase,
      averageAnnualReturnFederalSaversImpact,
      averageAnnualReturnStateDeductionImpact,
      averageAnnualReturnFederalTaxesImpact,
      averageAnnualReturnStateTaxesImpact,
      averageAnnualReturnTaxable,
      copy.report.cards.averageAnnualReturnsTable.items,
    ],
  );

  const averageAnnualReturnsStackData = useMemo(
    () => [
      {
        key: "state-deduction",
        label: copy.report.cards.averageAnnualReturnsTable.items.stateDeduction,
        value: averageAnnualReturnStateDeductionImpact,
        color: taxBenefitsPalette[3],
      },
      {
        key: "federal-savers",
        label: copy.report.cards.averageAnnualReturnsTable.items.federalSavers,
        value: averageAnnualReturnFederalSaversImpact,
        color: taxBenefitsPalette[2],
      },
      {
        key: "able-base",
        label: copy.report.cards.averageAnnualReturnsTable.items.ableBase,
        value: averageAnnualReturnBase,
        color: "#7F8C8D",
      },
      {
        key: "federal-taxes",
        label: copy.report.cards.averageAnnualReturnsTable.items.federalTaxesOnEarnings,
        value: averageAnnualReturnFederalTaxesImpact,
        color: taxBenefitsPalette[0],
      },
      {
        key: "state-taxes",
        label: copy.report.cards.averageAnnualReturnsTable.items.stateTaxesOnEarnings,
        value: averageAnnualReturnStateTaxesImpact,
        color: taxBenefitsPalette[1],
      },
    ],
    [
      averageAnnualReturnBase,
      averageAnnualReturnFederalSaversImpact,
      averageAnnualReturnStateDeductionImpact,
      averageAnnualReturnFederalTaxesImpact,
      averageAnnualReturnStateTaxesImpact,
      copy.report.cards.averageAnnualReturnsTable.items,
    ],
  );
  const averageAnnualReturnsStackLegend = useMemo(
    () =>
      averageAnnualReturnsStackData.map((step) => ({
        key: step.key,
        label: step.label,
        color: step.color,
        value: step.value,
      })),
    [averageAnnualReturnsStackData],
  );
  const averageAnnualReturnsStackSeries = useMemo(
    () =>
      averageAnnualReturnsStackSeriesOrder
        .map((key) =>
          averageAnnualReturnsStackData.find((step) => step.key === key),
        )
        .filter((step): step is typeof averageAnnualReturnsStackData[number] =>
          Boolean(step),
        ),
    [averageAnnualReturnsStackData],
  );
  const positiveStackSum = averageAnnualReturnsStackData
    .filter((step) => step.value > 0)
    .reduce((sum, step) => sum + step.value, 0);
  const negativeStackSum = averageAnnualReturnsStackData
    .filter((step) => step.value < 0)
    .reduce((sum, step) => sum + Math.abs(step.value), 0);
  const positiveScale =
    positiveStackSum > 0 ? averageAnnualReturnsChartRange / positiveStackSum : 0;
  const negativeScale =
    negativeStackSum > 0 ? averageAnnualReturnsChartRange / negativeStackSum : 0;
  const averageAnnualReturnsStackOption = useMemo(() => {
    return {
      tooltip: {
        trigger: "item",
        formatter: (params: {
          seriesName: string;
          value: number;
          data: { actual: number };
        }) => {
          const actual = params.data?.actual ?? params.value;
          return `${params.seriesName}: ${percentFormatter.format(actual)}`;
        },
      },
      grid: {
        left: "60%",
        right: "6%",
        top: "4%",
        bottom: "4%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: [""],
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      },
      yAxis: {
        type: "value",
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: -averageAnnualReturnsChartRange,
        max: averageAnnualReturnsChartRange,
      },
      series: averageAnnualReturnsStackSeries.map((step) => {
        const scaledValue =
          step.value >= 0
            ? step.value * positiveScale
            : step.value * negativeScale;
        return {
          name: step.label,
          type: "bar",
          stack: "returns",
          barWidth: "80%",
          emphasis: { focus: "series" },
          itemStyle: { color: step.color },
          data: [{ value: scaledValue, actual: step.value }],
        };
      }),
    };
  }, [
    averageAnnualReturnsStackSeries,
    percentFormatter,
    positiveScale,
    negativeScale,
  ]);


  const taxBenefitsItems = useMemo(() => {
    const totals = {
      federalTax: filteredMonthlyTotals.federalTax,
      stateTax: filteredMonthlyTotals.stateTax,
      federalSavers: filteredMonthlyTotals.federalSaversCredit,
      stateDeduction: filteredMonthlyTotals.stateDeductionCredit,
    };
    return [
      {
        key: "federalTax",
        label: copy.report.taxBenefits.items.federalTax.label,
        note: copy.report.taxBenefits.items.federalTax.note,
        value: Math.abs(totals.federalTax),
        color: taxBenefitsPalette[0],
      },
      {
        key: "stateTax",
        label: copy.report.taxBenefits.items.stateTax.label,
        note: copy.report.taxBenefits.items.stateTax.note,
        value: Math.abs(totals.stateTax),
        color: taxBenefitsPalette[1],
      },
      {
        key: "federalSavers",
        label: copy.report.taxBenefits.items.federalSavers.label,
        note: copy.report.taxBenefits.items.federalSavers.note,
        value: Math.abs(totals.federalSavers),
        color: taxBenefitsPalette[2],
      },
      {
        key: "stateDeduction",
        label: copy.report.taxBenefits.items.stateDeduction.label,
        note: copy.report.taxBenefits.items.stateDeduction.note,
        value: Math.abs(totals.stateDeduction),
        color: taxBenefitsPalette[3],
      },
    ];
  }, [filteredMonthlyTotals, copy.report.taxBenefits.items]);
  const taxBenefitsTableItems = useMemo(() => {
    const order = ["federalTax", "stateTax", "federalSavers", "stateDeduction"];
    const byKey = new Map(taxBenefitsItems.map((item) => [item.key, item]));
    return order
      .map((key) => byKey.get(key))
      .filter(
        (item): item is (typeof taxBenefitsItems)[number] =>
          item != null && item.value > 0,
      );
  }, [taxBenefitsItems]);
  const taxBenefitsLegendItems = useMemo(
    () => taxBenefitsItems.filter((item) => item.value > 0),
    [taxBenefitsItems],
  );
  const taxBenefitsPieData = useMemo(
    () =>
      taxBenefitsItems
        .filter((item) => item.value > 0)
        .map((item) => ({
          name: item.label,
          value: item.value,
          itemStyle: { color: item.color },
        })),
    [taxBenefitsItems],
  );
  const totalTaxBenefits = taxBenefitsItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const taxBenefitsPieOption = useMemo(() => {
    if (taxBenefitsPieData.length === 0) {
      return null;
    }
    return {
      tooltip: {
        trigger: "item",
        valueFormatter: (value: number) =>
          currencyFormatterWhole.format(value),
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: true,
          padAngle: 2,
          center: ["50%", "47%"],
          itemStyle: {
            borderRadius: 3,
            borderWidth: 0,
          },
          label: {
            show: true,
            position: "outside",
            alignTo: "labelLine",
            edgeDistance: 2,
            distanceToLabelLine: 6,
            fontSize: 22,
            fontWeight: 500,
            color: "var(--theme-accent)",
            fontFamily: "var(--theme-font-family)",
            formatter: (params: { data: { value: number } }) =>
              currencyFormatterWhole.format(params.data.value),
          },
          labelLine: {
            show: true,
            length: 18,
            length2: 28,
            lineStyle: {
              color: "var(--theme-border)",
            },
          },
          emphasis: {
            label: {
              show: true,
              color: "var(--theme-accent)",
              fontSize: 22,
              fontWeight: 500,
              fontFamily: "var(--theme-font-family)",
              formatter: (params: { data: { value: number } }) =>
                currencyFormatterWhole.format(params.data.value),
            },
          },
          labelLayout: { hideOverlap: true, moveOverlap: "shiftY", distance: 8 },
          data: taxBenefitsPieData,
        },
      ],
    };
  }, [taxBenefitsPieData, currencyFormatterWhole]);
  const totalTaxBenefitsItem = useMemo(
    () => ({
      label: copy.report.cards.taxBenefits.label,
      value: totalTaxBenefits,
    }),
    [copy.report.cards.taxBenefits.label, totalTaxBenefits],
  );

  const pdfReportProps = useMemo<ReportPdfProps>(() => {
    const summaryCards = [
      {
        label: copy.report.cards.startingBalance.label,
        value: currencyFormatterWhole.format(reportTotals.startingBalance),
        note: copy.report.cards.startingBalance.note,
      },
      {
        label: copy.report.cards.totalContributions.label,
        value: currencyFormatterWhole.format(reportTotals.totalContributions),
        note: copy.report.cards.totalContributions.note,
      },
      {
        label: copy.report.cards.investmentEarnings.label,
        value: currencyFormatterWhole.format(reportTotals.totalEarnings),
        note: copy.report.cards.investmentEarnings.note,
      },
      {
        label: copy.report.cards.totalWithdrawals.label,
        value: currencyFormatterWhole.format(reportTotals.totalWithdrawals),
        note: copy.report.cards.totalWithdrawals.note,
      },
      {
        label: copy.report.cards.endingBalance.label,
        value: currencyFormatterWhole.format(reportTotals.endingBalance),
        note: copy.report.cards.endingBalance.note,
      },
    ];
    const taxBenefits = {
      items: taxBenefitsItems.map((item) => ({
        label: item.label,
        value: currencyFormatterWhole.format(item.value),
      })),
      totalLabel: copy.report.cards.taxBenefits.label,
      totalValue: currencyFormatterWhole.format(totalTaxBenefitsItem.value),
    };
    const rowsByYear = filteredScheduleRows.reduce<Record<number, {
      contributions: number;
      withdrawals: number;
      earnings: number;
      balance: number;
      federalTax: number;
      stateTax: number;
      federalSaversCredit: number;
      stateTaxDeductionCredit: number;
    }>>((acc, row) => {
      if (!acc[row.year]) {
        acc[row.year] = {
          contributions: 0,
          withdrawals: 0,
          earnings: 0,
          balance: 0,
          federalTax: 0,
          stateTax: 0,
          federalSaversCredit: 0,
          stateTaxDeductionCredit: 0,
        };
      }
      acc[row.year].contributions += row.contributions;
      acc[row.year].withdrawals += row.withdrawals;
      acc[row.year].earnings += row.earnings;
      acc[row.year].federalTax += row.rowFederalTax;
      acc[row.year].stateTax += row.rowStateTax;
      acc[row.year].federalSaversCredit += row.rowFederalSaversCredit;
      acc[row.year].stateTaxDeductionCredit += row.rowDeductionTaxEffect;
      if (row.month === 12) {
        acc[row.year].balance = row.endingBalance;
      }
      return acc;
    }, {});
    const amortizationRows = Object.entries(rowsByYear)
      .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
      .map(([year, totals]) => ({
        period: year,
        contributions: currencyFormatterWhole.format(totals.contributions),
        withdrawals: currencyFormatterWhole.format(totals.withdrawals),
        earnings: currencyFormatterWhole.format(totals.earnings),
        balance: currencyFormatterWhole.format(totals.balance),
        federalTax: currencyFormatterWhole.format(totals.federalTax),
        stateTax: currencyFormatterWhole.format(totals.stateTax),
        federalSaversCredit: currencyFormatterWhole.format(totals.federalSaversCredit),
        stateTaxDeductionCredit: currencyFormatterWhole.format(
          totals.stateTaxDeductionCredit,
        ),
      }));
    return {
      logoSrc:
        selectedClientId === "state-il" ? "/clients/state-il/logo.png" : undefined,
      clientName: copy.header.clientName,
      reportTitle: copy.report.title,
      reportDate: new Date().toLocaleDateString(copy.locale),
      summaryCards,
      taxBenefits,
      amortizationRows,
      footnotes: pdfFootnotes,
      disclosures: pdfDisclosures,
    };
  }, [
    copy.header.clientName,
    copy.locale,
    copy.monthNamesShort,
    copy.report.cards.endingBalance.label,
    copy.report.cards.endingBalance.note,
    copy.report.cards.investmentEarnings.label,
    copy.report.cards.investmentEarnings.note,
    copy.report.cards.startingBalance.label,
    copy.report.cards.startingBalance.note,
    copy.report.cards.taxBenefits.label,
    copy.report.cards.totalContributions.label,
    copy.report.cards.totalContributions.note,
    copy.report.cards.totalWithdrawals.label,
    copy.report.cards.totalWithdrawals.note,
    copy.report.title,
    currencyFormatterWhole,
    filteredScheduleRows,
    pdfDisclosures,
    pdfFootnotes,
    reportTotals.endingBalance,
    reportTotals.startingBalance,
    reportTotals.totalContributions,
    reportTotals.totalEarnings,
    reportTotals.totalWithdrawals,
    selectedClientId,
    taxBenefitsItems,
    totalTaxBenefitsItem.value,
  ]);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) {
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await pdf(<ReportPdf {...pdfReportProps} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `able-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadAmortizationCsv = useCallback(() => {
    if (filteredScheduleRows.length === 0) {
      return;
    }
    const headers = [
      copy.table.month,
      copy.table.contributions,
      copy.table.monthlyWithdrawals,
      copy.table.earnings,
      copy.table.balance,
      copy.table.federalTax,
      copy.table.stateTax,
      copy.table.federalSaversCredit,
      copy.table.stateTaxDeductionCredit,
    ];
    const rows = filteredScheduleRows.map((row) => [
      `${monthNames[row.month - 1]} ${row.year}`,
      currencyFormatterWhole.format(row.contributions),
      currencyFormatterWhole.format(row.monthlyWithdrawals),
      currencyFormatter.format(row.earnings),
      currencyFormatter.format(row.endingBalance),
      currencyFormatter.format(row.rowFederalTax),
      currencyFormatter.format(row.rowStateTax),
      currencyFormatter.format(row.rowFederalSaversCredit),
      currencyFormatter.format(row.rowDeductionTaxEffect),
    ]);
    const csvLines = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((values) => values.map(escapeCsvValue).join(",")),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `able-amortization-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [
    filteredScheduleRows,
    monthNames,
    currencyFormatterWhole,
    currencyFormatter,
    copy.table,
  ]);

  const toggleYearExpanded = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!showMonthlyWithdrawalPicker) {
      return;
    }
    const monthIndex = Math.max(
      0,
      monthlyWithdrawalMonths.findIndex(
        (month) => month.value === monthlyWithdrawalStartMonth,
      ),
    );
    const yearIndex = Math.max(
      0,
      monthlyWithdrawalYears.findIndex(
        (year) => year === monthlyWithdrawalStartYear,
      ),
    );
    if (monthWheelRef.current) {
      monthWheelRef.current.scrollTo({
        top: (monthIndex + wheelPadding) * wheelItemHeight,
      });
    }
    if (yearWheelRef.current) {
      yearWheelRef.current.scrollTo({
        top: (yearIndex + wheelPadding) * wheelItemHeight,
      });
    }
  }, [
    showMonthlyWithdrawalPicker,
    monthlyWithdrawalMonths,
    monthlyWithdrawalYears,
    monthlyWithdrawalStartMonth,
    monthlyWithdrawalStartYear,
  ]);

  useEffect(() => {
    if (!showContributionEndPicker) {
      return;
    }
    const monthIndex = Math.max(
      0,
      monthlyWithdrawalMonths.findIndex(
        (month) => month.value === contributionEndMonth,
      ),
    );
    const yearIndex = Math.max(
      0,
      monthlyWithdrawalYears.findIndex((year) => year === contributionEndYear),
    );
    if (contributionMonthWheelRef.current) {
      contributionMonthWheelRef.current.scrollTo({
        top: (monthIndex + wheelPadding) * wheelItemHeight,
      });
    }
    if (contributionYearWheelRef.current) {
      contributionYearWheelRef.current.scrollTo({
        top: (yearIndex + wheelPadding) * wheelItemHeight,
      });
    }
  }, [
    showContributionEndPicker,
    monthlyWithdrawalMonths,
    monthlyWithdrawalYears,
    contributionEndMonth,
    contributionEndYear,
  ]);

  useEffect(() => {
    if (!showMonthlyWithdrawalPicker) {
      return;
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !monthlyPickerRef.current) {
        return;
      }
      if (!monthlyPickerRef.current.contains(target)) {
        setShowMonthlyWithdrawalPicker(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showMonthlyWithdrawalPicker]);

  useEffect(() => {
    if (!showContributionEndPicker) {
      return;
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !contributionPickerRef.current) {
        return;
      }
      if (!contributionPickerRef.current.contains(target)) {
        setShowContributionEndPicker(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showContributionEndPicker]);

  useEffect(() => {
    if (!showEarnedIncomeTooltip) {
      return;
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (
        earnedIncomeTooltipRef.current?.contains(target) ||
        earnedIncomeTooltipBoxRef.current?.contains(target)
      ) {
        return;
      }
      setShowEarnedIncomeTooltip(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showEarnedIncomeTooltip]);

  const updateEarnedIncomeTooltipPlacement = useCallback(() => {
    const anchor = earnedIncomeTooltipAnchorRef.current;
    const tooltip = earnedIncomeTooltipBoxRef.current;
    if (!anchor || !tooltip) {
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportPadding = 12;
    const gap = 8;
    const desiredWidth = Math.min(520, viewportWidth - 40);
    tooltip.style.width = `${desiredWidth}px`;
    const updatedRect = tooltip.getBoundingClientRect();
    const leftSpace = anchorRect.left - viewportPadding;
    const rightSpace = viewportWidth - anchorRect.right - viewportPadding;
    let left: number;
    let placement: "left" | "right" = "left";
    if (leftSpace >= updatedRect.width + gap) {
      placement = "left";
      left = anchorRect.left - updatedRect.width - gap;
    } else if (rightSpace >= updatedRect.width + gap) {
      placement = "right";
      left = anchorRect.right + gap;
    } else if (leftSpace >= rightSpace) {
      placement = "left";
      left = Math.max(viewportPadding, anchorRect.left - updatedRect.width - gap);
    } else {
      placement = "right";
      left = Math.min(
        viewportWidth - updatedRect.width - viewportPadding,
        anchorRect.right + gap,
      );
    }
    left = Math.min(
      Math.max(left, viewportPadding),
      viewportWidth - updatedRect.width - viewportPadding,
    );
    const viewportHeight = window.innerHeight;
    const top = Math.min(
      Math.max(
        anchorRect.top + anchorRect.height / 2 - updatedRect.height / 2,
        viewportPadding,
      ),
      viewportHeight - updatedRect.height - viewportPadding,
    );
    const maxHeight = Math.min(0.6 * viewportHeight, viewportHeight - viewportPadding * 2);
    setEarnedIncomeTooltipStyle({
      position: "fixed",
      top,
      left,
      width: updatedRect.width,
      maxHeight,
      overflowY: "auto",
      zIndex: 1500,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showEarnedIncomeTooltip) {
      return;
    }
    updateEarnedIncomeTooltipPlacement();
    window.addEventListener("resize", updateEarnedIncomeTooltipPlacement);
    return () => {
      window.removeEventListener("resize", updateEarnedIncomeTooltipPlacement);
    };
  }, [showEarnedIncomeTooltip, updateEarnedIncomeTooltipPlacement]);

  useEffect(() => {
    if (!showEarnedIncomeTooltip) {
      setEarnedIncomeTooltipStyle(null);
    }
  }, [showEarnedIncomeTooltip]);

  const handleEarnedIncomeMouseLeave = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    const related = event.relatedTarget as Node | null;
    if (
      related &&
      (earnedIncomeTooltipAnchorRef.current?.contains(related) ||
        earnedIncomeTooltipBoxRef.current?.contains(related))
    ) {
      return;
    }
    setShowEarnedIncomeTooltip(false);
  };

  const handleEarnedIncomeTooltipMouseLeave = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    const related = event.relatedTarget as Node | null;
    if (
      related &&
      (earnedIncomeTooltipAnchorRef.current?.contains(related) ||
        earnedIncomeTooltipBoxRef.current?.contains(related))
    ) {
      return;
    }
    setShowEarnedIncomeTooltip(false);
  };

  useEffect(() => {
    setShowMonthlyWithdrawalPicker(false);
    setShowContributionEndPicker(false);
  }, [step, showSchedule]);

  const showReportTabs = step === steps.length - 1 || showSchedule;
  const isSummaryTabActive =
    step === steps.length - 1 && !showSchedule && reportViewMode === "default";
  const isTabularTabActive =
    step === steps.length - 1 && !showSchedule && reportViewMode === "table";
  const isAmortizationTabActive = showSchedule;

  const actionControls = (
    <>
      {step < steps.length - 1 && (
        <button
          type="button"
          onClick={() =>
            setStep((prev) => Math.min(steps.length - 1, prev + 1))
          }
          disabled={disableNext}
          aria-label={copy.buttons.next}
          className="rounded-full bg-[color:var(--theme-accent)] p-2 text-[color:var(--theme-accent-text)] transition hover:opacity-90 disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5">
            <path
              d="M7 4l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {step === steps.length - 1 && !showSchedule ? (
        <button
          type="button"
          onClick={() => window.print()}
          aria-label={copy.accessibility.printReport}
          className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-2 text-[color:var(--theme-fg)] shadow-sm transition hover:opacity-90"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path
              d="M7 8V4h10v4M7 17h10v3H7v-3ZM5 9h14a2 2 0 0 1 2 2v5h-4v-3H7v3H3v-5a2 2 0 0 1 2-2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
        aria-label={copy.accessibility.refresh}
        className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-2 text-[color:var(--theme-fg)] shadow-sm transition hover:opacity-90"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="flex items-center gap-2 rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
        <span className="sr-only">{copy.languageLabel}</span>
        {(["en", "es"] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            aria-pressed={language === lang}
            className={`rounded-full px-2 py-1 text-[0.6rem] font-semibold tracking-[0.25em] transition ${
              language === lang
                ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  );

  const messageComponentMap: Record<string, React.ReactNode> = {
    "ssi-warning": showSsiPrompt ? (
      <div className="space-y-2 rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
        <p>
          Based on your planned contributions, withdrawals and earnings
          assumptions the account is projected to exceed{" "}
          {currencyFormatter.format(ssiBalanceLimit)} in {ssiExceedLabel}.
        </p>
        <p>
          This may result in suspension of SSI benefits and have an adverse
          financial impact.
        </p>
        <p>
          Accordingly,{" "}
          {ssiContributionsActiveAtCrossing ? (
            <>
              in this planning tool, contributions are stopped in{" "}
              {ssiExceedLabel}. Recurring withdrawals are also initiated to keep
              the balance at {currencyFormatter.format(ssiBalanceLimit)} by
              withdrawing the projected monthly earnings.
            </>
          ) : (
            <>
              recurring withdrawals are initiated in {ssiExceedLabel} to keep
              the balance at {currencyFormatter.format(ssiBalanceLimit)} by
              withdrawing the projected monthly earnings.
            </>
          )}
        </p>
      </div>
    ) : null,
    "work-to-able-prompt": showWorkToAblePrompt ? (
      <div className="rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
        {copy.workToAble.prompt(currencyFormatter.format(annualLimit))}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setWorkToAbleDecision("yes")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
              workToAbleDecision !== "undecided" && workToAbleDecision === "yes"
                ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                : "border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
            }`}
          >
            {copy.misc.yes}
          </button>
          <button
            type="button"
            onClick={() => setWorkToAbleDecision("no")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
              workToAbleDecision !== "undecided" && workToAbleDecision === "no"
                ? "bg-[color:var(--theme-danger)] text-[color:var(--theme-accent-text)]"
                : "border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
            }`}
          >
            {copy.misc.no}
          </button>
        </div>
      </div>
    ) : null,
    "work-to-able-decline": workToAbleDeclineActive ? (
      <div className="space-y-3 rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
        <p>
          {copy.workToAble.declineMessage(currencyFormatter.format(annualLimit))}
        </p>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--theme-warning-text)]">
            {copy.workToAble.amountOverLabel}
          </p>
          {getOveragePeriodNote(annualOveragePeriod) ? (
            <p className="text-[0.65rem] uppercase tracking-[0.25em] text-[color:var(--theme-warning-text)]">
              {getOveragePeriodNote(annualOveragePeriod)}
            </p>
          ) : null}
          <div className="rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-3 py-2 text-sm font-semibold text-[color:var(--theme-warning-text)]">
            {currencyFormatterWhole.format(amountOverAnnualLimit)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--theme-warning-text)]">
            {copy.workToAble.applyMaxPrompt}
          </p>
          {getApplyMaxNote(annualLimit) ? (
            <p className="text-xs text-[color:var(--theme-warning-text)]">
              {getApplyMaxNote(annualLimit)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => applyMaxAllowedContribution(annualLimit)}
            className="rounded-full border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-warning-text)] shadow-sm"
          >
            {copy.misc.yes}
          </button>
        </div>
      </div>
    ) : null,
    "work-to-able-not-eligible": workToAbleNotEligibleActive ? (
      <div className="space-y-3 rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
        <p className="text-sm font-semibold">
          {copy.workToAble.ineligibleMessage(
            currencyFormatter.format(annualLimit),
          )}
        </p>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--theme-warning-text)]">
            {copy.workToAble.amountOverLabel}
          </p>
          {getOveragePeriodNote(annualOveragePeriod) ? (
            <p className="text-[0.65rem] uppercase tracking-[0.25em] text-[color:var(--theme-warning-text)]">
              {getOveragePeriodNote(annualOveragePeriod)}
            </p>
          ) : null}
          <div className="rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-3 py-2 text-sm font-semibold text-[color:var(--theme-warning-text)]">
            {currencyFormatterWhole.format(amountOverAnnualLimit)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--theme-warning-text)]">
            {copy.workToAble.applyMaxPrompt}
          </p>
          {getApplyMaxNote(annualLimit) ? (
            <p className="text-xs text-[color:var(--theme-warning-text)]">
              {getApplyMaxNote(annualLimit)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => applyMaxAllowedContribution(annualLimit)}
            className="rounded-full border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-warning-text)] shadow-sm"
          >
            {copy.misc.yes}
          </button>
        </div>
      </div>
    ) : null,
    "work-to-able-over-limit": workToAbleOverLimitActive ? (
      <div className="space-y-3 rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
        <p className="text-sm font-semibold">
          {copy.workToAble.eligibleOver(
            currencyFormatter.format(workToAbleAdditionalContribution),
            currencyFormatter.format(combinedLimit),
          )}
        </p>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--theme-warning-text)]">
            {copy.workToAble.amountOverCombinedLabel}
          </p>
          {getOveragePeriodNote(combinedOveragePeriod) ? (
            <p className="text-[0.65rem] uppercase tracking-[0.25em] text-[color:var(--theme-warning-text)]">
              {getOveragePeriodNote(combinedOveragePeriod)}
            </p>
          ) : null}
          <div className="rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-3 py-2 text-sm font-semibold text-[color:var(--theme-warning-text)]">
            {currencyFormatterWhole.format(amountOverCombinedLimit)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--theme-warning-text)]">
            {copy.workToAble.applyMaxPrompt}
          </p>
          {getApplyMaxNote(combinedLimit) ? (
            <p className="text-xs text-[color:var(--theme-warning-text)]">
              {getApplyMaxNote(combinedLimit)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => applyMaxAllowedContribution(combinedLimit)}
            className="rounded-full border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-warning-text)] shadow-sm"
          >
            {copy.misc.yes}
          </button>
        </div>
      </div>
    ) : null,
    "work-to-able-info": workToAbleInfoActive ? (
      <div className="space-y-4 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-4">
        <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
          {copy.workToAble.title}
        </p>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
            {copy.workToAble.earnedIncomeQuestion}
          </p>
          <div className="flex gap-2">
            {[true, false].map((value) => (
              <button
                key={`earned-${value}`}
                type="button"
                onClick={() => setWorkToAbleHasEarnedIncome(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                  workToAbleHasEarnedIncome === value
                    ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                    : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
                }`}
              >
                {value ? copy.misc.yes : copy.misc.no}
              </button>
            ))}
          </div>
          {workToAbleHasEarnedIncome && (
            <>
              <div className="mt-3 space-y-3 text-[color:var(--theme-muted)]">
                <div
                  className="flex items-center gap-2 text-sm font-semibold text-[color:var(--theme-fg)]"
                  ref={earnedIncomeTooltipRef}
                >
                  <span>{copy.tooltips.earnedIncome.prompt}</span>
                  <div
                    className="relative"
                    ref={earnedIncomeTooltipAnchorRef}
                    onMouseEnter={() => setShowEarnedIncomeTooltip(true)}
                    onMouseLeave={handleEarnedIncomeMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setShowEarnedIncomeTooltip((prev) => !prev)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)] text-xs font-semibold shadow-sm transition hover:opacity-90"
                      aria-label={copy.accessibility.estimatedEarnedIncomeInfo}
                    >
                      ?
                    </button>
                  </div>
                  {showEarnedIncomeTooltip &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div
                        ref={earnedIncomeTooltipBoxRef}
                        onMouseEnter={() => setShowEarnedIncomeTooltip(true)}
                        onMouseLeave={handleEarnedIncomeTooltipMouseLeave}
                        className="rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3 text-xs leading-relaxed text-[color:var(--theme-fg)] shadow-lg"
                        style={
                          earnedIncomeTooltipStyle ?? {
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "min(520px, calc(100vw - 40px))",
                            maxHeight: "60vh",
                            overflowY: "auto",
                            zIndex: 1500,
                          }
                        }
                      >
                        <p>{copy.tooltips.earnedIncome.lead}</p>
                      </div>,
                      document.body,
                    )}
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                    {copy.tooltips.earnedIncome.includedTitle}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {copy.tooltips.earnedIncome.includedItems.map((item) => (
                      <li key={`included-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                    {copy.tooltips.earnedIncome.excludedTitle}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {copy.tooltips.earnedIncome.excludedItems.map((item) => (
                      <li key={`excluded-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <input
                className="mt-2 h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                value={workToAbleEarnedIncome}
                onChange={(event) => setWorkToAbleEarnedIncome(event.target.value)}
              />
            </>
          )}
        </div>
        {workToAbleHasEarnedIncome && workToAbleIncomeAmount > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
              {copy.workToAble.employerPlanQuestion}
            </p>
            <div className="flex gap-2">
              {[true, false].map((value) => (
                <button
                  key={`plan-${value}`}
                  type="button"
                  onClick={() => setWorkToAbleHasEmployerPlan(value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                    workToAbleHasEmployerPlan === value
                      ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                      : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
                  }`}
                >
                  {value ? copy.misc.yes : copy.misc.no}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    ) : null,
    "plan-max-stop": showPlanMaxStopMessage ? (
      <div className="rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
        <p>
          {copy.warnings.planMaxStop(
            currencyFormatter.format(planMaxBalance ?? 0),
            planMaxStopLabel ?? "",
          )}
        </p>
      </div>
    ) : null,
    "fsc-eligibility": showFscEligibility ? (
      <div className="space-y-3 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
            {copy.federalSavers.eligibilityTitle}
          </p>
          <button
            type="button"
            onClick={() => setShowFscEligibility(false)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-xs font-semibold text-[color:var(--theme-fg)]"
            aria-label={copy.federalSavers.closeEligibility}
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
              {copy.federalSavers.questions.hasTaxLiability}
            </p>
            <div className="flex gap-2">
              {[true, false].map((value) => (
                <button
                  key={`fsc-tax-${value}`}
                  type="button"
                  onClick={() => setFscHasTaxLiability(value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                    fscHasTaxLiability === value
                      ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                      : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
                  }`}
                >
                  {value ? copy.misc.yes : copy.misc.no}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
              {copy.federalSavers.questions.isOver18}
            </p>
            <div className="flex gap-2">
              {[true, false].map((value) => (
                <button
                  key={`fsc-age-${value}`}
                  type="button"
                  onClick={() => setFscIsOver18(value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                    fscIsOver18 === value
                      ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                      : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
                  }`}
                >
                  {value ? copy.misc.yes : copy.misc.no}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
              {copy.federalSavers.questions.isStudent}
            </p>
            <div className="flex gap-2">
              {[true, false].map((value) => (
                <button
                  key={`fsc-student-${value}`}
                  type="button"
                  onClick={() => setFscIsStudent(value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                    fscIsStudent === value
                      ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                      : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
                  }`}
                >
                  {value ? copy.misc.yes : copy.misc.no}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[color:var(--theme-fg)]">
              {copy.federalSavers.questions.isDependent}
            </p>
            <div className="flex gap-2">
              {[true, false].map((value) => (
                <button
                  key={`fsc-dependent-${value}`}
                  type="button"
                  onClick={() => setFscIsDependent(value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                    fscIsDependent === value
                      ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                      : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-[color:var(--theme-fg)] shadow-sm"
                  }`}
                >
                  {value ? copy.misc.yes : copy.misc.no}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={runFscEligibilityCheck}
            className="w-full rounded-full bg-[color:var(--theme-accent)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-accent-text)]"
          >
            {copy.buttons.checkEligibility}
          </button>
        </div>
      </div>
    ) : null,
    "zero-balance": zeroBalanceEvent && !disableNext ? (
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs leading-relaxed text-[color:var(--theme-warning-text)]">
        <p>
          Based on all your inputs, your account balance reaches zero in{" "}
          <span className="font-semibold text-[color:var(--theme-warning-text)]">
            {zeroBalanceEvent.label}
          </span>
          , {zeroBalanceYearsLabel} years before the end of your time horizon.
          You can modify your inputs—including time horizon, contributions,
          withdrawals, and when those streams begin or end—if you’d like to
          plan differently.
        </p>
      </div>
    ) : null,
    "projected-balance": !zeroBalanceEvent ? (
      <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--theme-info)] bg-[color:var(--theme-info-weak)] p-4 text-xs leading-relaxed text-[color:var(--theme-info-text)]">
        <p className="font-semibold uppercase tracking-[0.2em] text-[color:var(--theme-muted)]">
          Projected ending balance
        </p>
        <p>
          Based on your inputs, your account is projected to have an ending
          balance of{" "}
          <span className="font-semibold text-[color:var(--theme-fg)]">
            {currencyFormatterWhole.format(reportTotals.endingBalance)}
          </span>
          .
        </p>
      </div>
    ) : null,
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        ...themeVars,
        backgroundColor: "var(--theme-bg)",
        color: "var(--theme-fg)",
      }}
    >
      <div className="relative mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-0 px-4 pb-6 pt-0">
        <div className="pointer-events-none absolute -left-32 top-10 h-40 w-40 rounded-full bg-[color:var(--theme-accent)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-40 h-48 w-48 rounded-full bg-[color:var(--theme-accent)]/15 blur-3xl" />

        <header className="flex shrink-0 flex-col gap-2 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-6 py-2 shadow-lg backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--theme-muted)]">
            {copy.header.bannerPlaceholder}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--theme-fg)]">
                {copy.header.clientName}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--theme-muted)]">
                {copy.header.clientSubtitle}
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-3 max-[1024px]:flex-col max-[1024px]:items-stretch">
              <select
                className="select-pill rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="base">{copy.themes.base}</option>
                <option value="state-ca">{copy.themes.ca}</option>
                <option value="state-il">{copy.themes.il}</option>
                <option value="state-ut">{copy.themes.ut}</option>
                <option value="state-tx">{copy.themes.tx}</option>
              </select>
              <div className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                {copy.screenLabel(step + 1, steps.length)}
              </div>
            </div>
          </div>
        </header>

        {showSchedule ? (
          <section className="flex flex-1 min-h-0 flex-col space-y-1 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-6 py-2 shadow-lg backdrop-blur max-[1024px]:pb-28">
            <div className="flex w-full items-center gap-3 max-[1024px]:sticky max-[1024px]:top-4 max-[1024px]:z-40">
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                {showReportTabs && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(steps.length - 1);
                        setShowSchedule(false);
                        setReportViewMode("default");
                      }}
                      className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                        isSummaryTabActive
                          ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                          : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(steps.length - 1);
                        setShowSchedule(false);
                        setReportViewMode("table");
                      }}
                      className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                        isTabularTabActive
                          ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                          : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                      }`}
                    >
                      Tabular
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(steps.length - 1);
                        setShowSchedule(true);
                      }}
                      className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                        isAmortizationTabActive
                          ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                          : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                      }`}
                    >
                      {copy.buttons.openSchedule}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDownloadAmortizationCsv}
                  disabled={filteredScheduleRows.length === 0}
                  aria-label={copy.misc.downloadScheduleButton}
                  className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-2 text-[color:var(--theme-fg)] shadow-sm transition hover:opacity-90 disabled:opacity-40"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12h12M10 5v7l3-3M10 12l-3-3" />
                  </svg>
                </button>
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                  <span className="sr-only">{copy.languageLabel}</span>
                  {(["en", "es"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      aria-pressed={language === lang}
                      className={`rounded-full px-2 py-1 text-[0.6rem] font-semibold tracking-[0.25em] transition ${
                        language === lang
                          ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                          : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <span />
              <h2 className="text-center text-xl font-semibold text-[color:var(--theme-fg)]">
                {copy.misc.amortizationSchedule}
              </h2>
              <span />
            </div>
            {calcError ? (
              <p className="rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] px-4 py-2 text-xs text-[color:var(--theme-warning-text)]">
                {calcError}
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]">
              <table className="min-w-full divide-y divide-[color:var(--theme-border)] text-left text-xs">
                <thead className="text-[0.65rem] uppercase tracking-[0.4em] text-[color:var(--theme-muted)]"><tr>
                    {[
                      copy.table.month,
                      copy.table.contributions,
                      copy.table.monthlyWithdrawals,
                      copy.table.earnings,
                      copy.table.balance,
                      copy.table.federalTax,
                      copy.table.stateTax,
                      copy.table.federalSaversCredit,
                      copy.table.stateTaxDeductionCredit,
                    ].map((label, index) => (
                      <th
                        key={label}
                        className={`px-3 py-2 text-center ${
                          index === 0 ? "w-32 whitespace-nowrap" : ""
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--theme-border)] text-sm text-[color:var(--theme-muted)]">
                  {yearSummaries.map(({ year, rows, totals }) => (
                    <Fragment key={`year-group-${year}`}>
                      <tr
                        key={`year-${year}`}
                        className="bg-[color:var(--theme-accent)]/10"
                      >
                        <td
                          className="px-3 py-2 text-center font-semibold text-[color:var(--theme-fg)] whitespace-nowrap"
                        >
                          <button
                            type="button"
                            onClick={() => toggleYearExpanded(year)}
                            className="flex w-full items-center justify-center gap-2"
                          >
                            <span>{year}</span>
                            <span className="text-xs text-[color:var(--theme-muted)]">
                              {expandedYears.has(year) ? "−" : "+"}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatterWhole.format(totals.contributions)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatterWhole.format(totals.monthlyWithdrawals)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatter.format(totals.earnings)}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-[color:var(--theme-fg)]">
                          {currencyFormatter.format(totals.endingBalance)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatter.format(totals.federalTax)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatter.format(totals.stateTax)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatter.format(totals.federalSaversCredit)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {currencyFormatter.format(totals.stateDeductionCredit)}
                        </td>
                      </tr>
                      {expandedYears.has(year) &&
                        rows.map((row) => (
                          <tr
                            key={`${row.year}-${row.month}-${row.monthIndex}`}
                            className="bg-[color:var(--theme-accent)]/5 text-[color:var(--theme-muted)]"
                          >
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              - {monthNames[row.month - 1]} {row.year}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatterWhole.format(row.contributions)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatterWhole.format(row.monthlyWithdrawals)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatter.format(row.earnings)}
                            </td>
                            <td className="px-3 py-2 text-center text-[color:var(--theme-fg)]">
                              {currencyFormatter.format(row.endingBalance)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatter.format(row.rowFederalTax)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatter.format(row.rowStateTax)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatter.format(row.rowFederalSaversCredit)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {currencyFormatter.format(row.rowDeductionTaxEffect)}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 min-h-0 flex-col space-y-4 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] p-6 pb-0 shadow-lg backdrop-blur max-[1024px]:pb-28">
            <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center max-[1024px]:sticky max-[1024px]:top-4 max-[1024px]:z-40">
              <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-start">
                <button
                  type="button"
                  onClick={() => {
                    if (showSchedule) {
                      setShowSchedule(false);
                    } else {
                      setStep((prev) => Math.max(0, prev - 1));
                    }
                  }}
                  disabled={step === 0 && !showSchedule}
                  aria-label={copy.buttons.back}
                  className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-2 text-[color:var(--theme-fg)] shadow-sm transition hover:opacity-90 disabled:opacity-40"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5">
                    <path
                      d="M13 4l-6 6 6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="flex items-center gap-2 lg:hidden">
                  {actionControls}
                </div>
              </div>
              <div className="flex justify-center">
                {step === 0 ? (
                  <div className="text-sm font-semibold uppercase tracking-[0.4em] text-[color:var(--theme-muted)]">
                    {copy.misc.stepHeaders.demographics}
                  </div>
                ) : null}
                {step === 1 ? (
                  <div className="text-sm font-semibold uppercase tracking-[0.4em] text-[color:var(--theme-muted)]">
                    {copy.misc.stepHeaders.accountActivity}
                  </div>
                ) : null}
                {step === steps.length - 1 ? (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--theme-muted)]">
                      {copy.misc.stepHeaders.horizonPrompt}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-2 py-1">
                      {availableHorizons.map((value) => {
                        const label =
                          value === "max"
                            ? copy.misc.horizonMaxLabel
                            : `${value}${copy.misc.horizonYearSuffix}`;
                        const isActive = selectedHorizon === value;
                        return (
                          <button
                            key={`horizon-${value}`}
                            type="button"
                            onClick={() => setSelectedHorizon(value)}
                        className={`rounded-full px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] transition whitespace-nowrap ${
                              isActive
                                ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                                : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                            }`}
                          >
                            <span>{label}</span>
                            {value === "max" && isActive ? (
                              <span className="ml-2 text-[0.55rem] tracking-[0.2em]">
                                {`${totalYearsForDisplay}${copy.misc.horizonYearSuffix}`}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  {step === steps.length - 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReportViewMode("default")}
                        className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                          reportViewMode === "default"
                            ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                            : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                        }`}
                      >
                        Summary
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportViewMode("table")}
                        className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                          reportViewMode === "table"
                            ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                            : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                        }`}
                      >
                        Tabular
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSchedule(true)}
                        className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                          showSchedule
                            ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                            : "border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                        }`}
                      >
                        {copy.buttons.openSchedule}
                      </button>
                    </>
                  )}
                </div>
                <div className="hidden items-center justify-end gap-2 lg:flex">
                  {actionControls}
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto h-full gap-2">
              {step === 0 && (
                <div className="flex min-h-0 flex-1 flex-col gap-6 h-full">
                  <div className="grid min-h-0 gap-6 lg:grid-cols-[1fr_0.8fr] h-full items-stretch">
                    <div className="flex min-h-0 flex-1 flex-col h-full">
                      <div className="flex h-full flex-col gap-4 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-5 shadow-lg">
                        <div className="flex flex-1 flex-col gap-4">
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3">
                              <div className="grid gap-3 md:grid-cols-2 md:items-center">
                                <div className="space-y-2">
                                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                    {copy.labels.beneficiary}
                                  </p>
                                  <input
                                    className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                    value={beneficiaryName}
                                    onChange={(event) =>
                                      setBeneficiaryName(event.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                    {copy.labels.stateOfResidence}
                                  </p>
                                  <select
                                    className="select-pill h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                    value={stateCode}
                                    onChange={(event) =>
                                      setStateCode(event.target.value)
                                    }
                                  >
                                    {availableStateCodes.map((code) => (
                                      <option key={code} value={code}>
                                        {code}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3">
                              <div className="grid gap-3 grid-cols-2">
                                <div className="space-y-2">
                                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                    {copy.labels.taxFilingStatus}
                                  </p>
                                  <select
                                    className="select-pill h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                    value={filingStatus}
                                    onChange={(event) =>
                                      setFilingStatus(event.target.value)
                                    }
                                  >
                                    {filingStatusOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                    {copy.labels.adjustedGrossIncome}
                                  </p>
                                  <input
                                    className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                    value={accountAGI}
                                    onChange={(event) =>
                                      setAccountAGI(event.target.value)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3">
                              <div className="space-y-2">
                                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                  {copy.labels.annualReturnAssumption}
                                </p>
                                <input
                                  className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                  value={annualReturnOverride}
                                  onChange={(event) =>
                                    setAnnualReturnOverride(event.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3">
                              <label className="flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                <input
                                  id="beneficiary-ssi-benefits"
                                  type="checkbox"
                                  checked={isSsiBeneficiary}
                                  onChange={(event) =>
                                    setIsSsiBeneficiary(event.target.checked)
                                  }
                                  className="relative h-8 w-8 shrink-0 appearance-none rounded-none border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] text-[color:var(--theme-accent)] shadow-inner transition checked:border-[color:var(--theme-accent)] checked:bg-[color:var(--theme-accent)] before:absolute before:left-1/2 before:top-1/2 before:h-3 before:w-1.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:border-b-2 before:border-r-2 before:border-[color:var(--theme-accent-text)] before:opacity-0 before:content-[''] checked:before:opacity-100 square-checkbox"
                                />
                                <span>{copy.labels.ssiBenefitsQuestion}</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <aside className="flex min-h-0 flex-1 flex-col space-y-4 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] p-5 h-full overflow-y-auto max-h-[calc(100vh-16rem)]">
                      {residencyWarningMessage && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--theme-warning)] bg-[color:var(--theme-warning-weak)] p-4 text-xs text-[color:var(--theme-warning-text)]">
                          <span>{residencyWarningMessage}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (planStateCode) {
                                setStateCode(planStateCode);
                              }
                              setResidencyOverride(true);
                            }}
                            className="rounded-full border border-[color:var(--theme-warning)] bg-[color:var(--theme-surface-1)] px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-fg)] shadow-sm transition hover:opacity-90"
                          >
                            {copy.residency.actionLabel}
                          </button>
                        </div>
                      )}
                      <div className="space-y-3 text-sm text-[color:var(--theme-muted)]">
                        {copy.misc.disclosureCards.demographics.map(
                          (paragraph, index) => (
                            <p key={`demographics-${index}`}>{paragraph}</p>
                          ),
                        )}
                      </div>
                    </aside>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="flex min-h-0 flex-1 flex-col gap-4 h-full">
                  <div className="grid min-h-0 gap-4 items-stretch lg:grid-cols-[1.25fr_0.73fr] h-full">
                    <div className="flex min-h-0 flex-1 flex-col h-full">
                      <div className="flex h-full flex-col rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-3">
                        <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                              {timeHorizonLabel}
                            </p>
                            <input
                              className="h-10 min-w-[5rem] w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                              type="number"
                              min={1}
                              max={50}
                              step={1}
                              value={timeHorizonYears}
                              onChange={(event) => {
                                const rawValue = event.target.value;
                                if (rawValue === "") {
                                  setTimeHorizonYears(rawValue);
                                  return;
                                }
                                const parsedValue = Number(rawValue);
                                if (!Number.isFinite(parsedValue)) {
                                  setTimeHorizonYears(rawValue);
                                  return;
                                }
                                const clampedValue = Math.min(
                                  50,
                                  Math.max(1, Math.round(parsedValue)),
                                );
                                setTimeHorizonYears(String(clampedValue));
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                              {copy.labels.startingBalance}
                            </p>
                            <input
                              className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                              value={startingBalance}
                              onChange={(event) =>
                                setStartingBalance(event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                              {copy.labels.upfrontContribution}
                            </p>
                            <input
                              className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                              value={beneficiaryUpfrontContribution}
                              onChange={(event) =>
                                setBeneficiaryUpfrontContribution(event.target.value)
                              }
                            />
                          </div>
                        </div>
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                            {copy.labels.contributionsParent}
                          </p>
                          <div className="grid gap-4 sm:grid-cols-3 items-end">
                            <div className="space-y-2">
                              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                {copy.labels.recurringContribution}
                              </p>
                              <input
                                className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                value={beneficiaryRecurringContribution}
                                onChange={(event) =>
                                  setBeneficiaryRecurringContribution(event.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                {copy.labels.contributionCadence}
                              </p>
                              <select
                                className="select-pill h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                value={beneficiaryRecurringCadence}
                                onChange={(event) =>
                                  setBeneficiaryRecurringCadence(
                                    event.target.value as (typeof cadenceOptions)[number],
                                  )
                                }
                              >
                                {cadenceOptions.map((cadence) => (
                                  <option key={cadence} value={cadence}>
                                    {copy.cadenceLabels[cadence]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                                {copy.labels.contributionEndDate}
                              </p>
                              <div className="relative">
                                <button
                                  type="button"
                                  ref={contributionEndTriggerRef}
                                  onClick={() =>
                                    setShowContributionEndPicker((prev) => !prev)
                                  }
                                  className="flex h-10 w-full items-center justify-between rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-3 text-sm text-[color:var(--theme-fg)] shadow-inner"
                                >
                                  <span>
                                    {contributionEndMonthLabel} {contributionEndYear}
                                  </span>
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 text-[color:var(--theme-muted)]"
                                  >
                                    <path
                                      d="M6 9l6 6 6-6"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                {showContributionEndPicker &&
                                  typeof document !== "undefined" &&
                                  createPortal(
                                    <div
                                      ref={contributionPickerRef}
                                      className="z-30 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] p-3 shadow-lg max-h-[26rem] overflow-hidden"
                                      style={{
                                        ...(contributionPickerStyle ?? {}),
                                        ...themeVars,
                                        backgroundColor: "var(--theme-surface-1)",
                                        color: "var(--theme-fg)",
                                        maxHeight: "min(26rem, calc(100vh - 6rem))",
                                      }}
                                    >
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                            {copy.labels.month}
                                          </p>
                                          <div className="relative">
                                            <div
                                              ref={contributionMonthWheelRef}
                                              className="overflow-y-auto rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-sm text-[color:var(--theme-fg)]"
                                              style={{
                                                height: wheelVisibleItems * wheelItemHeight,
                                                scrollSnapType: "y mandatory",
                                                paddingTop: wheelItemHeight / 4,
                                                paddingBottom: wheelItemHeight / 4,
                                              }}
                                            >
                                              {contributionMonthWheelItems.map(
                                                (month, index) => (
                                                  <div
                                                    key={`contrib-month-${month?.value ?? "pad"}-${index}`}
                                                    className="flex h-10 items-center justify-center px-2"
                                                    style={{ scrollSnapAlign: "center" }}
                                                    onClick={() => {
                                                      if (!month) {
                                                        return;
                                                      }
                                                      setHasTouchedContributionEndDate(true);
                                                      setContributionEndMonth(month.value);
                                                      snapMonthWheel(
                                                        contributionMonthWheelRef.current,
                                                        index,
                                                      );
                                                    }}
                                                  >
                                                    <span
                                                      className={wheelItemClass(
                                                        month?.value ===
                                                          contributionEndMonth,
                                                      )}
                                                    >
                                                      {month?.label ?? ""}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                            {copy.labels.year}
                                          </p>
                                          <div className="relative">
                                            <div
                                              ref={contributionYearWheelRef}
                                              className="overflow-y-auto rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-sm text-[color:var(--theme-fg)]"
                                              style={{
                                                height: wheelVisibleItems * wheelItemHeight,
                                                scrollSnapType: "y mandatory",
                                                paddingTop: wheelItemHeight / 4,
                                                paddingBottom: wheelItemHeight / 4,
                                              }}
                                            >
                                              {contributionYearWheelItems.map(
                                                (year, index) => (
                                                  <div
                                                    key={`contrib-year-${year ?? "pad"}-${index}`}
                                                    className="flex h-10 items-center justify-center px-2"
                                                    style={{ scrollSnapAlign: "center" }}
                                                    onClick={() => {
                                                      if (!year) {
                                                        return;
                                                      }
                                                      setHasTouchedContributionEndDate(true);
                                                      setContributionEndYear(year);
                                                      snapYearWheel(
                                                        contributionYearWheelRef.current,
                                                        index,
                                                      );
                                                    }}
                                                  >
                                                    <span
                                                      className={wheelItemClass(
                                                        year === contributionEndYear,
                                                      )}
                                                    >
                                                      {year ?? ""}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowContributionEndPicker(false)
                                          }
                                          className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-fg)] shadow-sm"
                                        >
                                          {copy.buttons.done}
                                        </button>
                                      </div>
                                    </div>,
                                    document.body,
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-4">
                          <div className="space-y-3">
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                          {copy.labels.monthlyWithdrawalsTitle}
                            </p>
                            <div className="flex flex-wrap items-end gap-4">
                              <div className="flex-1 space-y-2">
                                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                              {copy.labels.amountShort}
                                </p>
                                <input
                                  className="h-10 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] shadow-inner px-3 text-sm text-[color:var(--theme-fg)]"
                                  value={monthlyWithdrawalAmount}
                                  onChange={(event) =>
                                    setMonthlyWithdrawalAmount(event.target.value)
                                  }
                                />
                              </div>
                              <div className="flex-1 space-y-2">
                                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-[color:var(--theme-fg)]">
                              {copy.labels.startShort}
                                </p>
                                <div className="relative">
                                  <button
                                    type="button"
                                    ref={monthlyPickerButtonRef}
                                    onClick={() =>
                                      setShowMonthlyWithdrawalPicker((prev) => !prev)
                                    }
                                    className="flex h-10 w-full items-center justify-between rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-3 text-sm text-[color:var(--theme-fg)] shadow-inner"
                                  >
                                    <span>
                                      {monthlyWithdrawalMonthLabel}{" "}
                                      {monthlyWithdrawalStartYear}
                                    </span>
                                    <svg
                                      aria-hidden="true"
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4 text-[color:var(--theme-muted)]"
                                    >
                                      <path
                                        d="M6 9l6 6 6-6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                {showMonthlyWithdrawalPicker && (
                                  <div
                                    ref={monthlyPickerRef}
                                    className="z-30 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] p-3 shadow-lg max-h-[26rem] overflow-hidden"
                                    style={{
                                      ...(monthlyPickerStyle ?? {}),
                                      maxHeight: "min(26rem, calc(100vh - 6rem))",
                                    }}
                                  >
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                            {copy.labels.month}
                                          </p>
                                          <div className="relative">
                                            <div
                                              ref={monthWheelRef}
                                              className="overflow-y-auto rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-sm text-[color:var(--theme-fg)]"
                                              style={{
                                                height: wheelVisibleItems * wheelItemHeight,
                                                scrollSnapType: "y mandatory",
                                                paddingTop: wheelItemHeight / 4,
                                                paddingBottom: wheelItemHeight / 4,
                                              }}
                                            >
                                              {monthWheelItems.map((month, index) => (
                                                <div
                                                  key={`month-${month?.value ?? "pad"}-${index}`}
                                                  className="flex h-10 items-center justify-center px-2"
                                                  style={{ scrollSnapAlign: "center" }}
                                                  onClick={() => {
                                                    if (!month) {
                                                      return;
                                                    }
                                                    setMonthlyWithdrawalStartMonth(
                                                      month.value,
                                                    );
                                                    snapMonthWheel(
                                                      monthWheelRef.current,
                                                      index,
                                                    );
                                                  }}
                                                >
                                                  <span
                                                    className={wheelItemClass(
                                                      month?.value ===
                                                        monthlyWithdrawalStartMonth,
                                                    )}
                                                  >
                                                    {month?.label ?? ""}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                            {copy.labels.year}
                                          </p>
                                          <div className="relative">
                                            <div
                                              ref={yearWheelRef}
                                              className="overflow-y-auto rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-sm text-[color:var(--theme-fg)]"
                                              style={{
                                                height: wheelVisibleItems * wheelItemHeight,
                                                scrollSnapType: "y mandatory",
                                                paddingTop: wheelItemHeight / 4,
                                                paddingBottom: wheelItemHeight / 4,
                                              }}
                                            >
                                              {yearWheelItems.map((year, index) => (
                                                <div
                                                  key={`year-${year ?? "pad"}-${index}`}
                                                  className="flex h-10 items-center justify-center px-2"
                                                  style={{ scrollSnapAlign: "center" }}
                                                  onClick={() => {
                                                    if (!year) {
                                                      return;
                                                    }
                                                    setMonthlyWithdrawalStartYear(
                                                      year,
                                                    );
                                                    snapYearWheel(
                                                      yearWheelRef.current,
                                                      index,
                                                    );
                                                  }}
                                                >
                                                  <span
                                                    className={wheelItemClass(
                                                      year ===
                                                        monthlyWithdrawalStartYear,
                                                    )}
                                                  >
                                                    {year ?? ""}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowMonthlyWithdrawalPicker(false)
                                          }
                                          className="rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-fg)] shadow-sm"
                                        >
                                          {copy.buttons.done}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-1 flex-col justify-end space-y-2">
                                <div className="h-[0.9rem]" />
                                <button
                                  type="button"
                                  aria-pressed={showAdvancedBudgetBreakdown}
                                  onClick={() =>
                                    setShowAdvancedBudgetBreakdown((prev) => !prev)
                                  }
                                  className={`flex h-10 w-full items-center justify-center rounded-full text-[0.95rem] font-bold uppercase tracking-[0.3em] shadow-sm transition ${
                                    showAdvancedBudgetBreakdown
                                      ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                                      : "bg-[color:var(--theme-muted)] text-white hover:opacity-90"
                                  }`}
                                >
                                  {copy.labels.advanced}
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFscOutcome(null);
                              setShowFscEligibility(true);
                            }}
                            style={fscButtonStyle(fscOutcome)}
                            className="mt-4 h-10 w-full rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] px-4 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-fg)] shadow-sm transition hover:opacity-90"
                          >
                            {fscOutcome === "eligible"
                              ? copy.federalSavers.buttonEligible
                              : fscOutcome === "ineligible"
                                ? copy.federalSavers.buttonIneligible
                                : copy.federalSavers.buttonDefault}
                          </button>
                        </div>
                      </div>
                    </div>
                    <aside className="flex min-h-0 flex-1 flex-col space-y-4 rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] p-5 h-full overflow-y-auto max-h-[calc(100vh-16rem)] min-h-0">
                      {messageOrder.map((key) => {
                        const component = messageComponentMap[key];
                        if (!component) {
                          return null;
                        }
                        return (
                          <Fragment key={`right-card-message-${key}`}>
                            {component}
                          </Fragment>
                        );
                      })}

                    {showAdvancedBudgetBreakdown && (
                      <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[color:var(--theme-muted)]">
                            {copy.misc.budgetQualifiedHeader}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAdvancedBudgetBreakdown(false)}
                            className="flex w-8 h-8 min-w-8 min-h-8 rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-1)] text-sm font-semibold text-[color:var(--theme-danger)] transition hover:bg-[color:var(--theme-danger)]/10 box-border p-0 items-center justify-center"
                            aria-label={copy.misc.close}
                          >
                            ×
                          </button>
                        </div>
                        <div className="mt-3 space-y-2">
                          {advancedBudgetFields.map((field) => (
                            <div key={field.key} className="space-y-[0.25rem]">
                              <label className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                {field.label}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-9 w-full rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-2)] px-3 text-sm text-[color:var(--theme-fg)]"
                                value={advancedBudgetValues[field.key]}
                                onChange={(event) =>
                                  setAdvancedBudgetValues((prev) => ({
                                    ...prev,
                                    [field.key]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3 text-sm text-[color:var(--theme-muted)]">
                      {copy.misc.disclosureCards.accountActivity.map(
                        (paragraph, index) => (
                          <p key={`accountActivity-${index}`}>{paragraph}</p>
                        ),
                      )}
                    </div>
                  </aside>
                </div>
                </div>
              )}
            </div>

            {step === 2 && (
            <div className="space-y-1 mt-0">
                {reportViewMode === "default" ? (
                  <Fragment>
            <div className="grid gap-2 lg:grid-cols-2 items-stretch mt-0">
                <div className="flex h-full">
                  <div className="flex h-full flex-col rounded-3xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface)] px-4 pb-4 pt-3">
                      <div className="flex min-h-[2.5rem] items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                          {copy.misc.accountActivityInformation}
                        </p>
                      </div>
                      <div className="mt-0 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3">
                          <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                            {copy.report.cards.startingBalance.label}
                          </p>
                          <p className="mt-[0.3rem] text-2xl font-semibold text-[color:var(--theme-accent)]">
                            {currencyFormatterWhole.format(
                              reportTotals.startingBalance,
                            )}
                          </p>
                          <p className="mt-2 text-xs text-[color:var(--theme-muted)]">
                            {copy.report.cards.startingBalance.note}
                          </p>
                        </div>
                      <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3">
                        <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                          {copy.report.cards.totalContributions.label}
                        </p>
                        <p className="mt-[0.3rem] text-2xl font-semibold text-[color:var(--theme-accent)]">
                          {currencyFormatterWhole.format(
                            reportTotals.totalContributions,
                          )}
                        </p>
                        <p className="mt-2 text-xs text-[color:var(--theme-muted)]">
                          {copy.report.cards.totalContributions.note}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3">
                        <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                          {copy.report.cards.investmentEarnings.label}
                        </p>
                        <p className="mt-[0.3rem] text-2xl font-semibold text-[color:var(--theme-accent)]">
                          {currencyFormatterWhole.format(reportTotals.totalEarnings)}
                        </p>
                        <p className="mt-2 text-xs text-[color:var(--theme-muted)]">
                          {copy.report.cards.investmentEarnings.note}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3">
                        <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                          {copy.report.cards.totalWithdrawals.label}
                        </p>
                        <p className="mt-[0.3rem] text-2xl font-semibold text-[color:var(--theme-accent)]">
                          {currencyFormatterWhole.format(
                            reportTotals.totalWithdrawals,
                          )}
                        </p>
                        <p className="mt-2 text-xs text-[color:var(--theme-muted)]">
                          {copy.report.cards.totalWithdrawals.note}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3 sm:col-span-2">
                        <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                          {copy.report.cards.endingBalance.label}
                        </p>
                        <p className="mt-[0.3rem] text-2xl font-semibold text-[color:var(--theme-accent)]">
                          {currencyFormatterWhole.format(reportTotals.endingBalance)}
                        </p>
                        <p className="mt-2 text-xs text-[color:var(--theme-muted)]">
                          {copy.report.cards.endingBalance.note}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative flex h-full flex-col rounded-3xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface)] px-4 pb-0 pt-3">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAnnualReturns(false)}
                          className={`rounded-t-xl border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition ${
                            !showAnnualReturns
                              ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-fg)]"
                              : "border-transparent text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                          }`}
                        >
                          {copy.report.cards.taxBenefits.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAnnualReturns(true)}
                          className={`rounded-t-xl border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition ${
                            showAnnualReturns
                              ? "border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-fg)]"
                              : "border-transparent text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                          }`}
                        >
                          {copy.report.cards.averageAnnualReturns.label}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-[color:var(--theme-surface-1)] p-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em]">
                        <button
                          type="button"
                          onClick={() => setRightCardView("charts")}
                          className={`rounded-full px-3 py-1 transition ${
                            rightCardView === "charts"
                              ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                              : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                          }`}
                        >
                          {copy.report.cards.viewToggle.charts}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRightCardView("tables")}
                          className={`rounded-full px-3 py-1 transition ${
                            rightCardView === "tables"
                              ? "bg-[color:var(--theme-accent)] text-[color:var(--theme-accent-text)]"
                              : "text-[color:var(--theme-muted)] hover:text-[color:var(--theme-fg)]"
                          }`}
                        >
                          {copy.report.cards.viewToggle.tables}
                        </button>
                      </div>
                    </div>
                    {!showAnnualReturns && copy.report.cards.taxBenefits.note ? (
                      <p className="mt-0 text-xs text-[color:var(--theme-muted)]">
                        {copy.report.cards.taxBenefits.note}
                      </p>
                    ) : null}
                    <div className="mt-0 flex-1 flex flex-col justify-start gap-4">
                      {showAnnualReturns ? (
                        rightCardView === "charts" ? (
                          <div className="flex flex-1 flex-col gap-0" style={{ minHeight: 0 }}>
                          <div className="flex flex-1 gap-4 relative">
                              <div className="absolute top-6 left-4 right-4 hidden flex items-center justify-between gap-2 rounded-full border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface)] px-4 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-[color:var(--theme-accent)] sm:flex">
                                <span className="text-[0.8rem] font-semibold tracking-[0.3em]">
                                  {copy.report.taxBenefits.returnImpactLabel}
                                </span>
                                <span className="text-[0.95rem] font-bold tracking-[0.25em]">
                                  {percentFormatter.format(averageAnnualReturnAbleTotal)}
                                </span>
                              </div>
                              <div className="absolute bottom-6 left-4 right-4 hidden flex items-center justify-between rounded-full border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface)] px-4 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-[color:var(--theme-accent)] sm:flex">
                                <span className="text-[0.8rem] font-semibold tracking-[0.3em]">
                                  {copy.report.cards.taxBenefits.label}
                                </span>
                                <span className="text-[0.95rem] font-bold tracking-[0.25em] text-[color:var(--theme-accent)]">
                                  {percentFormatter.format(averageAnnualReturnTaxable)}
                                </span>
                              </div>
                              <div className="flex flex-1 min-w-[9rem] flex-col justify-start gap-3 text-[0.75rem] uppercase tracking-[0.08em] text-[color:var(--theme-muted)]">
                                {averageAnnualReturnsStackLegend.map((item) => {
                                  const sign =
                                    item.value > 0
                                      ? "+"
                                      : item.value < 0
                                      ? "-"
                                      : "";
                                  return (
                                    <div
                                      key={`returns-legend-${item.label}`}
                                      className="flex items-center justify-between gap-3 py-1"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className="inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                          style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-[0.8rem] whitespace-nowrap">
                                          {item.label}
                                        </span>
                                      </div>
                                      <span
                                        className="text-[1rem] font-bold tracking-[0.2em] whitespace-nowrap"
                                        style={{ color: item.color }}
                                      >
                                        {sign}
                                        {percentFormatter.format(Math.abs(item.value))}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                                <div className="flex flex-1 flex-col gap-1 relative" style={{ minHeight: 0 }}>
                                  <div className="flex-1 min-h-0">
                                    <div className="mt-0 h-full">
                                      <ReactECharts
                                        option={averageAnnualReturnsStackOption}
                                        notMerge
                                        style={{
                                          height: "76%",
                                          width: "100%",
                                          marginTop: "3rem",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 grid gap-2 grid-cols-1">
                            {averageAnnualReturnsTableItems.map((item) => (
                              <div
                                key={`average-returns-card-${item.key}`}
                                className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                    {item.label}
                                  </p>
                                  <p
                                    className="text-right text-2xl font-semibold"
                                    style={{ color: item.color }}
                                  >
                                    {item.sign
                                      ? `${item.sign}${percentFormatter.format(Math.abs(item.value))}`
                                      : percentFormatter.format(item.value)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      ) : rightCardView === "charts" ? (
                        <>
                          {taxBenefitsPieOption ? (
                            <div
                              className="mt-0"
                              style={{ height: "23rem" }}
                              role="img"
                              aria-describedby="tax-benefits-chart-desc"
                            >
                              <ReactECharts
                                key={`tax-benefits-pie-${taxBenefitsPieOption?.series?.[0]?.label?.fontSize ?? "default"}-layout`}
                                option={taxBenefitsPieOption}
                                notMerge
                                opts={{ renderer: "svg" }}
                                style={{ height: "100%", width: "100%", padding: 0 }}
                              />
                            </div>
                          ) : null}
                          {totalTaxBenefitsItem ? (
                            <div
                              className="pointer-events-none absolute right-4 z-10 rounded-2xl border bg-[color:var(--theme-surface-1)] px-4 py-3 shadow-sm"
                              style={{
                                borderColor: "var(--theme-accent)",
                                bottom: "1.25rem",
                              }}
                            >
                              <p className="text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--theme-muted)]">
                                {copy.report.taxBenefits.totalLabel}
                              </p>
                              <p className="mt-1 text-xl font-semibold text-[color:var(--theme-accent)]">
                                {currencyFormatterWhole.format(
                                  totalTaxBenefitsItem.value,
                                )}
                              </p>
                            </div>
                          ) : null}
                          <div id="tax-benefits-chart-desc" className="sr-only">
                            {copy.report.taxBenefits.chartDescription}
                          </div>
                          <table className="sr-only">
                            <caption>{copy.report.taxBenefits.table.caption}</caption>
                            <thead>
                              <tr>
                                <th scope="col">
                                  {copy.report.taxBenefits.table.categoryHeader}
                                </th>
                                <th scope="col">
                                  {copy.report.taxBenefits.table.amountHeader}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {taxBenefitsItems.map((item) => (
                                <tr key={`tax-benefits-row-${item.key}`}>
                                  <th scope="row">{item.label}</th>
                                  <td>{currencyFormatterWhole.format(item.value)}</td>
                                </tr>
                              ))}
                              <tr>
                                <th scope="row">
                                  {copy.report.taxBenefits.table.totalLabel}
                                </th>
                                <td>
                                  {currencyFormatterWhole.format(
                                    totalTaxBenefitsItem.value,
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          {taxBenefitsTableItems.length ? (
                            <div className="mt-[-4rem] grid gap-x-2 gap-y-1 pb-3 text-xs text-[color:var(--theme-muted)]">
                              {taxBenefitsTableItems.map((item) => (
                                <div
                                  key={`tax-benefit-row-${item.key}`}
                                  className="flex min-w-0 items-center gap-1"
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-xs leading-tight text-[color:var(--theme-muted)] break-words">
                                    {item.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {taxBenefitsItems.map((item) => (
                            <div
                              key={`tax-benefits-card-${item.key}`}
                              className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3"
                            >
                              <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)] line-clamp-2">
                                {item.label}
                              </p>
                              <p className="mt-[0.3rem] text-2xl font-semibold text-[color:var(--theme-accent)]">
                                {currencyFormatterWhole.format(item.value)}
                              </p>
                              <p className="mt-2 text-xs text-[color:var(--theme-muted)] line-clamp-2">
                                {item.note}
                              </p>
                            </div>
                          ))}
                          {totalTaxBenefitsItem ? (
                            <div className="rounded-2xl border border-[color:var(--theme-accent)] bg-[color:var(--theme-surface-1)] px-4 py-3 sm:col-span-2">
                              <p className="min-h-[2.5rem] text-xs uppercase tracking-[0.3em] text-[color:var(--theme-muted)] line-clamp-2 mb-2">
                                TOTAL
                              </p>
                              <p className="text-2xl font-semibold text-[color:var(--theme-accent)]">
                                {currencyFormatterWhole.format(
                                  totalTaxBenefitsItem.value,
                                )}
                              </p>
                              <p className="mt-2 text-xs text-[color:var(--theme-muted)]">
                                {copy.report.taxBenefits.totalCaption}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </Fragment>
              ) : (
                <div className="px-6 pt-0 pb-4 space-y-1">
                  <div className="flex items-end">
                    <p className="text-2xl font-semibold tracking-tight text-[color:var(--theme-fg)]">
                      {copy.ableVsTaxable.title}
                    </p>
                  </div>
                  <div className="mt-1 space-y-1 rounded-2xl border border-[color:var(--theme-border)] border-opacity-30 bg-[color:var(--theme-surface)] p-6 shadow-inner">
                    <div className="max-w-5xl mx-auto w-full">
                      <div className="grid min-w-[520px] grid-cols-[minmax(260px,420px)_minmax(0,1fr)_minmax(0,1fr)] gap-x-8 items-end pb-3 text-[0.9rem] uppercase tracking-[0.35em] text-[color:var(--theme-muted)] whitespace-nowrap">
                        <div />
                        <div className="text-center font-semibold">
                          {copy.ableVsTaxable.ableAccount}
                        </div>
                        <div className="text-center font-semibold">
                          {copy.ableVsTaxable.taxableAccount}
                        </div>
                      </div>
                      <div className="mt-1 space-y-1">
                        {comparisonRows.slice(0, 5).map((row) => (
                          <div
                            key={`shared-${row.label}`}
                            className="grid grid-cols-[minmax(260px,420px)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-8"
                          >
                            <div className={comparisonLabelClassName}>
                              {row.label}
                            </div>
                            <div className="col-span-2">
                              <div className={comparisonPillClassName}>
                                <span className="text-2xl font-semibold tabular-nums text-[color:var(--theme-accent)]">
                                  {formatCurrencyForComparison(row.able)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {comparisonRows.slice(5).map((row) => (
                          <div
                            key={`split-${row.label}`}
                            className="grid grid-cols-[minmax(260px,420px)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-8"
                          >
                            <div className={comparisonLabelClassName}>
                              {row.label}
                            </div>
                            <div>
                              <div className={comparisonPillClassName}>
                                <span className="text-2xl font-semibold tabular-nums text-[color:var(--theme-accent)]">
                                  {formatCurrencyForComparison(row.able)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className={comparisonPillClassName}>
                                <span className="text-2xl font-semibold tabular-nums text-[color:var(--theme-accent)]">
                                  {formatCurrencyForComparison(row.taxable)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          </section>
        )}
      </div>
    </div>
  );
}
