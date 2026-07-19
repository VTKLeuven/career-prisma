import { NextResponse } from "next/server";
import { processVacancyContactInquiry } from "@/lib/vacancy-contact-inquiry";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
