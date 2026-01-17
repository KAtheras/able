"use client";

export const uiPreviewCopy = {
  en: {
    locale: "en-US",
    header: {
      bannerPlaceholder: "Client banner placeholder",
      clientName: "Client name / logo",
      clientSubtitle: "Header area supplied by client website.",
    },
    themes: {
      base: "Base theme",
      ca: "California theme",
      il: "Illinois theme",
      ut: "Utah theme",
      tx: "Texas theme",
    },
    languageLabel: "Language",
    screenLabel: (current: number, total: number) =>
      `Screen ${current} of ${total}`,
    steps: [
      {
        title: "Basics + Assumptions",
        subtitle: "Identity, plan settings, and return assumptions",
      },
      {
        title: "Contributions + Withdrawals",
        subtitle: "Funding plan and withdrawal scheduling",
      },
      {
        title: "Report",
        subtitle: "Preview summary and open the amortization schedule",
      },
    ],
    cadenceLabels: {
      monthly: "Monthly",
      annual: "Annual",
    },
    filingStatusLabels: {
      single: "Single",
      married_joint: "Married filing jointly",
      married_separate: "Married filing separately",
      head_of_household: "Head of household",
    },
    monthNamesShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    monthNamesLong: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    selectMonthPlaceholder: "Select month",
    table: {
      month: "Month",
      contributions: "Contributions",
      monthlyWithdrawals: "Monthly withdrawals",
      earnings: "Earnings",
      balance: "Balance",
      federalTax: "Federal tax",
      stateTax: "State tax",
      federalSaversCredit: "Federal Savers credit",
      stateTaxDeductionCredit: "State Tax Deduction / Credit",
      taxBenefitsHeading: "Federal and State Tax Benefits",
    },
    report: {
      title: "Report",
      subtitle: "Highlights from the scenario and projected outcomes.",
      cards: {
        startingBalance: {
          label: "Starting balance",
          note: "Balance at the start of the period.",
        },
        totalContributions: {
          label: "Total contributions",
          note: "Planned contributions over the time horizon.",
        },
        endingBalance: {
          label: "Projected ending balance",
          note: "Balance at the end of the plan horizon.",
        },
        investmentEarnings: {
          label: "Investment earnings",
          note: "Total earnings across the projection.",
        },
        averageAnnualReturns: {
          label: "Average annual returns",
          note: "",
        },
        averageAnnualReturnAble: {
          label: "Average annual return (ABLE)",
          note:
            "Includes investment earnings plus federal savers credit and state contribution tax benefits.",
        },
        averageAnnualReturnTaxable: {
          label: "Average annual return (taxable)",
          note: "Investment earnings reduced by federal and state taxes.",
        },
        averageAnnualReturnFederalSavers: {
          label: "Federal Savers Credit (annualized)",
          note: "Incremental annualized return impact from Federal Savers Credit.",
        },
        averageAnnualReturnStateDeduction: {
          label: "State contribution tax benefit (annualized)",
          note: "Incremental annualized return impact from state deductions or credits.",
        },
        totalWithdrawals: {
          label: "Total withdrawals",
          note: "Planned withdrawals over the time horizon.",
        },
        taxBenefits: {
          label: "Tax Benefits",
          note: "",
        },
        viewToggle: {
          tables: "Tables",
          charts: "Charts",
        },
        averageAnnualReturnsTable: {
          labelHeader: "Component",
          valueHeader: "Average annual return",
          items: {
            ableBase: "ABLE account base annual average return",
            stateDeduction: "State tax deduction/credit on contributions",
            federalSavers: "Federal Saver's Credit",
            ableTotal: "Total ABLE account average annual return",
            taxesOnEarnings: "Federal and state taxes on earnings",
            taxable: "Average annual return of a taxable account",
          },
        },
      },
      charts: {
        balance: {
          title: "Balance over time",
          subtitle: "Net contributions and ending balance over time.",
          legendContributions: "Net contributions",
          legendEarnings: "Ending balance",
        },
      },
      taxBenefits: {
        tooltip: "Tax benefits details.",
        infoLabel: "Tax benefits info",
        returnImpactLabel: "ABLE vs taxable return impact",
        chartDescription:
          "Tax benefits breakdown with amounts listed by category below.",
        waterfallLabels: {
          ableBase: "ABLE account",
          stateImpact: "State tax on contributions",
          federalImpact: "Federal Savers Credit",
          ableTotal: "ABLE with tax benefits",
          taxable: "Taxable investment account",
        },
        waterfallSeries: {
          offset: "Offset",
          return: "Return",
        },
        items: {
          federalTax: {
            label: "Federal tax savings",
            note: "Savings on federal taxes from plan earnings",
          },
          stateTax: {
            label: "State tax savings",
            note: "Savings on state taxes from plan earnings",
          },
          federalSavers: {
            label: "Federal Savers Credit",
            note: "Credit received on contributions",
          },
          stateDeduction: {
            label: "State deduction / credit",
            note: "State benefit on contributions",
          },
        },
        table: {
          caption: "Tax benefits breakdown",
          categoryHeader: "Category",
          amountHeader: "Amount",
          totalLabel: "Total",
        },
      },
    },
    labels: {
      beneficiary: "Beneficiary",
      contributionsParent: "Contributions",
      monthlyWithdrawalsTitle: "Monthly withdrawals",
      amountShort: "Amount",
      startShort: "Start",
      advanced: "Advanced",
      ssiBenefitsQuestion:
        "Beneficiary is receiving or is expected to receive SSI benefits.",
      taxFilingStatus: "Tax filing status",
      timeHorizonYears: "Time horizon (max 50 years)",
      stateOfResidence: "State of residence",
      adjustedGrossIncome: "Adjusted Gross Income",
      annualReturnAssumption: "Annual Investment Return",
      startingBalance: "Starting balance",
      upfrontContribution: "Up-front",
      recurringContribution: "Recurring",
      contributionCadence: "Cadence",
      monthlyWithdrawalAmount: "Monthly withdrawal amount",
      monthlyStart: "Monthly start (month/year)",
      month: "Month",
      year: "Year",
      totalContributions: "Total contributions",
      endingBalance: "Ending balance",
      reportPlaceholder:
        "Report placeholder. Additional charts and insights will live here.",
    },
    residency: {
      restrictedMessage: (stateName: string) =>
        `The beneficiary is not eligible to open a ${stateName} Able account because ${stateName} Able plan requires the beneficiary to be a resident of ${stateName}. You should check to see if your home state offers an Able plan, which may provide certain state tax benefits.`,
      openMessage:
        "You should check to see if your home state offers an Able plan, which may provide certain state tax benefits.",
      actionLabel: "Change my residency and proceed to the calculator",
    },
    buttons: {
      back: "Back",
      next: "Next",
      openSchedule: "View Amortization Schedule",
      done: "Done",
      planMonthlyWithdrawals: "Plan monthly withdrawals",
      checkEligibility: "Check eligibility",
      viewAnnualReturns: "Compare ABLE vs taxable investment account",
      backToTaxBenefits: "Back to tax benefits",
    },
    federalSavers: {
      buttonEligible: "Eligible for Federal Savers Credit",
      buttonIneligible: "Ineligible for Federal Savers Credit",
      buttonDefault: "Find out Federal Savers Credit eligibility",
      eligibilityTitle: "Federal Savers Credit eligibility",
      closeEligibility: "Close Federal Savers Credit eligibility",
      questions: {
        hasTaxLiability: "Does the beneficiary have tax liability?",
        isOver18: "Is the beneficiary older than 18?",
        isStudent: "Is the beneficiary a full-time student?",
        isDependent: "Is the beneficiary claimed as a dependent?",
      },
      disqualifyingMessages: {
        noTaxLiability: "Not eligible: no tax liability.",
        under18: "Not eligible: beneficiary must be older than 18.",
        student: "Not eligible: full-time students are not eligible.",
        dependent: "Not eligible: dependents are not eligible.",
      },
      resultMessages: {
        answerQuestions: "Answer the questions above to see eligibility.",
        enterAgi: "Enter adjusted gross income to determine eligibility.",
        eligible: "Eligible for the Federal Savers Credit.",
        ineligible: "Not eligible based on income and filing status.",
      },
    },
    workToAble: {
      prompt: (annualLimit: string) =>
        `Your planned contributions exceed the annual ABLE limit of ${annualLimit}. If you are working, you may qualify to contribute more (the “work to ABLE” provision). Would you like to find out if you qualify?`,
      title: "Work to ABLE",
      declineMessage: (annualLimit: string) =>
        `Please revise your contribution amounts to bring total contributions below the annual limit of ${annualLimit}.`,
      ineligibleMessage: (annualLimit: string) =>
        `Based on information you provided, you do not qualify to make work-to-able contributions. Please revise your contribution amounts to bring total contributions below the annual limit of ${annualLimit}.`,
      applyMaxPrompt:
        "Would you like to set contributions to the maximum allowed amount?",
      applyMaxNoteMonthlyFirst:
        "We'll reduce the recurring contribution to keep a full calendar year within the limit. If the current year is still over because of the up-front amount, we'll reduce that too.",
      applyMaxNoteUpfront: (limit: string) =>
        `Your up-front contribution alone exceeds the limit. Selecting yes will reduce the up-front amount to fit within ${limit}.`,
      overagePeriodCurrentYear: "Current year (remaining months)",
      overagePeriodNextFullYear: "Next full year (12 months)",
      amountOverLabel: "Amount over the annual limit:",
      amountOverCombinedLabel: "Amount over the combined limits:",
      eligibleWithin: (additional: string, combined: string) =>
        `You qualify for additional contributions of ${additional}. Your contributions are within the combined limit of ${combined}.`,
      eligibleOver: (additional: string, combined: string) =>
        `You qualify for additional contributions of ${additional}, but your total contributions exceed the combined limit of ${combined}. Please revise your contribution amounts to bring total contributions below the combined limit of ${combined}.`,
      earnedIncomeQuestion: "Does the beneficiary have earned income?",
      employerPlanQuestion: "Is the beneficiary covered by a retirement plan?",
    },
    warnings: {
      planMaxStop: (planMax: string, stopMonth: string) =>
        `In this planning tool, contributions stop in ${stopMonth} because the projected balance reaches the plan maximum of ${planMax}.`,
      planAndSsi: (planMax: string, ssiLimit: string) =>
        `Based on your planned contributions and earnings assumptions, the account is projected to exceed the plan maximum (${planMax}). It also exceeds ${ssiLimit}, which may result in suspension of SSI benefits and adverse financial impact.`,
      planOnly: (planMax: string) =>
        `Based on your planned contributions and earnings assumptions, the account is projected to exceed the plan maximum (${planMax}).`,
      ssiOnly: (ssiLimit: string, yearSuffix: string) =>
        `Based on your planned contributions and earnings assumptions, the account is projected to exceed ${ssiLimit}${yearSuffix}. This may result in suspension of SSI benefits and adverse financial impact.`,
      yearSuffix: (year: number) => ` in ${year}`,
      warningNote:
        "Additionally, keeping contributions at these elevated levels without offsetting withdrawals will cause this planning tool to produce future balances and returns that are not realistic.",
      understand: "I understand",
    },
    misc: {
      yes: "Yes",
      no: "No",
      removeWithdrawal: "Remove withdrawal amounts",
      disclosurePlaceholder:
        "Disclosure placeholder text. This content will be replaced with final disclosure language.",
      pdfFootnotes: [
        "Figures are estimates for planning purposes only.",
      ],
      pdfDisclosures: [
        "Projections are not guarantees of future results.",
      ],
      stepHeaders: {
        demographics: "Demographics and Investment Assumptions",
        accountActivity: "Account Activity Plan",
        horizonPrompt: "Choose time horizon to see balances",
      },
      horizonMaxLabel: "Max",
      horizonYearSuffix: "Y",
      contributionsWithdrawals: "Contributions / Withdrawals",
      amortizationSchedule: "Amortization schedule",
    },
    accessibility: {
      printReport: "Print report",
      refresh: "Refresh",
      startingBalanceInfo: "Starting balance info",
      estimatedEarnedIncomeInfo: "Estimated earned income info",
    },
    tooltips: {
      startingBalance:
        "This amount must represent a starting or rolled over Able balance or a rollover from a Section 529 College Savings Plan",
      earnedIncome: {
        prompt: "Please input estimated earned income:",
        lead:
          "This is different than Adjusted Gross Income. Earned income is money you receive from working - either as an employee or through self-employment.",
        includedTitle: "What is included as earned income",
        includedItems: [
          "Wages, salaries, and tips",
          "Hourly pay",
          "Commissions",
          "Bonuses",
          "Self-employment or freelance income (net earnings)",
          "Taxable employee benefits (if paid as wages)",
          "Union strike benefits (in many contexts)",
        ],
        excludedTitle: "What is excluded (not earned income)",
        excludedItems: [
          "Investment income (interest, dividends, capital gains)",
          "Rental income (unless it is your active business)",
          "Pensions and annuities",
          "Social Security benefits (including SSI, SSDI)",
        ],
      },
    },
  },
  es: {
    locale: "es-US",
    header: {
      bannerPlaceholder: "Marcador de banner del cliente",
      clientName: "Nombre / logo del cliente",
      clientSubtitle: "Área del encabezado proporcionada por el sitio del cliente.",
    },
    themes: {
      base: "Tema base",
      ca: "Tema de California",
      il: "Tema de Illinois",
      ut: "Tema de Utah",
      tx: "Tema de Texas",
    },
    languageLabel: "Idioma",
    screenLabel: (current: number, total: number) =>
      `Pantalla ${current} de ${total}`,
    steps: [
      {
        title: "Datos básicos + Supuestos",
        subtitle: "Identidad, configuración del plan y supuestos de rendimiento",
      },
      {
        title: "Contribuciones + Retiros",
        subtitle: "Financiación del plan y programación de retiros",
      },
      {
        title: "Informe",
        subtitle: "Resumen del escenario y cronograma de amortización",
      },
    ],
    cadenceLabels: {
      monthly: "Mensual",
      annual: "Anual",
    },
    filingStatusLabels: {
      single: "Soltero",
      married_joint: "Casado declarando conjuntamente",
      married_separate: "Casado declarando por separado",
      head_of_household: "Cabeza de familia",
    },
    monthNamesShort: [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ],
    monthNamesLong: [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ],
    selectMonthPlaceholder: "Selecciona un mes",
    table: {
      month: "Mes",
      contributions: "Contribuciones",
      monthlyWithdrawals: "Retiros mensuales",
      earnings: "Ganancias",
      balance: "Saldo",
      federalTax: "Impuesto federal",
      stateTax: "Impuesto estatal",
      federalSaversCredit: "Crédito federal del ahorrador",
      stateTaxDeductionCredit: "Deducción / crédito fiscal estatal",
      taxBenefitsHeading: "Beneficios fiscales federales y estatales",
    },
    report: {
      title: "Informe",
      subtitle: "Aspectos destacados del escenario y resultados proyectados.",
      cards: {
        startingBalance: {
          label: "Saldo inicial",
          note: "Saldo al inicio del período.",
        },
        totalContributions: {
          label: "Contribuciones totales",
          note: "Contribuciones planificadas durante el horizonte de tiempo.",
        },
        endingBalance: {
          label: "Saldo final proyectado",
          note: "Saldo al final del horizonte del plan.",
        },
        investmentEarnings: {
          label: "Ganancias de inversión",
          note: "Ganancias totales durante la proyección.",
        },
        averageAnnualReturns: {
          label: "Rendimientos anuales promedio",
          note: "",
        },
        averageAnnualReturnAble: {
          label: "Rendimiento anual promedio (ABLE)",
          note:
            "Incluye ganancias de inversión más el crédito del ahorrador federal y beneficios fiscales estatales.",
        },
        averageAnnualReturnTaxable: {
          label: "Rendimiento anual promedio (imponible)",
          note: "Ganancias de inversión reducidas por impuestos federales y estatales.",
        },
        averageAnnualReturnFederalSavers: {
          label: "Crédito federal del ahorrador (anualizado)",
          note:
            "Impacto anualizado incremental del Crédito Federal del Ahorrador.",
        },
        averageAnnualReturnStateDeduction: {
          label: "Beneficio fiscal estatal (anualizado)",
          note:
            "Impacto anualizado incremental de deducciones o créditos estatales.",
        },
        totalWithdrawals: {
          label: "Retiros totales",
          note: "Retiros planificados durante el horizonte de tiempo.",
        },
        taxBenefits: {
          label: "Beneficios fiscales",
          note: "",
        },
        viewToggle: {
          tables: "Tablas",
          charts: "Gráficos",
        },
        averageAnnualReturnsTable: {
          labelHeader: "Componente",
          valueHeader: "Rendimiento anual promedio",
          items: {
            ableBase: "Rendimiento anual promedio base de la cuenta ABLE",
            stateDeduction: "Deduccion/credito estatal sobre contribuciones",
            federalSavers: "Credito federal del ahorrador",
            ableTotal: "Rendimiento anual promedio total de la cuenta ABLE",
            taxesOnEarnings: "Impuestos federales y estatales sobre las ganancias",
            taxable: "Rendimiento anual promedio de una cuenta imponible",
          },
        },
      },
      charts: {
        balance: {
          title: "Saldo a lo largo del tiempo",
          subtitle: "Contribuciones netas y saldo final a lo largo del tiempo.",
          legendContributions: "Contribuciones netas",
          legendEarnings: "Saldo final",
        },
      },
      taxBenefits: {
        tooltip: "Detalles de beneficios fiscales.",
        infoLabel: "Información de beneficios fiscales",
        returnImpactLabel: "Impacto de rendimiento ABLE vs imponible",
        chartDescription:
          "Desglose de beneficios fiscales con montos listados por categoría abajo.",
        waterfallLabels: {
          ableBase: "Cuenta ABLE",
          stateImpact: "Impuesto estatal sobre contribuciones",
          federalImpact: "Crédito Federal del Ahorrador",
          ableTotal: "ABLE con beneficios fiscales",
          taxable: "Cuenta de inversión imponible",
        },
        waterfallSeries: {
          offset: "Desfase",
          return: "Retorno",
        },
        items: {
          federalTax: {
            label: "Ahorro de impuesto federal",
            note: "Ahorro en impuestos federales por ganancias del plan",
          },
          stateTax: {
            label: "Ahorro de impuesto estatal",
            note: "Ahorro en impuestos estatales por ganancias del plan",
          },
          federalSavers: {
            label: "Crédito del Ahorrador",
            note: "Crédito recibido por contribuciones",
          },
          stateDeduction: {
            label: "Deducción / crédito estatal",
            note: "Beneficio estatal por contribuciones",
          },
        },
        table: {
          caption: "Desglose de beneficios fiscales",
          categoryHeader: "Categoría",
          amountHeader: "Monto",
          totalLabel: "Total",
        },
      },
    },
    labels: {
      beneficiary: "Beneficiario",
      contributionsParent: "Contribuciones",
      monthlyWithdrawalsTitle: "Retiros mensuales",
      amountShort: "Monto",
      startShort: "Inicio",
      advanced: "Avanzado",
      ssiBenefitsQuestion:
        "El beneficiario recibe o espera recibir beneficios de SSI.",
      taxFilingStatus: "Estado civil fiscal",
      timeHorizonYears: "Horizonte de tiempo (máx. 50 años)",
      stateOfResidence: "Estado de residencia",
      adjustedGrossIncome: "Ingreso bruto ajustado",
      annualReturnAssumption: "Rendimiento anual de inversión",
      startingBalance: "Saldo inicial",
      upfrontContribution: "Inicial",
      recurringContribution: "Recurrente",
      contributionCadence: "Cadencia",
      monthlyWithdrawalAmount: "Monto de retiro mensual",
      monthlyStart: "Inicio mensual (mes/año)",
      month: "Mes",
      year: "Año",
      totalContributions: "Contribuciones totales",
      endingBalance: "Saldo final",
      reportPlaceholder:
        "Marcador de informe. Aquí se mostrarán gráficos e información adicional.",
    },
    residency: {
      restrictedMessage: (stateName: string) =>
        `El beneficiario no es elegible para abrir una cuenta Able de ${stateName} porque el plan Able de ${stateName} requiere que el beneficiario sea residente de ${stateName}. Debe verificar si su estado ofrece un plan Able, que puede proporcionar ciertos beneficios fiscales estatales.`,
      openMessage:
        "Debe verificar si su estado ofrece un plan Able, que puede proporcionar ciertos beneficios fiscales estatales.",
      actionLabel: "Cambiar mi residencia y continuar",
    },
    buttons: {
      back: "Atrás",
      next: "Siguiente",
      openSchedule: "Ver calendario de amortización",
      done: "Listo",
      planMonthlyWithdrawals: "Planificar retiros mensuales",
      checkEligibility: "Verificar elegibilidad",
      viewAnnualReturns: "Comparar ABLE vs cuenta imponible",
      backToTaxBenefits: "Volver a beneficios fiscales",
    },
    federalSavers: {
      buttonEligible: "Elegible para el Crédito Federal del Ahorrador",
      buttonIneligible: "No elegible para el Crédito Federal del Ahorrador",
      buttonDefault: "Ver elegibilidad del Crédito Federal del Ahorrador",
      eligibilityTitle: "Elegibilidad del Crédito Federal del Ahorrador",
      closeEligibility: "Cerrar elegibilidad del Crédito Federal del Ahorrador",
      questions: {
        hasTaxLiability: "¿El beneficiario tiene obligación tributaria?",
        isOver18: "¿El beneficiario tiene más de 18 años?",
        isStudent: "¿El beneficiario es estudiante a tiempo completo?",
        isDependent: "¿El beneficiario es declarado como dependiente?",
      },
      disqualifyingMessages: {
        noTaxLiability: "No elegible: sin obligación tributaria.",
        under18: "No elegible: el beneficiario debe ser mayor de 18.",
        student: "No elegible: estudiantes de tiempo completo no son elegibles.",
        dependent: "No elegible: dependientes no son elegibles.",
      },
      resultMessages: {
        answerQuestions: "Responda las preguntas para ver la elegibilidad.",
        enterAgi: "Ingrese el ingreso bruto ajustado para determinar elegibilidad.",
        eligible: "Elegible para el Crédito Federal del Ahorrador.",
        ineligible: "No elegible según ingresos y estado civil.",
      },
    },
    workToAble: {
      prompt: (annualLimit: string) =>
        `Sus contribuciones planeadas exceden el límite anual de ABLE de ${annualLimit}. Si trabaja, puede calificar para contribuir más (la disposición “Work to ABLE”). ¿Desea verificar si califica?`,
      title: "Work to ABLE",
      declineMessage: (annualLimit: string) =>
        `Por favor, ajuste sus contribuciones para que el total sea inferior al límite anual de ${annualLimit}.`,
      ineligibleMessage: (annualLimit: string) =>
        `Según la información proporcionada, no califica para hacer contribuciones Work to ABLE. Por favor, ajuste sus contribuciones para que el total sea inferior al límite anual de ${annualLimit}.`,
      applyMaxPrompt:
        "¿Desea establecer las contribuciones en el monto máximo permitido?",
      applyMaxNoteMonthlyFirst:
        "Reduciremos la contribución recurrente para que un año calendario completo esté dentro del límite. Si el año actual aún supera el límite por el monto inicial, también lo reduciremos.",
      applyMaxNoteUpfront: (limit: string) =>
        `Su contribución inicial por sí sola supera el límite. Al seleccionar sí, el monto inicial se reducirá para quedar dentro de ${limit}.`,
      overagePeriodCurrentYear: "Año actual (meses restantes)",
      overagePeriodNextFullYear: "Próximo año completo (12 meses)",
      amountOverLabel: "Monto por encima del límite anual:",
      amountOverCombinedLabel: "Monto por encima de los límites combinados:",
      eligibleWithin: (additional: string, combined: string) =>
        `Califica para contribuciones adicionales de ${additional}. Sus contribuciones están dentro del límite combinado de ${combined}.`,
      eligibleOver: (additional: string, combined: string) =>
        `Califica para contribuciones adicionales de ${additional}, pero sus contribuciones exceden el límite combinado de ${combined}. Por favor, ajuste sus contribuciones para que el total sea inferior al límite combinado de ${combined}.`,
      earnedIncomeQuestion: "¿El beneficiario tiene ingresos del trabajo?",
      employerPlanQuestion:
        "¿El beneficiario está cubierto por un plan de jubilación?",
    },
    warnings: {
      planMaxStop: (planMax: string, stopMonth: string) =>
        `En esta herramienta de planificación, las contribuciones se detienen en ${stopMonth} porque el saldo proyectado alcanza el máximo del plan de ${planMax}.`,
      planAndSsi: (planMax: string, ssiLimit: string) =>
        `Según sus contribuciones planificadas y los supuestos de ganancias, se proyecta que la cuenta exceda el saldo máximo permitido del plan (${planMax}). También supera ${ssiLimit}, lo que puede resultar en la suspensión de beneficios de SSI y tener un impacto financiero adverso.`,
      planOnly: (planMax: string) =>
        `Según sus contribuciones planificadas y los supuestos de ganancias, se proyecta que la cuenta exceda el saldo máximo permitido del plan (${planMax}).`,
      ssiOnly: (ssiLimit: string, yearSuffix: string) =>
        `Según sus contribuciones planificadas y los supuestos de ganancias, se proyecta que la cuenta exceda ${ssiLimit}${yearSuffix}. Esto puede resultar en la suspensión de beneficios de SSI y tener un impacto financiero adverso.`,
      yearSuffix: (year: number) => ` en ${year}`,
      warningNote:
        "Además, mantener las contribuciones en estos niveles elevados sin retiros compensatorios hará que esta herramienta de planificación produzca saldos futuros inalcanzables y rendimientos no realizables, así como ahorros y beneficios fiscales.",
      understand: "Entiendo",
    },
    misc: {
      yes: "Sí",
      no: "No",
      removeWithdrawal: "Eliminar montos de retiro",
      disclosurePlaceholder:
        "Texto de divulgación de marcador de posición. Este contenido será reemplazado por el texto final.",
      pdfFootnotes: [
        "Las cifras son estimaciones solo para fines de planificación.",
      ],
      pdfDisclosures: [
        "Las proyecciones no garantizan resultados futuros.",
      ],
      stepHeaders: {
        demographics: "Datos demográficos y supuestos de inversión",
        accountActivity: "Plan de actividad de la cuenta",
        horizonPrompt: "Elige el horizonte de tiempo para ver saldos",
      },
      horizonMaxLabel: "Max",
      horizonYearSuffix: "A",
      contributionsWithdrawals: "Contribuciones / Retiros",
      amortizationSchedule: "Calendario de amortización",
    },
    accessibility: {
      printReport: "Imprimir informe",
      refresh: "Actualizar",
      startingBalanceInfo: "Información del saldo inicial",
      estimatedEarnedIncomeInfo: "Información de ingresos estimados del trabajo",
    },
    tooltips: {
      startingBalance:
        "Este monto debe representar un saldo inicial o transferido de una cuenta ABLE o un traspaso desde un plan de ahorro universitario 529.",
      earnedIncome: {
        prompt: "Ingrese el ingreso estimado del trabajo:",
        lead:
          "Esto es diferente del ingreso bruto ajustado. El ingreso del trabajo es el dinero que recibe por trabajar, ya sea como empleado o por cuenta propia.",
        includedTitle: "Qué se incluye como ingreso del trabajo",
        includedItems: [
          "Salarios, sueldos y propinas",
          "Pago por hora",
          "Comisiones",
          "Bonificaciones",
          "Ingresos por cuenta propia o freelance (ganancias netas)",
          "Beneficios imponibles del empleador (si se pagan como salarios)",
          "Beneficios por huelga sindical (en muchos contextos)",
        ],
        excludedTitle: "Qué se excluye (no es ingreso del trabajo)",
        excludedItems: [
          "Ingresos de inversiones (intereses, dividendos, ganancias de capital)",
          "Ingresos por alquiler (salvo que sea su negocio activo)",
          "Pensiones y anualidades",
          "Beneficios del Seguro Social (incluye SSI, SSDI)",
        ],
      },
    },
  },
} as const;

export type UiPreviewLanguage = keyof typeof uiPreviewCopy;
