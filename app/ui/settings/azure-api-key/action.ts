"use server";
/**
 * @file action.ts
 * @description Server actions for storing Azure DevOps PAT.
 */

import { ApiKeyRepository } from "@/app/lib/db/repository/api-key";
import { eq } from "drizzle-orm";

const AZURE_PAT_KEY_NAME = "Azure DevOps PAT";

const apiKeyRepo = new ApiKeyRepository();

export async function getAllAzurePats() {
	try {
		const rows = await apiKeyRepo.findWhere([
			{ key: "type", value: "AZURE", condition: eq },
		]);
		return { success: true, data: rows };
	} catch (error) {
		console.error("Failed to list Azure PATs:", error);
		return { success: false, error: "Failed to load Azure PATs" };
	}
}

export async function saveAzurePat(pat: string, organization?: string) {
	try {
		const token = pat.trim();
		if (!token) {
			return { success: false, error: "PAT is required" };
		}
		const org = (organization ?? "").trim();
		const description = org ? `org=${org}` : null;

		const rows = await apiKeyRepo.findWhere([
			{ key: "type", value: "AZURE", condition: eq },
		]);

		if (rows.length > 0) {
			await apiKeyRepo.update(rows[0].id, {
				type: "AZURE",
				name: AZURE_PAT_KEY_NAME,
				description,
				apiKey: token,
			});
		} else {
			await apiKeyRepo.create({
				type: "AZURE",
				name: AZURE_PAT_KEY_NAME,
				description,
				apiKey: token,
			});
		}
		return { success: true };
	} catch (error) {
		console.error("Failed to save Azure PAT:", error);
		return { success: false, error: "Failed to save Azure PAT" };
	}
}

export async function deleteAzurePat(id: string) {
	try {
		const deleted = await apiKeyRepo.delete(id);
		return { success: deleted, data: deleted };
	} catch (error) {
		console.error("Failed to delete Azure PAT:", error);
		return { success: false, error: "Failed to delete Azure PAT" };
	}
}

/** Returns whether an Azure PAT row exists with a non-empty key (for gating UI without exposing the secret). */
export async function hasAzurePatConfigured() {
	try {
		const rows = await apiKeyRepo.findWhere([{ key: "type", value: "AZURE", condition: eq }]);
		const row = rows[0];
		const configured = Boolean(row?.apiKey && String(row.apiKey).trim().length > 0);
		return { success: true as const, configured };
	} catch (error) {
		console.error("Failed to check Azure PAT:", error);
		return { success: false as const, configured: false };
	}
}
