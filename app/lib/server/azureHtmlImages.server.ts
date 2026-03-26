/**
 * Downloads images referenced in Azure DevOps work item HTML and rewrites src to /upload/...
 */
import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getAzureDevopsCreds, makeBasicAuthHeaderFromPat } from "@/app/api/azure/devops/_shared";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 45_000;

function extFromContentType(ct: string | null): string {
  if (!ct) return "bin";
  const main = ct.split(";")[0]?.trim().toLowerCase() ?? "";
  if (main === "image/png") return "png";
  if (main === "image/jpeg" || main === "image/jpg") return "jpg";
  if (main === "image/gif") return "gif";
  if (main === "image/webp") return "webp";
  if (main === "image/svg+xml") return "svg";
  if (main === "image/bmp") return "bmp";
  return "bin";
}

function allowedImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "dev.azure.com" ||
    h.endsWith(".dev.azure.com") ||
    h.endsWith(".visualstudio.com") ||
    h.endsWith(".blob.core.windows.net")
  );
}

function needsAzurePat(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.includes("dev.azure.com") || h.includes("visualstudio.com");
}

function collectImgSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[0]);
    if (srcMatch?.[1]) out.push(srcMatch[1]);
  }
  return out;
}

function resolveToAbsoluteUrl(raw: string, organization: string, project: string): string | null {
  const trimmed = raw.trim().replace(/&amp;/g, "&");
  if (!trimmed || trimmed.toLowerCase().startsWith("data:")) return null;
  if (trimmed.startsWith("/upload/")) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).href;
    }
    if (!project.trim()) return null;
    const base = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project.trim())}/`;
    return new URL(trimmed, base).href;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

/**
 * For each external img src (Azure / blob hosts), download into public/upload and replace with /upload/filename.
 */
export async function mirrorAzureWorkItemImagesToPublicUpload(
  html: string,
  options: { project?: string },
): Promise<string> {
  const trimmedHtml = html ?? "";
  if (!trimmedHtml.includes("<img")) return trimmedHtml;

  const creds = await getAzureDevopsCreds();
  const patHeader = creds ? makeBasicAuthHeaderFromPat(creds.pat) : null;
  const organization = creds?.organization ?? "";
  const project = (options.project ?? "").trim();

  const rawSrcs = collectImgSrcs(trimmedHtml);
  const unique = [...new Set(rawSrcs)];

  const urlMap = new Map<string, string>();

  for (const raw of unique) {
    const absolute = resolveToAbsoluteUrl(raw, organization, project);
    if (!absolute) continue;

    let hostname: string;
    try {
      hostname = new URL(absolute).hostname;
    } catch {
      continue;
    }

    if (!allowedImageHost(hostname)) continue;

    const headers: Record<string, string> = {
      Accept: "image/*,*/*;q=0.8",
    };
    if (needsAzurePat(hostname) && patHeader) {
      headers.Authorization = patHeader;
    }

    try {
      const res = await fetchWithTimeout(absolute, { method: "GET", headers });
      if (!res.ok) continue;

      const len = res.headers.get("content-length");
      if (len && Number(len) > MAX_IMAGE_BYTES) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) continue;

      const ext = extFromContentType(res.headers.get("content-type"));
      const name = `ado-${randomBytes(12).toString("hex")}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "upload");
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, name);
      await writeFile(filePath, buf);

      const publicPath = `/upload/${name}`;
      urlMap.set(raw, publicPath);
    } catch {
      // skip failed downloads; keep original URL in HTML
    }
  }

  if (urlMap.size === 0) return trimmedHtml;

  let out = trimmedHtml;
  for (const [remote, local] of urlMap) {
    const decodedRemote = remote.replace(/&amp;/g, "&");
    if (out.includes(remote)) {
      out = out.split(remote).join(local);
    } else if (decodedRemote !== remote && out.includes(decodedRemote)) {
      out = out.split(decodedRemote).join(local);
    }
  }
  return out;
}
