import { NextResponse } from "next/server";
import { getAttendantRegistration } from "@/lib/repos/scans";

export async function GET(
  _request: Request,
  context: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await context.params;
  const response = await getAttendantRegistration(uuid);
  if (!response) {
    return NextResponse.json({ error: "Attendant not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: String(response.id),
    data: response.data,
    submitted_at: response.submitted_at?.toISOString(),
    form_version_id: response.formVersion
      ? {
          metadata: response.formVersion.metadata,
          form_id: response.formVersion.form,
        }
      : null,
  });
}
