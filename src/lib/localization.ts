import planLevelInfo from "../data/plan_level_info.json";

export type Language = "en" | "es";

export type FilingStatus =
  | "single"
  | "married_separate"
  | "married_joint"
  | "head_of_household";

export type Cadence = "monthly" | "annual";

export type InvestmentPath = "short_term" | "long_term";

export type FederalSaversTranslations = {
  headline: string;
  description: string;
  optInPrompt: string;
  optInButton: string;
  hideButton: string;
  filingStatusLabel: string;
  agiLabel: string;
  eligibleMessage: string;
  notEligibleMessage: string;
  tooHighMessage: string;
  creditRateLabel: string;
  creditAmountLabel: string;
  earnedIncomeLabel: string;
  taxLiabilityQuestion: string;
  noTaxLiabilityMessage: string;
  ageRequirementQuestion: string;
  studentStatusQuestion: string;
  dependentStatusQuestion: string;
  eligibilityRequirementsMessage: string;
};

export type WorkToAbleTranslations = {
  headline: string;
  description: string;
  optInPrompt: string;
  optInButton: string;
  earnedIncomeQuestion: string;
  employerPlanQuestion: string;
  earnedIncomeAmountLabel: string;
  additionalContributionLabel: string;
  tableHeadline: string;
  tableDescription: string;
  yearLabel: string;
  stateLabel: string;
  eligibleMessage: string;
  ineligibleMessage: string;
  unknownStateMessage: string;
  noDataMessage: string;
  hideButton: string;
  useAccountStateButton: string;
  contributionLimitPrompt: string;
  contributionLimitDeclineMessage: string;
  contributionLimitEligibleMessage: string;
  contributionLimitWithinMessage: string;
  contributionLimitOverMessage: string;
  contributionLimitIneligibleMessage: string;
  contributionLimitWarning: string;
};

export type TranslationSchema = {
  appTitle: string;
  description: string;
  toggles: {
    languageSwitch: string;
    clientPicker: string;
  };
  form: {
    beneficiaryName: string;
    filingStatus: string;
    stateOfResidence: string;
    residencyRestrictionAlert: string;
    startingBalance: string;
    upfrontContribution: string;
    recurringContribution: string;
    recurringCadence: string;
    timeHorizon: string;
    accountAGI: string;
    withdrawalPlan: string;
    withdrawalPlanQuestion: string;
    withdrawalMonthlyAmount: string;
    withdrawalMonthlyStart: string;
    withdrawalAnnualAmount: string;
    withdrawalAnnualStart: string;
    investmentPath: string;
  };
  sections: {
    scenarioInputs: string;
    amortizationHeadline: string;
    amortizationHelp: string;
    disclosureHeadline: string;
    taxBenefitsHeading: string;
  };
  scenarioValues: {
    month: string;
    contributions: string;
    earnings: string;
    monthlyWithdrawals: string;
    annualWithdrawals: string;
    withdrawals: string;
    balance: string;
  };
  statuses: Record<FilingStatus, string>;
  cadence: Record<Cadence, string>;
  investments: Record<InvestmentPath, string>;
  actions: {
    runSimulation: string;
  };
  buttons: {
    viewAmortization: string;
  };
  disclosure: string;
  workToAble: WorkToAbleTranslations;
  federalSavers: FederalSaversTranslations;
};

