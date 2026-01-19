import type { DisclosurePayload } from "../../types/disclosures";

type DisclosureContent = Omit<DisclosurePayload, "clientId" | "locale">;

type DisclosureLibrary = Record<
  string,
  Partial<Record<DisclosurePayload["locale"], Partial<DisclosureContent>>>
>;

const defaultDisclosures: Record<
  DisclosurePayload["locale"],
  DisclosureContent
> = {
  "en-US": {
    disclosures: {
      report: [
        "Disclosure placeholder text. This content will be replaced with final disclosure language.",
      ],
      demographics: [
        "Welcome to our interactive ABLE planning tool. Start by providing basic demographic information on the left input screen. You will be able to navigate to any of the input screens to edit all this information.",
        "Your state of residence is used to determine plan eligibility as well as to calculate certain state tax benefits.",
        "Similarly, your tax filing status and Adjusted Gross Income (AGI) will help us determine and project federal and, where applicable, state tax benefits of investing in an ABLE account. Remember that your AGI is not the same as your salary. It may be more than your earned income due other sources of income. Conversely, for most taxpayers, it often is less than your earned income due to deductions or exemptions. You can find your AGI in your most recent tax return if you filed one. If you are not sure what your current AGI is, simply put your salary and wages.",
        "We would like to know the time-period you want to plan for, so that we can project and present information for a meaningful time horizon.",
        "Finally, we proposed some default investment return assumption. You will note that the investment return defaults are different for short term time horizon compared to a longer time horizon. Feel free to change those assumptions to try out different scenarios.",
      ],
      accountActivity: [
        "Please use the input fields on the left to plan for account activity and to check for Federal Savers Credit eligibility.",
        "The starting balance should either be an existing ABLE account balance or a qualified rollover from another plan.",
        "Up-front contribution is what you currently have saved and plan to contribute at the time of account opening.",
        "You can plan for monthly or annual recurring contributions. Up front and periodic contributions are assumed to occur and start in the current month. You can also select an end date for contributions.",
        "In addition, you can plan for monthly withdrawals. You can choose the month and year in which those withdrawals will start.",
        "On this screen, you can also check to see if the beneficiary is eligible for Federal Saver's Credit.",
        "As you input your information, messages will appear in this window that will help you navigate certain contribution and account balance limits and make suggested changes to your contribution and withdrawal inputs.",
      ],
    },
    tooltips: {},
  },
  "es-US": {
    disclosures: {
      report: [
        "Texto de divulgación de marcador de posición. Este contenido será reemplazado por el texto final.",
      ],
      demographics: [
        "Bienvenido a nuestra herramienta interactiva de planificación ABLE. Comience proporcionando información demográfica básica en la pantalla de entrada izquierda. Podrá navegar a cualquiera de las pantallas de entrada para editar toda esta información.",
        "Su estado de residencia se utiliza para determinar la elegibilidad del plan así como para calcular ciertos beneficios fiscales estatales.",
        "De manera similar, su estado civil fiscal y su Ingreso Bruto Ajustado (AGI) nos ayudan a determinar y proyectar los beneficios fiscales federales y, cuando corresponda, estatales de invertir en una cuenta ABLE. Recuerde que su AGI no es lo mismo que su salario. Puede ser mayor que sus ingresos laborales debido a otras fuentes de ingresos. Por otro lado, para la mayoría de los contribuyentes suele ser menor que sus ingresos laborales debido a deducciones o exenciones. Puede encontrar su AGI en su declaración de impuestos más reciente si presentó una. Si no está seguro de cuál es su AGI actual, simplemente ingrese su salario y sueldos.",
        "Nos gustaría saber el período de tiempo para el que desea planificar, de modo que podamos proyectar y presentar información para un horizonte de tiempo significativo.",
        "Finalmente, proponemos algunas suposiciones predeterminadas sobre la rentabilidad de la inversión. Notará que los valores predeterminados de rentabilidad son diferentes para horizontes de tiempo cortos frente a horizontes más largos. Siéntase libre de cambiar esas suposiciones para probar diferentes escenarios.",
      ],
      accountActivity: [
        "Utilice los campos de entrada de la izquierda para planificar la actividad de la cuenta y verificar la elegibilidad para el Crédito Federal del Ahorrador.",
        "El saldo inicial debe ser un saldo existente de una cuenta ABLE o un rollover calificado de otro plan.",
        "La contribución inicial representa lo que ya ha ahorrado y planea aportar al momento de abrir la cuenta.",
        "Puede planificar contribuciones recurrentes mensuales o anuales. Las contribuciones iniciales y periódicas se suponen realizadas y comenzando en el mes actual. También puede seleccionar una fecha de finalización para las contribuciones.",
        "Además, puede planificar retiros mensuales. Puede elegir el mes y el año en que esos retiros comenzarán.",
        "En esta pantalla también puede verificar si el beneficiario es elegible para el Crédito Federal del Ahorrador.",
        "A medida que ingrese su información, aparecerán mensajes en esta ventana que lo ayudarán a navegar ciertos límites de contribución y saldo de cuenta, además de sugerir cambios en sus datos de contribución y retiro.",
      ],
    },
    tooltips: {},
  },
};

