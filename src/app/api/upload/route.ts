import { NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { uploadFile } from "@/lib/file-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 50 MB upload limit" },
        { status: 413 }
      );
    }

    // Public forms intentionally allow uploads. Authenticated uploads retain
    // attribution in the metadata table.
    const user = await getUserFromCookies();
    const id = await uploadFile(file, user?.id || null);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("[upload API] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