const baseTranslations: Record<Language, TranslationSchema> = {
  en: {
    appTitle: "ABLE Planning Calculator",
    description:
      "Mobile-first, bilingual scenario planning engineered for licensed state programs.",
    toggles: {
      languageSwitch: "Language",
      clientPicker: "Client profile",
    },
    form: {
      beneficiaryName: "Beneficiary name",
      filingStatus: "Account owner's tax filing status",
      stateOfResidence: "Account owner's state",
      residencyRestrictionAlert:
        "You are not allowed to invest in this state's ABLE plan because you are not a resident of this state.",
      startingBalance: "Current ABLE balance",
      upfrontContribution: "Additional up-front contribution",
      recurringContribution: "Recurring contribution amount",
      recurringCadence: "Contribution cadence",
      timeHorizon: "Time horizon (years)",
      accountAGI: "Account owner's AGI",
      withdrawalPlan: "Withdrawal planning (optional)",
      withdrawalPlanQuestion:
        "Would you like to plan for withdrawals from your account?",
      withdrawalMonthlyAmount: "Monthly withdrawal amount",
      withdrawalMonthlyStart: "Monthly withdrawal start (month/year)",
      withdrawalAnnualAmount: "Annual lump-sum withdrawal amount",
      withdrawalAnnualStart: "Annual withdrawal start (month/year)",
      investmentPath: "Investment horizon",
    },
    sections: {
      scenarioInputs: "Scenario inputs",
      amortizationHeadline: "Amortization schedule",
      amortizationHelp:
        "Monthly rows compound annual rate, contributions, and withdrawals.",
      disclosureHeadline: "Disclosures",
      taxBenefitsHeading: "Federal and State Tax Benefits",
    },
    scenarioValues: {
      month: "Month",
      contributions: "Account owner contributions",
      earnings: "Earnings",
      monthlyWithdrawals: "Monthly withdrawals",
      annualWithdrawals: "Annual withdrawals",
      withdrawals: "Withdrawals",
      balance: "Ending balance",
    },
    statuses: {
      single: "Single",
      married_separate: "Married filing separately",
      married_joint: "Married filing jointly",
      head_of_household: "Head of household",
    },
    cadence: {
      monthly: "Monthly",
      annual: "Annual",
    },
    investments: {
      short_term: "Short-term investment option",
      long_term: "Long-term investment option",
    },
    actions: {
      runSimulation: "Refresh schedule",
    },
    buttons: {
      viewAmortization: "View Amortization Schedule",
    },
    disclosure:
      "This tool is for planning purposes only; state-licensed ABLE plans may have other disclosures.",
    workToAble: {
      headline: "Work to ABLE eligibility",
      description:
        "Opt in for an additional check that compares earned income and federal poverty data to determine if Work to ABLE contributions are available.",
      optInPrompt: "Would you like to see if the beneficiary qualifies?",
      optInButton: "Check eligibility",
      earnedIncomeQuestion: "Does the beneficiary have earned income?",
      employerPlanQuestion:
        "Is the beneficiary covered by an employer-sponsored retirement plan?",
      earnedIncomeAmountLabel: "Beneficiary earned income",
      additionalContributionLabel: "Potential Work to ABLE excess contribution",
      tableHeadline: "Federal Poverty Level (1-person household)",
      tableDescription:
        "IRS-published poverty levels by state; update this table whenever new guidance is released.",
      yearLabel: "Year",
      stateLabel: "State",
      eligibleMessage:
        "The beneficiary appears eligible for the Work to ABLE excess contribution.",
      ineligibleMessage:
        "The beneficiary does not qualify for Work to ABLE contributions based on the current responses.",
      unknownStateMessage: "Select a state to see the relevant poverty level.",
      noDataMessage: "No poverty level data is available for that year.",
      hideButton: "Hide eligibility",
      useAccountStateButton: "Use account state",
      contributionLimitPrompt:
        "Your planned contributions exceed the statutory federal limit of {limit}. However, under certain conditions you may qualify to make additional Work to ABLE contributions. Would you like to find out if you qualify?",
      contributionLimitDeclineMessage:
        "Please revise your planned contributions so no year exceeds the federal limit of {limit}.",
      contributionLimitEligibleMessage:
        "You qualify for an annual contribution limit of {limit}.",
      contributionLimitWithinMessage:
        "Your planned contributions are within the combined limit of {limit}.",
      contributionLimitOverMessage:
        "You may contribute up to {limit}, but your planned contributions still exceed that combined limit.",
      contributionLimitIneligibleMessage:
        "You do not qualify for Work to ABLE contributions. Please revise your planned contributions so no year exceeds the federal limit of {limit}.",
      contributionLimitWarning:
        "Total contributions cannot exceed {limit} per year.",
    },
    federalSavers: {
      headline: "Federal Savers Credit",
      description:
        "Optional check to see if the beneficiary qualifies for a Federal Savers Credit based on their AGI and filing status.",
      optInPrompt:
        "Would you like to check the beneficiary's Federal Savers Credit eligibility?",
      optInButton: "Check Federal Savers Credit",
      hideButton: "Hide Federal Savers Credit",
      filingStatusLabel: "Beneficiary filing status",
      agiLabel: "Beneficiary AGI",
      earnedIncomeLabel: "Eligible contribution amount",
      taxLiabilityQuestion: "Does the beneficiary have tax liability?",
      ageRequirementQuestion: "Is the beneficiary older than 18?",
      studentStatusQuestion: "Is the beneficiary a full-time student?",
      dependentStatusQuestion: "Is the beneficiary claimed as a dependent?",
      eligibleMessage: "This AGI falls within the {credit}% credit bracket.",
      notEligibleMessage:
        "The beneficiary is not eligible for the Federal Savers Credit at this AGI.",
      tooHighMessage:
        "The AGI exceeds the maximum for any Federal Savers Credit benefit.",
      creditRateLabel: "Credit rate",
      creditAmountLabel: "Estimated credit amount",
      noTaxLiabilityMessage:
        "The beneficiary is not eligible for the Federal Savers Credit without tax liability.",
      eligibilityRequirementsMessage:
        "To claim the credit: beneficiary is over 18, not a full-time student, and not claimed as a dependent.",
    },
  },
  es: {
    appTitle: "Calculadora de planificación ABLE",
    description:
      "Escenario bilingüe y móvil diseñado para programas estatales licenciados.",
    toggles: {
      languageSwitch: "Idioma",
      clientPicker: "Perfil del cliente",
    },
    form: {
      beneficiaryName: "Nombre del beneficiario",
      filingStatus: "Estado civil fiscal del propietario",
      stateOfResidence: "Estado de residencia del propietario",
      residencyRestrictionAlert:
        "No está permitido invertir en este plan ABLE estatal porque no es residente de este estado.",
      startingBalance: "Saldo actual de ABLE",
      upfrontContribution: "Aporte único adicional",
      recurringContribution: "Cantidad de contribución periódica",
      recurringCadence: "Cadencia de contribución",
      timeHorizon: "Horizonte temporal (años)",
      accountAGI: "AGI del propietario",
      withdrawalPlan: "Plan de retiros (opcional)",
      withdrawalPlanQuestion:
        "¿Desea planificar retiros de su cuenta?",
      withdrawalMonthlyAmount: "Monto de retiro mensual",
      withdrawalMonthlyStart: "Inicio del retiro mensual (mes/año)",
      withdrawalAnnualAmount: "Monto de retiro anual único",
      withdrawalAnnualStart: "Inicio del retiro anual (mes/año)",
      investmentPath: "Horizonte de inversión",
    },
    sections: {
      scenarioInputs: "Entradas del escenario",
      amortizationHeadline: "Programa de amortización",
      amortizationHelp:
        "Las filas mensuales reflejan la tasa anual, contribuciones y retiros.",
      disclosureHeadline: "Divulgaciones",
      taxBenefitsHeading: "Beneficios fiscales federales y estatales",
    },
    scenarioValues: {
      month: "Mes",
      contributions: "Contribuciones",
      earnings: "Ganancias",
      monthlyWithdrawals: "Retiros mensuales",
      annualWithdrawals: "Retiros anuales",
      withdrawals: "Retiros",
      balance: "Saldo final",
    },
    statuses: {
      single: "Soltero/a",
      married_separate: "Casado/a declarando por separado",
      married_joint: "Casado/a declarando en conjunto",
      head_of_household: "Jefe/a de familia",
    },
    cadence: {
      monthly: "Mensual",
      annual: "Anual",
    },
    investments: {
      short_term: "Opción de inversión a corto plazo",
      long_term: "Opción de inversión a largo plazo",
    },
    actions: {
      runSimulation: "Actualizar cronograma",
    },
    buttons: {
      viewAmortization: "Ver cronograma de amortización",
    },
    disclosure:
      "Esta herramienta es solo para planificación; los planes estatales ABLE pueden tener otras divulgaciones.",
    workToAble: {
      headline: "Elegibilidad Work to ABLE",
      description:
        "Activa esta comprobación adicional para comparar ingresos ganados y el nivel de pobreza federal y ver si hay contribuciones Work to ABLE disponibles.",
      optInPrompt: "¿Desea saber si el beneficiario califica?",
      optInButton: "Calcular elegibilidad",
      earnedIncomeQuestion: "¿El beneficiario tiene ingresos ganados?",
      employerPlanQuestion:
        "¿Está el beneficiario cubierto por un plan de jubilación del empleador?",
      earnedIncomeAmountLabel: "Ingresos ganados del beneficiario",
      additionalContributionLabel:
        "Posible contribución adicional Work to ABLE",
      tableHeadline: "Nivel de pobreza federal (hogar de una persona)",
      tableDescription:
        "Los niveles de pobreza publicados por el IRS por estado; actualice esta tabla cuando haya orientación nueva.",
      yearLabel: "Año",
      stateLabel: "Estado",
      eligibleMessage:
        "El beneficiario parece calificar para la contribución adicional Work to ABLE.",
      ineligibleMessage:
        "El beneficiario aún no califica para las contribuciones Work to ABLE según las respuestas actuales.",
      unknownStateMessage: "Seleccione un estado para ver su nivel de pobreza.",
      noDataMessage: "No hay datos de nivel de pobreza para ese año.",
      hideButton: "Ocultar elegibilidad",
      useAccountStateButton: "Usar estado de cuenta",
      contributionLimitPrompt:
        "Sus contribuciones planificadas superan el límite federal de {limit}. Sin embargo, bajo ciertas condiciones podría calificar para contribuciones adicionales Work to ABLE. ¿Desea verificar si califica?",
      contributionLimitDeclineMessage:
        "Ajuste sus contribuciones planificadas para que ningún año supere el límite federal de {limit}.",
      contributionLimitEligibleMessage:
        "Califica para un límite anual de contribución de {limit}.",
      contributionLimitWithinMessage:
        "Sus contribuciones planificadas están dentro del límite combinado de {limit}.",
      contributionLimitOverMessage:
        "Puede contribuir hasta {limit}, pero sus contribuciones planificadas aún superan ese límite combinado.",
      contributionLimitIneligibleMessage:
        "No califica para contribuciones Work to ABLE. Ajuste sus contribuciones planificadas para que ningún año supere el límite federal de {limit}.",
      contributionLimitWarning:
        "Las contribuciones totales no pueden superar {limit} al año.",
    },
    federalSavers: {
      headline: "Crédito Federal Savers",
      description:
        "Verificación opcional para determinar si el beneficiario califica para el Crédito Federal Savers según su AGI y estado civil.",
      optInPrompt:
        "¿Desea revisar la elegibilidad del beneficiario para el Crédito Federal Savers?",
      optInButton: "Verificar Crédito Savers",
      hideButton: "Ocultar Crédito Savers",
      filingStatusLabel: "Estado civil fiscal del beneficiario",
      agiLabel: "AGI del beneficiario",
      earnedIncomeLabel: "Monto de contribución elegible",
      taxLiabilityQuestion: "¿El beneficiario tiene obligación tributaria?",
      ageRequirementQuestion: "¿El beneficiario tiene más de 18 años?",
      studentStatusQuestion: "¿El beneficiario es estudiante de tiempo completo?",
      dependentStatusQuestion:
        "¿El beneficiario figura como dependiente en la declaración?",
      eligibleMessage: "Este AGI califica para un crédito del {credit}%.",
      notEligibleMessage:
        "El beneficiario no califica para el Crédito Federal Savers con este AGI.",
      tooHighMessage:
        "El AGI supera el máximo permitido para obtener un beneficio del Crédito Savers.",
      creditRateLabel: "Tasa del crédito",
      creditAmountLabel: "Monto estimado del crédito",
      noTaxLiabilityMessage:
        "El beneficiario no califica para el Crédito Federal Savers sin obligación tributaria.",
      eligibilityRequirementsMessage:
        "Para reclamar el crédito: mayor de 18, no estudiante de tiempo completo y no dependiente.",
    },
  },
};

