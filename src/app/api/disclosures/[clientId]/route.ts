import { NextResponse } from "next/server";

import {
  getDisclosures,
  supportedClientIds,
} from "../../../../data/disclosures";
import type { DisclosurePayload } from "../../../../types/disclosures";

const defaultLocale: DisclosurePayload["locale"] = "en-US";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId: rawClientId } = await params;

  const clientId = rawClientId?.toUpperCase() ?? "";
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale =
    localeParam === "es-US" || localeParam === "en-US"
      ? localeParam
      : defaultLocale;

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId." }, { status: 400 });
  }

  if (!supportedClientIds.includes(clientId)) {
    return NextResponse.json({ error: "Unknown clientId." }, { status: 404 });
  }

  const payload = getDisclosures(clientId, locale);
  return NextResponse.json(payload);
}