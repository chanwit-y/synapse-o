import { NextResponse } from "next/server";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "../_shared";

/** Same filter as the backlog modal (Epic / Feature / User Story only). */
const VISIBLE_TYPES = new Set<string>(["Epic", "Feature", "User Story"]);

type ChildNode = {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  children: ChildNode[];
};

function parseWorkItemIdFromUrl(url: string): number | null {
  const match = url.match(/workItems\/(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Loads one work item with relations (like ado-manual getWorkItem), finds
 * Hierarchy-Forward links (child work items), then batch-loads their fields.
 */
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
    const rawId = body.workItemId;
    const workItemId = typeof rawId === "number" ? rawId : Number(rawId);

    if (!project) {
      return NextResponse.json({ success: false, error: "Missing project" }, { status: 400 });
    }
    if (!Number.isFinite(workItemId)) {
      return NextResponse.json({ success: false, error: "Missing or invalid workItemId" }, { status: 400 });
    }

    const authHeader = makeBasicAuthHeaderFromPat(creds.pat);
    const apiVersion = "7.1";
    const witBase = `https://dev.azure.com/${encodeURIComponent(creds.organization)}/${encodeURIComponent(project)}`;

    // Azure rejects using `fields` together with `$expand=relations` (ConflictingParametersException).
    const wiUrl =
      `${witBase}/_apis/wit/workitems/${workItemId}` + `?$expand=relations&api-version=${apiVersion}`;

    const wiRes = await fetch(wiUrl, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authHeader },
      cache: "no-store",
    });

    if (!wiRes.ok) {
      const text = await wiRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to load work item (${wiRes.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const wi = (await wiRes.json()) as {
      id: number;
      relations?: Array<{ rel?: string; url?: string }>;
    };

    const childIds: number[] = [];
    for (const r of wi.relations ?? []) {
      if (r.rel === "System.LinkTypes.Hierarchy-Forward" && typeof r.url === "string") {
        const cid = parseWorkItemIdFromUrl(r.url);
        if (cid != null && cid !== wi.id) childIds.push(cid);
      }
    }

    if (childIds.length === 0) {
      return NextResponse.json({ success: true, children: [] satisfies ChildNode[] });
    }

    const fields = ["System.Id", "System.Title", "System.State", "System.WorkItemType"];
    const allItems: Array<{ id: number; fields?: Record<string, unknown> }> = [];
    const batchSize = 200;

    for (let i = 0; i < childIds.length; i += batchSize) {
      const chunk = childIds.slice(i, i + batchSize);
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
        throw new Error(`Failed to load child work items (${batchRes.status}): ${text.slice(0, 200)}`);
      }

      const batchData = (await batchRes.json()) as { value?: typeof allItems };
      allItems.push(...(batchData.value ?? []));
    }

    const children: ChildNode[] = allItems
      .map((item) => {
        const f = (item.fields ?? {}) as Record<string, unknown>;
        return {
          id: item.id,
          title: String(f["System.Title"] ?? ""),
          state: String(f["System.State"] ?? ""),
          workItemType: String(f["System.WorkItemType"] ?? ""),
          children: [],
        };
      })
      .filter((n) => VISIBLE_TYPES.has(n.workItemType));

    children.sort((a, b) => a.id - b.id);

    return NextResponse.json({ success: true, children });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
