import { describe, expect, it } from "vitest";

import { GET as disclosuresGet } from "../src/app/api/disclosures/[clientId]/route";
import { POST as calculatePost } from "../src/app/api/calculate/route";

describe("API smoke tests", () => {
  it("/api/calculate responds to a minimal valid payload", async () => {
    const payload = {
      startingBalance: "0",
      beneficiaryUpfrontContribution: "0",
      beneficiaryRecurringContribution: "0",
      beneficiaryRecurringCadence: "monthly",
      monthlyWithdrawalAmount: "0",
      monthlyWithdrawalStartMonth: "01",
      monthlyWithdrawalStartYear: "2024",
      withdrawalPlanDecision: false,
      annualReturnOverride: "0.00",
      timeHorizonYears: "1",
      currentYear: 2024,
      planMaxBalance: null,
      isSsiBeneficiary: false,
      filingStatus: "single",
      accountAGI: "0",
      stateCode: "IL",
      fscEffectiveFilingStatus: "single",
      fscEffectiveAgi: 0,
      fscEligibleCriteriaMet: false,
      contributionEndMonth: null,
      contributionEndYear: null,
    };

    const response = await calculatePost(
      new Request("http://localhost/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  it("/api/disclosures/[clientId] responds for a supported client", async () => {
    const clientId = "IL";
    const request = new Request(
      `http://localhost/api/disclosures/${clientId}?locale=en-US`,
    );
    const response = await disclosuresGet(request, {
      params: Promise.resolve({ clientId }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload?.clientId).toBe(clientId);
    expect(payload?.locale).toBe("en-US");
  });
});