const disclosures: DisclosureLibrary = {
  IL: {
    "en-US": {
      disclosures: {
        report: [...defaultDisclosures["en-US"].disclosures.report],
        demographics: [...defaultDisclosures["en-US"].disclosures.demographics],
        accountActivity: [...defaultDisclosures["en-US"].disclosures.accountActivity],
      },
    },
    "es-US": {
      disclosures: {
        report: [...defaultDisclosures["es-US"].disclosures.report],
        demographics: [...defaultDisclosures["es-US"].disclosures.demographics],
        accountActivity: [...defaultDisclosures["es-US"].disclosures.accountActivity],
      },
    },
  },
  TX: {
    "en-US": {
      disclosures: {
        report: [...defaultDisclosures["en-US"].disclosures.report],
        demographics: [...defaultDisclosures["en-US"].disclosures.demographics],
        accountActivity: [
          ...defaultDisclosures["en-US"].disclosures.accountActivity,
          "If you are planning using the Texas ABLE plan, the inputs already respect Texas limits and expected tax benefits.",
        ],
      },
    },
    "es-US": {
      disclosures: {
        report: [...defaultDisclosures["es-US"].disclosures.report],
        demographics: [...defaultDisclosures["es-US"].disclosures.demographics],
        accountActivity: [
          ...defaultDisclosures["es-US"].disclosures.accountActivity,
          "Si planifica usar el plan ABLE de Texas, los datos ya respetan los límites de contribución y beneficios fiscales esperados de Texas.",
        ],
      },
    },
  },
  CA: {
    "en-US": {
      disclosures: {
        report: [...defaultDisclosures["en-US"].disclosures.report],
        demographics: [...defaultDisclosures["en-US"].disclosures.demographics],
        accountActivity: [
          ...defaultDisclosures["en-US"].disclosures.accountActivity,
          "The California ABLE plan includes parity adjustments, and this preview follows California-specific eligibility guidance.",
        ],
      },
    },
    "es-US": {
      disclosures: {
        report: [...defaultDisclosures["es-US"].disclosures.report],
        demographics: [...defaultDisclosures["es-US"].disclosures.demographics],
        accountActivity: [
          ...defaultDisclosures["es-US"].disclosures.accountActivity,
          "El plan ABLE de California incluye ajustes de paridad, y este adelanto sigue la orientación de elegibilidad específica de California.",
        ],
      },
    },
  },
  UT: {
    "en-US": {
      disclosures: {
        report: [...defaultDisclosures["en-US"].disclosures.report],
        demographics: [...defaultDisclosures["en-US"].disclosures.demographics],
        accountActivity: [
          ...defaultDisclosures["en-US"].disclosures.accountActivity,
          "Utah’s ABLE plan offers its own benefits and contribution limits, and this calculator respects those local details.",
        ],
      },
    },
    "es-US": {
      disclosures: {
        report: [...defaultDisclosures["es-US"].disclosures.report],
        demographics: [...defaultDisclosures["es-US"].disclosures.demographics],
        accountActivity: [
          ...defaultDisclosures["es-US"].disclosures.accountActivity,
          "El plan ABLE de Utah ofrece beneficios y límites propios, y esta calculadora respeta esos detalles locales.",
        ],
      },
    },
  },
};

export const supportedClientIds = Object.keys(disclosures);

export function getDisclosures(
  clientId: string,
  locale: DisclosurePayload["locale"],
): DisclosurePayload {
  const base = defaultDisclosures[locale];
  const overrides = disclosures[clientId]?.[locale];
  const merged: DisclosureContent = {
    disclosures: {
      report: overrides?.disclosures?.report ?? base.disclosures.report,
      demographics:
        overrides?.disclosures?.demographics ?? base.disclosures.demographics,
      accountActivity:
        overrides?.disclosures?.accountActivity ?? base.disclosures.accountActivity,
    },
    tooltips: {
      ...base.tooltips,
      ...(overrides?.tooltips ?? {}),
    },
  };
  return {
    clientId,
    locale,
    disclosures: merged.disclosures,
    tooltips: merged.tooltips,
  };
}
