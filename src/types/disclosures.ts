export type DisclosurePayload = {
  clientId: string;
  locale: "en-US" | "es-US";
  disclosures: {
    report: string[];
    demographics: string[];
    accountActivity: string[];
  };
  tooltips: Record<string, string>;
};
