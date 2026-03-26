import { NextResponse } from "next/server";
import { HtmlToMarkdown } from "@/app/lib/services/ai";
import { mirrorAzureWorkItemImagesToPublicUpload } from "@/app/lib/server/azureHtmlImages.server";

export async function POST(request: Request) {
	try {
		const body = (await request.json().catch(() => null)) as unknown;
		if (!body || typeof body !== "object") {
			return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
		}
		const rec = body as Record<string, unknown>;
		const html = typeof rec.html === "string" ? rec.html : "";
		const title = typeof rec.title === "string" ? rec.title : "";
		const workItemId = typeof rec.workItemId === "number" ? rec.workItemId : Number(rec.workItemId);
		const project = typeof rec.project === "string" ? rec.project.trim() : "";
		if (!Number.isFinite(workItemId)) {
			return NextResponse.json({ success: false, error: "workItemId is required" }, { status: 400 });
		}

		const htmlWithLocalImages = await mirrorAzureWorkItemImagesToPublicUpload(html, { project });
		const markdown = await HtmlToMarkdown(htmlWithLocalImages, title, workItemId);
		return NextResponse.json({ success: true, markdown });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to convert HTML to Markdown";
		return NextResponse.json({ success: false, error: message }, { status: 500 });
	}
}
