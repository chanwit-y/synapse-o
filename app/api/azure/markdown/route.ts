/**
 * @file route.ts
 * @description Server-side proxy to fetch markdown content from Azure-hosted URLs (or any HTTPS URL).
 * Used to avoid CORS issues in the browser.
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const body = json as Record<string, unknown>;
    const url = body.url;
    const authorization = body.authorization;
    if (typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Missing url" }, { status: 400 });
    }
    const authHeader = typeof authorization === "string" ? authorization.trim() : "";

    const u = new URL(url);
    if (u.protocol !== "https:") {
      return NextResponse.json({ success: false, error: "Only https URLs are supported" }, { status: 400 });
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      // Avoid caching remote content by default.
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Remote responded with HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    const content = await res.text();

    // Lightweight sanity check: refuse obvious binary.
    if (!content || content.length === 0) {
      return NextResponse.json({ success: false, error: "Remote returned empty content" }, { status: 400 });
    }

    // If it's clearly not text/markdown, still return it (some Azure endpoints omit content-type),
    // but include the content-type for troubleshooting.
    return NextResponse.json({ success: true, content, contentType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