export type ClientConfig = {
  id: string;
  label: string;
  defaultAnnualReturns: Record<InvestmentPath, number>;
  planStateCode?: string;
  planState: string;
  investmentHorizonThresholdYears?: number;
  translations?: Partial<Record<Language, Partial<TranslationSchema>>>;
};

const baseAnnualReturns = {
  short_term: 0.04,
  long_term: 0.06,
};

type StatePlanMetadata = {
  name: string;
  hasPlan: boolean;
};

const stateOverridesByCode: Partial<Record<string, Partial<ClientConfig>>> = {
  CA: {
    defaultAnnualReturns: {
      short_term: 0.035,
      long_term: 0.055,
    },
    translations: {
      en: {
        disclosure:
          "California SILO ABLE rules apply; consult the state disclosure before relying on the projection.",
      },
      es: {
        disclosure:
          "Aplican las reglas de California SILO ABLE; consulte la divulgación estatal antes de usar esta proyección.",
      },
    },
  },
  FL: {
    defaultAnnualReturns: {
      short_term: 0.045,
      long_term: 0.065,
    },
    translations: {
      en: {
        disclosure:
          "Florida ABLE plan has state-specific tax advantages; verify with the state before acting.",
      },
      es: {
        disclosure:
          "El plan ABLE de Florida tiene ventajas fiscales específicas; verifique con el estado antes de actuar.",
      },
    },
  },
};

