import { NextResponse } from "next/server";
import { fetchScreenBySlugAction } from "@/app/actions/signage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const result = await fetchScreenBySlugAction(slug);
  if (!result) {
    return NextResponse.json({ error: "Screen not found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      screen: result.screen,
      slots: result.slots.map((slot: any) => {
        const media = slot.file;
        const fileId =
          typeof media?.file === "string" ? media.file : media?.file?.id;
        return {
          id: slot.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          media: {
            id: media?.id,
            name: media?.name,
            type: media?.type,
            file_url: fileId ? `/api/signage/media/${fileId}` : null,
          },
        };
      }),
      _fetched_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } }
  );
}
