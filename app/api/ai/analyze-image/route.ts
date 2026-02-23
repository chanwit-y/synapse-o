import { NextResponse } from "next/server";
import { aiAnalyzeImage } from "@/app/lib/services/ai";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { base64Image, mimeType, question } = body as {
			base64Image?: string;
			mimeType?: string;
			question?: string;
		};

		if (!base64Image) {
			return NextResponse.json(
				{ success: false, error: "base64Image is required" },
				{ status: 400 },
			);
		}

		const result = await aiAnalyzeImage(base64Image, mimeType, question);

		return NextResponse.json({ success: true, result });
	} catch (error) {
		console.error("Error analyzing image:", error);
		const message =
			error instanceof Error ? error.message : "Failed to analyze image";
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}
