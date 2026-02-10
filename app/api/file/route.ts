/**
 * @file route.ts
 * @description Handles GET and POST HTTP requests for file operations, allowing clients to save and retrieve files using a file service.
 */
import { NextResponse } from "next/server";
import { loadFile, saveFile } from "@/app/lib/services/fileService";
import type { SaveFileBody } from "@/app/lib/services/@types/fileService";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as SaveFileBody;
		const result = await saveFile(body);
		return NextResponse.json({ success: true, id: result.id });
	} catch (error) {
		console.error("Error saving file:", error);
		return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
	}
}

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");
		if (!id) {
			return NextResponse.json({ error: "Missing id" }, { status: 400 });
		}

		const file = await loadFile(id);
		if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

		return NextResponse.json({
			success: true,
			file,
		});
	} catch (error) {
		console.error("Error loading file:", error);
		return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
	}
}

