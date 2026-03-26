import { NextResponse } from "next/server";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "../_shared";

type EpicRow = {
  id: number;
  title: string;
  state: string;
  url?: string;
};

export async function POST(request: Request) {
  try {
    const creds = await getAzureDevopsCreds();
    if (!creds) {
      return NextResponse.json(
        { success: false, error: "Azure PAT not configured" },
        { status: 400 },
      );
    }

    const json = (await request.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
    const body = json as Record<string, unknown>;
    const project = typeof body.project === "string" ? body.project.trim() : "";
    if (!project) {
      return NextResponse.json({ success: false, error: "Missing project" }, { status: 400 });
    }

    const authHeader = makeBasicAuthHeaderFromPat(creds.pat);
    const base = `https://dev.azure.com/${encodeURIComponent(creds.organization)}/${encodeURIComponent(project)}`;

    // Query Epics (similar to backlog epics view; returns work item ids)
    const wiqlRes = await fetch(`${base}/_apis/wit/wiql?api-version=7.0`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        query:
          "Select [System.Id] From WorkItems Where [System.TeamProject] = @project And [System.WorkItemType] = 'Epic' Order By [System.ChangedDate] Desc",
      }),
      cache: "no-store",
    });

    if (!wiqlRes.ok) {
      const text = await wiqlRes.text();
      return NextResponse.json(
        { success: false, error: `Azure DevOps API error (${wiqlRes.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const wiqlData = (await wiqlRes.json()) as { workItems?: Array<{ id: number }> };
    const ids = (wiqlData.workItems ?? []).map((w) => w.id);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, epics: [] satisfies EpicRow[] });
    }

    const detailsRes = await fetch(
      `${base}/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Id,System.Title,System.State&api-version=7.0`,
      {
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
        cache: "no-store",
      },
    );

    if (!detailsRes.ok) {
      const text = await detailsRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to load epic details (${detailsRes.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const details = (await detailsRes.json()) as {
      value?: Array<{ id: number; fields?: Record<string, unknown>; url?: string }>;
    };

    const epics: EpicRow[] = (details.value ?? []).map((wi) => ({
      id: wi.id,
      title: String(wi.fields?.["System.Title"] ?? ""),
      state: String(wi.fields?.["System.State"] ?? ""),
      url: wi.url,
    }));

    return NextResponse.json({ success: true, epics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

