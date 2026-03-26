import { NextResponse } from "next/server";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "../_shared";

type BacklogNode = {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  children: BacklogNode[];
};

function parseWorkItemIdFromUrl(url: string): number | null {
  // Example: https://dev.azure.com/org/_apis/wit/workItems/123
  const match = url.match(/workItems\/(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
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
    if (!project) {
      return NextResponse.json({ success: false, error: "Missing project" }, { status: 400 });
    }

    const authHeader = makeBasicAuthHeaderFromPat(creds.pat);
    const base = `https://dev.azure.com/${encodeURIComponent(creds.organization)}/${encodeURIComponent(project)}`;

    // Pull a broad set of backlog-like work items and build hierarchy client-side.
    const wiqlRes = await fetch(`${base}/_apis/wit/wiql?api-version=7.0`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        query:
          "Select [System.Id] From WorkItems Where [System.TeamProject] = @project And [System.WorkItemType] In ('Epic','Feature','User Story','Task') Order By [System.ChangedDate] Desc",
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
      return NextResponse.json({ success: true, backlog: [] satisfies BacklogNode[] });
    }

    // Fetch details (including relations) in batches.
    const fields = ["System.Id", "System.Title", "System.State", "System.WorkItemType"];
    const allItems: Array<{
      id: number;
      fields?: Record<string, unknown>;
      relations?: Array<{ rel?: string; url?: string }>;
    }> = [];

    const batchSize = 200;
    for (let i = 0; i < ids.length; i += batchSize) {
      const chunk = ids.slice(i, i + batchSize);
      const batchRes = await fetch(`${base}/_apis/wit/workitemsbatch?api-version=7.0`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ids: chunk,
          fields,
          expand: "relations",
        }),
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

    // Build nodes and parent relationships
    const byId = new Map<number, BacklogNode>();
    const parentById = new Map<number, number>();

    for (const wi of allItems) {
      const f = (wi.fields ?? {}) as Record<string, unknown>;
      byId.set(wi.id, {
        id: wi.id,
        title: String(f["System.Title"] ?? ""),
        state: String(f["System.State"] ?? ""),
        workItemType: String(f["System.WorkItemType"] ?? ""),
        children: [],
      });

      // Child -> parent relation in ADO is typically Hierarchy-Reverse pointing to parent.
      const parentRel = (wi.relations ?? []).find((r) => r.rel === "System.LinkTypes.Hierarchy-Reverse" && typeof r.url === "string");
      if (parentRel?.url) {
        const pid = parseWorkItemIdFromUrl(parentRel.url);
        if (pid != null) parentById.set(wi.id, pid);
      }
    }

    // Attach children to parents if parent exists in set.
    const roots: BacklogNode[] = [];
    for (const [id, node] of byId.entries()) {
      const parentId = parentById.get(id);
      const parent = parentId ? byId.get(parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort children by id for stable UI (can be improved later).
    const sortTree = (nodes: BacklogNode[]) => {
      nodes.sort((a, b) => a.id - b.id);
      nodes.forEach((n) => sortTree(n.children));
    };
    sortTree(roots);

    return NextResponse.json({ success: true, backlog: roots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

