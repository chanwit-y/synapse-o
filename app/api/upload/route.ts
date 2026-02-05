import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Check if it's an image
		if (!file.type.startsWith("image/")) {
			return NextResponse.json({ error: "File must be an image" }, { status: 400 });
		}

		// Check file size (10MB limit)
		const MAX_SIZE = 10 * 1024 * 1024;
		if (file.size > MAX_SIZE) {
			return NextResponse.json(
				{ error: "File size must be less than 10MB" },
				{ status: 400 }
			);
		}

		// Generate unique filename
		const timestamp = Date.now();
		const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
		const filename = `${timestamp}-${originalName}`;

		// Convert file to buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Save to public/upload directory
		const uploadDir = path.join(process.cwd(), "public", "upload");
		const filepath = path.join(uploadDir, filename);

		await writeFile(filepath, buffer);

		// Return the public path
		const publicPath = `/upload/${filename}`;

		return NextResponse.json({
			success: true,
			path: publicPath,
		});
	} catch (error) {
		console.error("Error uploading file:", error);
		return NextResponse.json(
			{ error: "Failed to upload file" },
			{ status: 500 }
		);
	}
}

