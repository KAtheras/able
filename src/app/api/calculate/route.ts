import { NextResponse } from "next/server";

import { calculateProjection } from "../../../server/calculations/calculateProjection";
import type { CalculationInput } from "../../../types/calculations";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CalculationInput;
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }
    const result = calculateProjection(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to calculate projection." },
      { status: 400 },
    );
  }
}
