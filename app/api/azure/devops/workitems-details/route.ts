import { NextResponse } from "next/server";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "../_shared";

type WorkItemDetail = {
  id: number;
  title: string;
  descriptionHtml: string;
};

function descriptionToHtml(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "html" in raw && typeof (raw as { html?: unknown }).html === "string") {
    return (raw as { html: string }).html;
  }
  return String(raw);
}

export async function POST(request: Request) {
  try {
    const creds = await getAzureDevopsCreds();
    if (!creds) {
      return NextResponse.json({ success: false, error: "Azure PAT not configured" }, { status: 400 });
    }

    const json = (await request.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
    const body = json as Record<string, unknown>;
    const project = typeof body.project === "string" ? body.project.trim() : "";
    const rawIds = body.ids;
    const ids = Array.isArray(rawIds)
      ? rawIds
          .map((x) => (typeof x === "number" ? x : Number(x)))
          .filter((n): n is number => Number.isFinite(n))
      : [];

    if (!project) {
      return NextResponse.json({ success: false, error: "Missing project" }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or empty ids" }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)];
    const authHeader = makeBasicAuthHeaderFromPat(creds.pat);
    const apiVersion = "7.1";
    const witBase = `https://dev.azure.com/${encodeURIComponent(creds.organization)}/${encodeURIComponent(project)}`;

    const fields = ["System.Id", "System.Title", "System.Description"];
    const allItems: Array<{ id: number; fields?: Record<string, unknown> }> = [];
    const batchSize = 200;

    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const chunk = uniqueIds.slice(i, i + batchSize);
      const batchRes = await fetch(`${witBase}/_apis/wit/workitemsbatch?api-version=${apiVersion}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ ids: chunk, fields }),
        cache: "no-store",
      });

      if (!batchRes.ok) {
        const text = await batchRes.text();
        return NextResponse.json(
          { success: false, error: `Failed to load work items (${batchRes.status}): ${text.slice(0, 200)}` },
          { status: 502 },
        );
      }

      const batchData = (await batchRes.json()) as { value?: typeof allItems };
      allItems.push(...(batchData.value ?? []));
    }

    const items: WorkItemDetail[] = allItems.map((wi) => {
      const f = (wi.fields ?? {}) as Record<string, unknown>;
      return {
        id: wi.id,
        title: String(f["System.Title"] ?? ""),
        descriptionHtml: descriptionToHtml(f["System.Description"]),
      };
    });

    items.sort((a, b) => a.id - b.id);

    return NextResponse.json({ success: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
