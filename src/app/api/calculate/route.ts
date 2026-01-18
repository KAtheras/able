import { NextResponse } from "next/server";

import { calculateProjection } from "../../../server/calculations/calculateProjection";
import type { Cadence } from "../../../lib/localization";
import type { CalculationInput } from "../../../types/calculations";

class ValidationError extends Error {}

type PayloadRecord = Record<string, unknown>;

function assertStringField(
  payload: PayloadRecord,
  field: keyof CalculationInput,
  required: boolean = true,
): string {
  const value = payload[field];
  if (required && typeof value !== "string") {
    throw new ValidationError(`"${String(field)}" must be a string.`);
  }
  return value as string;
}

function assertBooleanField(
  payload: PayloadRecord,
  field: keyof CalculationInput,
): boolean {
  const value = payload[field];
  if (typeof value !== "boolean") {
    throw new ValidationError(`"${String(field)}" must be a boolean.`);
  }
  return value;
}

function assertNumberField(
  payload: PayloadRecord,
  field: keyof CalculationInput,
  allowNull = false,
  required = true,
): number | null {
  const value = payload[field];
  if (value === null && allowNull) {
    return null;
  }
  if (required && typeof value !== "number") {
    throw new ValidationError(`"${String(field)}" must be a number.`);
  }
  return value as number;
}

function assertCadenceField(
  payload: PayloadRecord,
  field: keyof CalculationInput,
): Cadence {
  const value = payload[field];
  if (value !== "monthly" && value !== "annual") {
    throw new ValidationError(`"${String(field)}" must be "monthly" or "annual".`);
  }
  return value;
}

function assertNumberOrNullable<T extends keyof CalculationInput>(
  payload: PayloadRecord,
  field: T,
): number | null | undefined {
  const value = payload[field];
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "number") {
    throw new ValidationError(`"${String(field)}" must be a number or null/undefined.`);
  }
  return value;
}

function validateCalculationInput(payload: unknown): CalculationInput {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const record = payload as PayloadRecord;
  assertStringField(record, "startingBalance");
  assertStringField(record, "beneficiaryUpfrontContribution");
  assertStringField(record, "beneficiaryRecurringContribution");
  assertCadenceField(record, "beneficiaryRecurringCadence");
  assertStringField(record, "monthlyWithdrawalAmount");
  assertStringField(record, "monthlyWithdrawalStartMonth");
  assertStringField(record, "monthlyWithdrawalStartYear");
  assertBooleanField(record, "withdrawalPlanDecision");
  assertStringField(record, "annualReturnOverride");
  assertStringField(record, "timeHorizonYears");
  assertNumberField(record, "currentYear");
  assertNumberField(record, "planMaxBalance", true);
  assertBooleanField(record, "isSsiBeneficiary");
  assertStringField(record, "filingStatus");
  assertStringField(record, "accountAGI");
  assertStringField(record, "stateCode");
  assertStringField(record, "fscEffectiveFilingStatus");
  assertNumberField(record, "fscEffectiveAgi");
  assertBooleanField(record, "fscEligibleCriteriaMet");
  assertNumberOrNullable(record, "contributionEndMonth");
  assertNumberOrNullable(record, "contributionEndYear");
  return record as CalculationInput;
}

export async function POST(request: Request) {
  try {
    const payload = validateCalculationInput(await request.json());
    const result = calculateProjection(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    console.error("Failed to calculate projection", error);
    return NextResponse.json(
      { error: "Unable to calculate projection." },
      { status: 500 },
    );
  }
}