const stateEntries = Object.entries(
  planLevelInfo as Record<string, StatePlanMetadata>,
)
  .filter(([, data]) => data.hasPlan)
  .sort((a, b) => a[1].name.localeCompare(b[1].name));

const stateClientConfigMap = stateEntries.reduce(
  (acc, [code, data]) => {
    const override = stateOverridesByCode[code];
    const stateName = data.name;
    const label =
      stateName === "District of Columbia"
        ? "District of Columbia plan"
        : `State of ${stateName} plan`;
    const id = `state-${code.toLowerCase()}`;

    acc[id] = {
      id,
      label,
      defaultAnnualReturns: override?.defaultAnnualReturns ?? {
        ...baseAnnualReturns,
      },
      planState: stateName,
      planStateCode: code,
      translations: override?.translations,
    };

    return acc;
  },
  {} as Record<string, ClientConfig>,
);

const clientConfigurations: Record<string, ClientConfig> = {
  base: {
    id: "base",
    label: "Base ABLE configuration",
    defaultAnnualReturns: { ...baseAnnualReturns },
    planState: "Licensed base plan",
    planStateCode: "",
    investmentHorizonThresholdYears: 3,
  },
  ...stateClientConfigMap,
};

export const availableClients = Object.values(clientConfigurations);

export function getClientConfig(clientId?: string): ClientConfig {
  return clientConfigurations[clientId ?? "base"] ?? clientConfigurations.base;
}

export function getLocalizedStrings(
  lang: Language,
  clientId?: string,
): TranslationSchema {
  const base = baseTranslations[lang];
  const client = getClientConfig(clientId);
  const overrides = client.translations?.[lang] ?? {};

  return {
    ...base,
    ...overrides,
    form: {
      ...base.form,
      ...(overrides.form ?? {}),
    },
    sections: {
      ...base.sections,
      ...(overrides.sections ?? {}),
    },
    scenarioValues: {
      ...base.scenarioValues,
      ...(overrides.scenarioValues ?? {}),
    },
    statuses: {
      ...base.statuses,
      ...(overrides.statuses ?? {}),
    },
    cadence: {
      ...base.cadence,
      ...(overrides.cadence ?? {}),
    },
    investments: {
      ...base.investments,
      ...(overrides.investments ?? {}),
    },
    toggles: {
      ...base.toggles,
      ...(overrides.toggles ?? {}),
    },
    actions: {
      ...base.actions,
      ...(overrides.actions ?? {}),
    },
    workToAble: {
      ...base.workToAble,
      ...(overrides.workToAble ?? {}),
    },
    federalSavers: {
      ...base.federalSavers,
      ...(overrides.federalSavers ?? {}),
    },
  };
}
