import { NextResponse } from "next/server";
import { aiExtractCodeContext } from "@/app/lib/services/ai";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { codes } = body as { codes?: string[] };

		if (!codes || !Array.isArray(codes) || codes.length === 0) {
			return NextResponse.json(
				{ success: false, error: "codes array is required" },
				{ status: 400 },
			);
		}

		const result = await aiExtractCodeContext(codes);

		return NextResponse.json({ success: true, result });
	} catch (error) {
		console.error("Error extracting code context:", error);
		const message =
			error instanceof Error ? error.message : "Failed to extract code context";
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}
