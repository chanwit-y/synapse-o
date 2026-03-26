import { NextResponse } from "next/server";
import { translateMarkdownEnglishToThai } from "@/app/lib/services/translate";
import { FileRepository } from "@/app/lib/db/repository/file";

/**
 * POST /api/translate
 *
 * Body (JSON):
 *   { "fileId": "...", "md": "..." }
 *
 * Translates the Markdown from English to Thai, persists the result as
 * `contentTH` on the file row, and returns the translated text.
 */
export async function POST(request: Request) {
  try {
    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    let md: string;
    let fileId: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const b = body as { md?: unknown; markdown?: unknown; fileId?: unknown };
      fileId = typeof b.fileId === "string" ? b.fileId : null;
      md =
        typeof b.md === "string"
          ? b.md
          : typeof b.markdown === "string"
            ? b.markdown
            : "";
      if (!md.trim()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'JSON body must include a string field "md" or "markdown" with the Markdown content.',
          },
          { status: 400 },
        );
      }
    } else {
      md = await request.text();
      if (!md.trim()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Empty body. Send JSON with { "fileId": "...", "md": "..." }.',
          },
          { status: 400 },
        );
      }
    }

    const translated = await translateMarkdownEnglishToThai(md);

    if (fileId) {
      const fileRepo = new FileRepository();
      await fileRepo.updateContentTH(fileId, translated);
    }

    return NextResponse.json({
      success: true,
      md: translated,
      markdown: translated,
    });
  } catch (error) {
    console.error("Error translating markdown:", error);
    const message =
      error instanceof Error ? error.message : "Failed to translate markdown";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
