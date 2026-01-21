import { NextResponse } from "next/server";
import { CollectionRepository } from "@/app/lib/db/repository/collection";
import { FileRepository } from "@/app/lib/db/repository/file";

type SaveFileBody = {
	id?: string | null;
	collectionId?: string | null;
	name?: string | null;
	content?: string | null;
};

const DEFAULT_COLLECTION_ID = "default";
const DEFAULT_FILE_NAME = "untitled.md";

const getExtension = (name: string) => {
	const lastDotIndex = name.lastIndexOf(".");
	if (lastDotIndex === -1 || lastDotIndex === name.length - 1) return null;
	return name.slice(lastDotIndex + 1);
};

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as SaveFileBody;
		const content = typeof body.content === "string" ? body.content : "";
		const name = (body.name ?? DEFAULT_FILE_NAME).trim() || DEFAULT_FILE_NAME;
		const collectionId = (body.collectionId ?? DEFAULT_COLLECTION_ID).trim() || DEFAULT_COLLECTION_ID;

		const collectionRepo = new CollectionRepository();
		const existingCollection = await collectionRepo.findById(collectionId);
		if (!existingCollection) {
			await collectionRepo.create({
				id: collectionId,
				name: "Default",
				directories: JSON.stringify([]),
			});
		}

		const fileRepo = new FileRepository();
		const now = Date.now();
		const extension = getExtension(name);

		const fileId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
		if (fileId) {
			const updated = await fileRepo.update(fileId, {
				name,
				content,
				extension,
				collectionId,
				updatedAt: now,
			});

			if (updated) {
				return NextResponse.json({ success: true, id: updated.id });
			}
		}

		const created = await fileRepo.create({
			id: fileId ?? undefined,
			collectionId,
			name,
			type: "file",
			extension,
			content,
			createdAt: now,
			updatedAt: now,
		});

		return NextResponse.json({ success: true, id: created.id });
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

		const fileRepo = new FileRepository();
		const file = await fileRepo.findById(id);
		if (!file) {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true, file });
	} catch (error) {
		console.error("Error loading file:", error);
		return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
	}
}

