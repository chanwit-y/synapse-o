import { NextResponse } from "next/server";
import OpenAI from "openai";
import { configService } from "@/app/lib/services/config/configService.server";
import { saveFile } from "@/app/lib/services/fileService";
import { SubFileRepository } from "@/app/lib/db/repository/sub-file";
import { CollectionRepository } from "@/app/lib/db/repository/collection";
import type { TreeNode } from "@/app/lib/components/@types/treeViewTypes";

function getStem(name: string) {
	const trimmed = (name ?? "").trim();
	if (!trimmed) return "untitled";
	const lastDot = trimmed.lastIndexOf(".");
	if (lastDot <= 0) return trimmed;
	return trimmed.slice(0, lastDot);
}

function getExtension(name: string) {
	const trimmed = (name ?? "").trim();
	const lastDot = trimmed.lastIndexOf(".");
	if (lastDot === -1 || lastDot === trimmed.length - 1) return null;
	return trimmed.slice(lastDot + 1);
}

function collectFileNames(nodes: TreeNode[], acc: Set<string>) {
	for (const node of nodes) {
		if (node.type === "file") acc.add(node.name);
		if (node.type === "folder" && node.children?.length) {
			collectFileNames(node.children, acc);
		}
	}
}

function parseDirectories(raw: unknown): TreeNode[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw as TreeNode[];
	if (typeof raw === "string") {
		try {
			const once = JSON.parse(raw) as unknown;
			if (Array.isArray(once)) return once as TreeNode[];
			if (typeof once === "string") {
				try {
					const twice = JSON.parse(once) as unknown;
					return Array.isArray(twice) ? (twice as TreeNode[]) : [];
				} catch { return []; }
			}
			return [];
		} catch { return []; }
	}
	return [];
}

function pickUniqueName(baseName: string, existing: Set<string>) {
	const normalizedBase = (baseName ?? "").trim() || "untitled.md";
	if (!existing.has(normalizedBase)) return normalizedBase;
	const stem = getStem(normalizedBase);
	const ext = getExtension(normalizedBase);
	for (let i = 2; i < 1000; i++) {
		const candidate = ext ? `${stem} (${i}).${ext}` : `${stem} (${i})`;
		if (!existing.has(candidate)) return candidate;
	}
	return `${stem}-${Date.now()}.${ext ?? "md"}`;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const {
			prompt,
			model = "gpt-5-codex",
			fileId,
			fileName,
			collectionId,
		} = body as {
			prompt?: string;
			model?: string;
			fileId?: string;
			fileName?: string;
			collectionId?: string;
		};

		const trimmedPrompt = prompt?.trim();
		if (!trimmedPrompt) {
			return NextResponse.json(
				{ error: "Prompt is required." },
				{ status: 400 },
			);
		}

		if (!fileId?.trim() || !collectionId?.trim()) {
			return NextResponse.json(
				{ error: "fileId and collectionId are required." },
				{ status: 400 },
			);
		}

		const apiKey = await configService.getOpenAiApiKey();
		if (!apiKey) {
			return NextResponse.json(
				{ error: "OpenAI API key not found. Please add one in Settings." },
				{ status: 500 },
			);
		}

		const openai = new OpenAI({ apiKey, timeout: 600_000 });
		const response = await openai.responses.create({
			model,
			input: [{ role: "user", content: trimmedPrompt }],
		});

		console.log('response', response)

		const content = (response.output_text ?? "").trim();
		if (!content) {
			return NextResponse.json({ success: true, result: "", contentFileId: null });
		}

		const collectionRepo = new CollectionRepository();
		const collection = await collectionRepo.findById(collectionId);
		const directories = parseDirectories(collection?.directories);
		const existingNames = new Set<string>();
		collectFileNames(directories, existingNames);

		const base = `${getStem(fileName ?? "untitled")}.e2e.md`;
		const name = pickUniqueName(base, existingNames);

		const saved = await saveFile({
			id: null,
			name,
			collectionId,
			content,
			icon: "code",
			tags: [{ id: crypto.randomUUID(), label: "E2E", color: "#22d3ee" }],
		});

		const subFileRepo = new SubFileRepository();
		const now = Date.now();
		await subFileRepo.create({
			fileId,
			contentFileId: saved.id,
			createdAt: now,
			updatedAt: now,
		});

		return NextResponse.json({
			success: true,
			result: content,
			contentFileId: saved.id,
			fileName: name,
		});
	} catch (error) {
		console.error("E2E generation error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to generate E2E tests.";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
