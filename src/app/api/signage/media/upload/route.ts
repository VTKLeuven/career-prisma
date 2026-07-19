import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { uploadFile } from "@/lib/file-storage";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const type = file.type === "application/pdf"
      ? "pdf"
      : file.type.startsWith("video/")
        ? "video"
        : "image";
    const fileId = await uploadFile(file, user.id);
    const media = await prisma.signageMedia.create({
      data: {
        name:
          typeof name === "string" && name.trim()
            ? name.trim()
            : file.name.replace(/\.[^.]+$/, ""),
        type,
        file_id: fileId,
      },
    });
    return NextResponse.json({ id: media.id, fileId, type });
  } catch (error) {
    console.error("[signage media upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
