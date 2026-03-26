/**
 * Removes files under public/upload that are referenced in stored markdown/HTML content.
 */
import "server-only";

import { unlink } from "fs/promises";
import path from "path";

/** Match /upload/<basename> in markdown, HTML, plain URLs (basename: safe characters only). */
const UPLOAD_REF_RE = /\/upload\/([a-zA-Z0-9._-]+)/g;

function isSafeUploadBasename(name: string): boolean {
  if (!name || name.length > 255) return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

export function extractUploadBasenamesFromContent(text: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(UPLOAD_REF_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const base = m[1];
    if (isSafeUploadBasename(base)) seen.add(base);
  }
  return [...seen];
}

export async function deletePublicUploadAssetsReferencedInContent(content: string): Promise<void> {
  const basenames = extractUploadBasenamesFromContent(content);
  if (basenames.length === 0) return;

  const uploadRoot = path.resolve(process.cwd(), "public", "upload");

  for (const base of basenames) {
    const abs = path.resolve(uploadRoot, base);
    const rel = path.relative(uploadRoot, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    try {
      await unlink(abs);
    } catch {
      // missing file or race — ignore
    }
  }
}
