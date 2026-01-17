import fs from "fs";
import path from "path";

const root = process.cwd();
const planCsvPath = path.join(root, "src", "data", "plan_level_info.csv");
const planJsonPath = path.join(root, "src", "data", "plan_level_info.json");
const federalTaxCsvPath = path.join(root, "src", "data", "federal_tax_table.csv");
const federalTaxJsonPath = path.join(
  root,
  "src",
  "data",
  "federalTaxBrackets.json",
);
const stateTaxRatesCsvPath = path.join(
  root,
  "src",
  "data",
  "state_tax_table.csv",
);
const stateTaxRatesJsonPath = path.join(
  root,
  "src",
  "data",
  "stateTaxRates.json",
);
const stateTaxDeductionsCsvPath = path.join(
  root,
  "src",
  "data",
  "state_tax_deductions.csv",
);
const stateTaxDeductionsJsonPath = path.join(
  root,
  "src",
  "data",
  "stateTaxDeductions.json",
);
const saversIncomeCsvPath = path.join(
  root,
  "src",
  "data",
  "federal_savers_income_table.csv",
);
const saversBracketsJsonPath = path.join(
  root,
  "src",
  "data",
  "federal_savers_credit_brackets.json",
);

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseBool(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function parseMoney(value) {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function parsePercent(value) {
  const cleaned = String(value || "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  return number / 100;
}

function parseRange(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^over/i.test(raw)) {
    const num = parseMoney(raw);
    if (num == null) return null;
    return { min: num + 1 };
  }

  const rangeSeparator = raw.includes("–") ? "–" : "-";
  if (raw.includes(rangeSeparator)) {
    const parts = raw.split(rangeSeparator).map((part) => part.trim());
    const min = parseMoney(parts[0]);
    const max = parseMoney(parts[1]);
    if (min == null) return null;
    if (max == null) return { min };
    return { min, max };
  }

  const single = parseMoney(raw);
  if (single == null) return null;
  return { min: single };
}

function readCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, ""))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]).map((value) => value.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return headers.reduce((acc, header, idx) => {
      acc[header] = values[idx] ?? "";
      return acc;
    }, {});
  });

  return { headers, rows };
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function generatePlanLevelInfo() {
  if (!fs.existsSync(planCsvPath)) {
    throw new Error(`Missing ${planCsvPath}`);
  }

  const { rows } = readCSV(planCsvPath);
  const data = {};

  rows.forEach((row) => {
    const code = String(row["State Abbrev"] || "").trim().toUpperCase();
    const name = String(row["State Name"] || "").trim();

    if (!code) {
      return;
    }

    data[code] = {
      name,
      hasPlan: parseBool(row["State has Plan"]),
      residencyRequired: parseBool(row["Residency"]),
      parity: parseBool(row["Parity"]),
      maxAccountBalance: parseMoney(row["Maximum Account Balance"]),
    };
  });

  writeJSON(planJsonPath, data);
  return planJsonPath;
}

function generateStateTaxRates() {
  if (!fs.existsSync(stateTaxRatesCsvPath)) {
    throw new Error(`Missing ${stateTaxRatesCsvPath}`);
  }

  const { rows } = readCSV(stateTaxRatesCsvPath);
  const statusMap = {
    Single: "single",
    Joint: "married_joint",
    Separate: "married_separate",
    Head: "head_of_household",
  };
  const data = {};

  const parseIncome = (value) => {
    const raw = String(value || "").trim();
    if (!raw || raw === "-") {
      return 0;
    }
    const parsed = parseMoney(raw);
    return parsed == null ? null : parsed;
  };
  const parseRate = (value) => {
    const raw = String(value || "").trim();
    if (!raw || raw === "-") {
      return 0;
    }
    const parsed = parsePercent(raw);
    return parsed == null ? null : parsed;
  };

  rows.forEach((row) => {
    const code = String(row.StateCode || "").trim().toUpperCase();
    const status = statusMap[String(row.TaxFilingStatus || "").trim()];
    if (!code || !status) {
      return;
    }

    const min = parseIncome(row["Income"]);
    const rateValue = parseRate(row.Rate);
    if (min == null || rateValue == null) {
      return;
    }

    if (!data[code]) {
      data[code] = {};
    }
    if (!data[code][status]) {
      data[code][status] = [];
    }

    data[code][status].push({
      min,
      rate: rateValue,
    });
  });

  Object.values(data).forEach((statusMap) => {
    Object.values(statusMap).forEach((brackets) => {
      brackets.sort((a, b) => a.min - b.min);
      for (let i = 0; i < brackets.length; i += 1) {
        const next = brackets[i + 1];
        if (next && next.min > brackets[i].min) {
          brackets[i].max = next.min - 1;
        }
      }
    });
  });

  writeJSON(stateTaxRatesJsonPath, data);
  return stateTaxRatesJsonPath;
}

