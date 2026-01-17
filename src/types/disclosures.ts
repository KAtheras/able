export type DisclosurePayload = {
  clientId: string;
  locale: "en-US" | "es-US";
  disclosures: {
    report: string[];
  };
  tooltips: Record<string, string>;
};
