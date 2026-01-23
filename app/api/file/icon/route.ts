import { NextResponse } from "next/server";
import { FileRepository } from "@/app/lib/db/repository/file";

type UpdateIconBody = {
  id?: string | null;
  icon?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateIconBody;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const icon = body.icon === null
      ? null
      : typeof body.icon === "string"
        ? body.icon
        : null;

    const repo = new FileRepository();
    const updated = await repo.updateIcon(id, icon, Date.now());
    if (!updated) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: updated.id, icon: updated.icon ?? null });
  } catch (error) {
    console.error("Error updating file icon:", error);
    return NextResponse.json({ error: "Failed to update file icon" }, { status: 500 });
  }
}

