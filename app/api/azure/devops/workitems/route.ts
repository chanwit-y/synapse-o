import { NextResponse } from "next/server";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "../_shared";

type WorkItemNode = {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  children: WorkItemNode[];
};

function parseWorkItemIdFromUrl(url: string): number | null {
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
    const teamRaw = typeof body.team === "string" ? body.team.trim() : "";
    const team = teamRaw || (project ? `${project} Team` : "");
    const apiVersion = "7.1";

    if (!project) {
      return NextResponse.json({ success: false, error: "Missing project" }, { status: 400 });
    }
    if (!team) {
      return NextResponse.json({ success: false, error: "Missing team" }, { status: 400 });
    }

    const authHeader = makeBasicAuthHeaderFromPat(creds.pat);

    // Team-scoped Work API base.
    const workBase =
      `https://dev.azure.com/${encodeURIComponent(creds.organization)}` +
      `/${encodeURIComponent(project)}` +
      `/${encodeURIComponent(team)}`;

    // 1) Find Epics backlog id + columns.
    const backlogsRes = await fetch(`${workBase}/_apis/work/backlogs?api-version=${apiVersion}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authHeader },
      cache: "no-store",
    });
    if (!backlogsRes.ok) {
      const text = await backlogsRes.text();
      return NextResponse.json(
        { success: false, error: `Azure DevOps API error (${backlogsRes.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const backlogsPayload = (await backlogsRes.json()) as {
      value?: Array<{
        id: string;
        name?: string;
        columnFields?: Array<{ columnFieldReference?: { referenceName?: string; name?: string } }>;
      }>;
    };

    const backlogLevels = backlogsPayload.value ?? [];
    const epicsBacklog = backlogLevels.find((b) => (b.name ?? "").toLowerCase() === "epics");
    if (!epicsBacklog?.id) {
      return NextResponse.json(
        { success: false, error: `Could not find Epics backlog for team "${team}"` },
        { status: 404 },
      );
    }

    // 2) Get work item IDs in Epics backlog level.
    const backlogItemsRes = await fetch(
      `${workBase}/_apis/work/backlogs/${encodeURIComponent(epicsBacklog.id)}/workItems?api-version=${apiVersion}`,
      {
        method: "GET",
        headers: { Accept: "application/json", Authorization: authHeader },
        cache: "no-store",
      },
    );

    if (!backlogItemsRes.ok) {
      const text = await backlogItemsRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to load backlog work items (${backlogItemsRes.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const backlogItemsPayload = (await backlogItemsRes.json()) as {
      workItems?: Array<{ target?: { id?: number } }>;
    };

    const ids = (backlogItemsPayload.workItems ?? [])
      .map((link) => link.target?.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

    const backlogMeta = {
      id: epicsBacklog.id,
      name: epicsBacklog.name ?? "Epics",
      columns: (epicsBacklog.columnFields ?? [])
        .map((c) => c.columnFieldReference)
        .filter((c): c is { referenceName?: string; name?: string } => Boolean(c)),
    };

    if (ids.length === 0) {
      return NextResponse.json({ success: true, backlog: backlogMeta, workItems: [] satisfies WorkItemNode[] });
    }

    // 3) Fetch details + relations in batches (same fields as backlog UI).
    const witBase =
      `https://dev.azure.com/${encodeURIComponent(creds.organization)}` +
      `/${encodeURIComponent(project)}`;

    const fields = ["System.Id", "System.Title", "System.State", "System.WorkItemType"];
    const allItems: Array<{
      id: number;
      fields?: Record<string, unknown>;
      relations?: Array<{ rel?: string; url?: string }>;
    }> = [];

    const batchSize = 200;
    for (let i = 0; i < ids.length; i += batchSize) {
      const chunk = ids.slice(i, i + batchSize);
      const batchRes = await fetch(`${witBase}/_apis/wit/workitemsbatch?api-version=${apiVersion}`, {
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
        throw new Error(`Failed to load work items (${batchRes.status}): ${text.slice(0, 200)}`);
      }

      const batchData = (await batchRes.json()) as { value?: typeof allItems };
      allItems.push(...(batchData.value ?? []));
    }

    // 4) Build parent/child hierarchy using relations.
    const byId = new Map<number, WorkItemNode>();
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

      const parentRel = (wi.relations ?? []).find(
        (r) => r.rel === "System.LinkTypes.Hierarchy-Reverse" && typeof r.url === "string",
      );
      if (parentRel?.url) {
        const pid = parseWorkItemIdFromUrl(parentRel.url);
        if (pid != null) parentById.set(wi.id, pid);
      }
    }

    const roots: WorkItemNode[] = [];
    for (const [id, node] of byId.entries()) {
      const parentId = parentById.get(id);
      const parent = parentId ? byId.get(parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    const sortTree = (nodes: WorkItemNode[]) => {
      nodes.sort((a, b) => a.id - b.id);
      nodes.forEach((n) => sortTree(n.children));
    };
    sortTree(roots);

    return NextResponse.json({ success: true, backlog: backlogMeta, workItems: roots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

