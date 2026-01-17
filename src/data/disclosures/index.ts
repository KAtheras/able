import type { DisclosurePayload } from "../../types/disclosures";

type DisclosureContent = Omit<DisclosurePayload, "clientId" | "locale">;

type DisclosureLibrary = Record<
  string,
  Partial<Record<DisclosurePayload["locale"], Partial<DisclosureContent>>>
>;

const disclosures: DisclosureLibrary = {
  IL: {},
  TX: {},
  CA: {},
  UT: {},
};

const defaultDisclosures: Record<
  DisclosurePayload["locale"],
  DisclosureContent
> = {
  "en-US": {
    disclosures: {
      report: [
        "Disclosure placeholder text. This content will be replaced with final disclosure language.",
      ],
    },
    tooltips: {},
  },
  "es-US": {
    disclosures: {
      report: [
        "Texto de divulgación de marcador de posición. Este contenido será reemplazado por el texto final.",
      ],
    },
    tooltips: {},
  },
};

export function getDisclosures(
  clientId: string,
  locale: DisclosurePayload["locale"],
): DisclosurePayload {
  const base = defaultDisclosures[locale];
  const overrides = disclosures[clientId]?.[locale];
  const merged: DisclosureContent = {
    disclosures: {
      report: overrides?.disclosures?.report ?? base.disclosures.report,
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
