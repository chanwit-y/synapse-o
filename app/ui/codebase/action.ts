"use server";

import { readFile } from "fs/promises";
import { CodebaseRepository, type CodebaseCreateInput } from "@/app/lib/db/repository/codebase";
import type { ImportPathEntry } from "@/app/lib/components/ImportPathTreeView";

const codebaseRepo = new CodebaseRepository();

export async function getAllCodebases() {
	try {
		const codebases = await codebaseRepo.findAll();
		return { success: true, data: codebases };
	} catch (error) {
		console.error("Failed to fetch codebases:", error);
		return { success: false, error: "Failed to fetch codebases" };
	}
}

export async function getCodebaseById(id: string) {
	try {
		const codebase = await codebaseRepo.findById(id);
		if (!codebase) return { success: false, error: "Codebase not found" };
		return { success: true, data: codebase };
	} catch (error) {
		console.error("Failed to fetch codebase:", error);
		return { success: false, error: "Failed to fetch codebase" };
	}
}

export async function getImportPathData(filePath: string): Promise<{ success: boolean; data?: ImportPathEntry[]; error?: string }> {
	try {
		const raw = await readFile(filePath, "utf-8");
		const data = JSON.parse(raw) as ImportPathEntry[];
		return { success: true, data };
	} catch (error) {
		console.error("Failed to read import path file:", error);
		return { success: false, error: "Failed to read import path data" };
	}
}

export async function createCodebase(data: { name: string; description?: string; importSrcPath: string; importFilePath: string }) {
	try {
		const input: CodebaseCreateInput = {
			name: data.name,
			description: data.description || null,
			importSrcPath: data.importSrcPath,
			importFilePath: data.importFilePath,
		};
		const result = await codebaseRepo.create(input);
		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to create codebase:", error);
		return { success: false, error: "Failed to create codebase" };
	}
}

export async function deleteCodebase(id: string) {
	try {
		const deleted = await codebaseRepo.delete(id);
		return { success: deleted, data: deleted };
	} catch (error) {
		console.error("Failed to delete codebase:", error);
		return { success: false, error: "Failed to delete codebase" };
	}
}
