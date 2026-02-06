"use server";

import { ApiKeyRepository, type ApiKeyCreateInput } from "@/app/lib/db/repository/api-key";
import { configService } from "@/app/lib/services/config/configService.server";

const apiKeyRepo = new ApiKeyRepository();

export async function saveApiKey(data: { name: string; description?: string; apiKey: string }) {
	try {
		const input: ApiKeyCreateInput = {
			name: data.name,
			description: data.description || null,
			apiKey: data.apiKey,
		};

		const result = await apiKeyRepo.create(input);
		configService.invalidateOpenAiApiKey();
		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to save API key:", error);
		return { success: false, error: "Failed to save API key" };
	}
}

export async function getAllApiKeys() {
	try {
		const apiKeys = await apiKeyRepo.findAll();
		return { success: true, data: apiKeys };
	} catch (error) {
		console.error("Failed to fetch API keys:", error);
		return { success: false, error: "Failed to fetch API keys" };
	}
}

export async function deleteApiKey(id: string) {
	try {
		const deleted = await apiKeyRepo.delete(id);
		configService.invalidateOpenAiApiKey();
		return { success: deleted, data: deleted };
	} catch (error) {
		console.error("Failed to delete API key:", error);
		return { success: false, error: "Failed to delete API key" };
	}
}

export async function updateApiKey(id: string, data: { name?: string; description?: string; apiKey?: string }) {
	try {
		const result = await apiKeyRepo.update(id, {
			name: data.name,
			description: data.description,
			apiKey: data.apiKey,
		});
		configService.invalidateOpenAiApiKey();
		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to update API key:", error);
		return { success: false, error: "Failed to update API key" };
	}
}

