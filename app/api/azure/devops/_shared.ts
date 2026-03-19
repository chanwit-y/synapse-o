import "server-only";

import { ApiKeyRepository } from "@/app/lib/db/repository/api-key";
import { eq } from "drizzle-orm";

export type AzureDevopsCreds = {
  organization: string;
  pat: string;
};

function parseOrg(description: string | null): string {
  if (!description) return "";
  const match = description.match(/org=([^\s]+)/);
  return match?.[1] ?? "";
}

export async function getAzureDevopsCreds(): Promise<AzureDevopsCreds | null> {
  const repo = new ApiKeyRepository();
  const rows = await repo.findWhere([{ key: "type", value: "AZURE", condition: eq }]);
  const row = rows[0];
  if (!row?.apiKey) return null;

  const organization = parseOrg(row.description ?? null) || "banpudev";
  return { organization, pat: row.apiKey };
}

export function makeBasicAuthHeaderFromPat(pat: string): string {
  // Azure DevOps PAT uses basic auth with empty username: ":" + PAT
  return `Basic ${Buffer.from(`:${pat}`, "utf8").toString("base64")}`;
}

