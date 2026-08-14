import { NextResponse } from "next/server";
import { processVacancyContactInquiry } from "@/lib/vacancy-contact-inquiry";
import { isDevEnvironment } from "@/lib/dev-environment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Off means off: on production this endpoint answers as if it did not exist,
  // rather than quietly accepting mail for a feature nobody can see.
  if (!isDevEnvironment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const result = await processVacancyContactInquiry(formData);

    if (result.success) {
      return NextResponse.json(
        { message: "Message sent successfully." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  } catch (error) {
    console.error("Error sending vacancy contact email:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
