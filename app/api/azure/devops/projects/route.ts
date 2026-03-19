import { NextResponse } from "next/server";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "../_shared";

export async function GET() {
  try {
    const creds = await getAzureDevopsCreds();
    if (!creds) {
      return NextResponse.json(
        { success: false, error: "Azure PAT not configured" },
        { status: 400 },
      );
    }

    const url = `https://dev.azure.com/${encodeURIComponent(creds.organization)}/_apis/projects?api-version=7.0`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: makeBasicAuthHeaderFromPat(creds.pat),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Azure DevOps API error (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { value?: Array<{ id: string; name: string }> };
    return NextResponse.json({ success: true, projects: data.value ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

