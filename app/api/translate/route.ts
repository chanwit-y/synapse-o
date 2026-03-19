import { NextResponse } from "next/server";
import { translateMarkdownEnglishToThai } from "@/app/lib/services/translate";

/**
 * POST /api/translate
 *
 * Body (choose one):
 * 1) Raw Markdown — Content-Type: text/plain or text/markdown (or omit; body = full .md file as-is)
 * 2) JSON — Content-Type: application/json with { "md": "..." } or { "markdown": "..." }
 *
 * Response (success):
 * - Default: raw Markdown body, Content-Type: text/markdown; charset=utf-8
 * - JSON wrapper only if Accept includes application/json OR ?format=json
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const wantJson =
      (request.headers.get("accept") ?? "").toLowerCase().includes("application/json") ||
      url.searchParams.get("format") === "json";

    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    let md: string;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const b = body as { md?: unknown; markdown?: unknown };
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
              "Empty body. Send raw Markdown (text/plain or text/markdown) or JSON with { \"md\": \"...\" } and Content-Type: application/json.",
          },
          { status: 400 },
        );
      }
    }

    const translated = await translateMarkdownEnglishToThai(md);

    if (wantJson) {
      return NextResponse.json({
        success: true,
        md: translated,
        markdown: translated,
      });
    }

    const accept = (request.headers.get("accept") ?? "").toLowerCase();
    const outType = accept.includes("text/plain")
      ? "text/plain; charset=utf-8"
      : "text/markdown; charset=utf-8";

    return new NextResponse(translated, {
      status: 200,
      headers: {
        "Content-Type": outType,
      },
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