function normalizeBenefitType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "deduction") return "deduction";
  if (normalized === "credit") return "credit";
  return "none";
}

function normalizeFilingStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "single") return "single";
  if (normalized === "married filing jointly") return "married_joint";
  if (normalized === "married filing separately") return "married_separate";
  if (normalized === "head of household") return "head_of_household";
  return null;
}

function generateStateTaxDeductions() {
  if (!fs.existsSync(stateTaxDeductionsCsvPath)) {
    throw new Error(`Missing ${stateTaxDeductionsCsvPath}`);
  }

  const { rows } = readCSV(stateTaxDeductionsCsvPath);
  const data = {};

  rows.forEach((row) => {
    const code = String(row["State Abbrev"] || "").trim().toUpperCase();
    const name = String(row["State Name"] || "").trim();
    const status = normalizeFilingStatus(row["Filing Status"]);
    if (!code || !status) {
      return;
    }

    const type = normalizeBenefitType(row["Benefit Type"]);
    const amount = parseMoney(row["Max Deduction/Credit"]) ?? 0;
    const creditPercent = parsePercent(row["Credit Percent"]) ?? 0;

    if (!data[code]) {
      data[code] = { name, benefits: {} };
    }
    if (!data[code].name) {
      data[code].name = name;
    }

    data[code].benefits[status] = {
      type,
      amount,
      creditPercent,
    };
  });

  writeJSON(stateTaxDeductionsJsonPath, data);
  return stateTaxDeductionsJsonPath;
}

function parseSaversBracket(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.includes("≤")) {
    const max = parseMoney(raw);
    if (max == null) return null;
    return { type: "max", value: max, label: raw };
  }

  if (raw.includes(">")) {
    const min = parseMoney(raw);
    if (min == null) return null;
    return { type: "min", value: min, label: raw };
  }

  const range = parseRange(raw);
  if (!range) return null;
  if (range.max == null) {
    return { type: "min", value: range.min, label: raw };
  }
  return { type: "range", min: range.min, max: range.max, label: raw };
}

function generateFederalSaversBrackets() {
  if (!fs.existsSync(saversIncomeCsvPath)) {
    throw new Error(`Missing ${saversIncomeCsvPath}`);
  }

  const { rows } = readCSV(saversIncomeCsvPath);
  const statusHeaders = {
    Single: "single",
    "Married Filing Separately": "married_separate",
    "Married Filing Jointly": "married_joint",
    "Head of Household": "head_of_household",
  };
  const data = [];

  rows.forEach((row) => {
    const creditRate = parsePercent(row["Credit Rate"]);
    if (creditRate == null) return;
    const brackets = {};
    Object.entries(statusHeaders).forEach(([header, status]) => {
      const bracket = parseSaversBracket(row[header]);
      if (!bracket) return;
      brackets[status] = bracket;
    });
    data.push({ creditRate, brackets });
  });

  writeJSON(saversBracketsJsonPath, data);
  return saversBracketsJsonPath;
}

function generateFederalTaxBrackets() {
  if (!fs.existsSync(federalTaxCsvPath)) {
    throw new Error(`Missing ${federalTaxCsvPath}`);
  }

  const { rows } = readCSV(federalTaxCsvPath);
  const statusHeaders = {
    Single: "single",
    "Married Filing Jointly": "married_joint",
    "Married Filing Separately": "married_separate",
    "Head of Household": "head_of_household",
  };
  const data = {
    single: [],
    married_joint: [],
    married_separate: [],
    head_of_household: [],
  };

  rows.forEach((row) => {
    const rate = parsePercent(row["Tax Rate"]);
    if (rate == null) return;
    Object.entries(statusHeaders).forEach(([header, status]) => {
      const range = parseRange(row[header]);
      if (!range) return;
      data[status].push({
        filingStatus: status,
        rate,
        min: range.min,
        ...(range.max != null ? { max: range.max } : {}),
      });
    });
  });

  writeJSON(federalTaxJsonPath, data);
  return federalTaxJsonPath;
}

try {
  const planOutput = generatePlanLevelInfo();
  console.log(`Updated ${planOutput}`);
  const stateTaxRatesOutput = generateStateTaxRates();
  console.log(`Updated ${stateTaxRatesOutput}`);
  const stateTaxDeductionsOutput = generateStateTaxDeductions();
  console.log(`Updated ${stateTaxDeductionsOutput}`);
  const federalSaversOutput = generateFederalSaversBrackets();
  console.log(`Updated ${federalSaversOutput}`);
  const federalTaxOutput = generateFederalTaxBrackets();
  console.log(`Updated ${federalTaxOutput}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
