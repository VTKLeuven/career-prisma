// app/api/admin/upload-floorplan/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadDirectusFile } from "@/lib/repos/directus";
import { createFloorplan, linkFloorplanToEventPage, getOrCreateEventPage, createBooths } from "@/lib/repos/floorplan";
import { extractBoothsFromSVG } from "@/lib/utils/svg-booth-extractor";

export async function POST(req: Request) {
  try {
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const svgFile = formData.get("svg") as File | null;
    const name = formData.get("name") as string | null;
    const year = formData.get("year") as string | null;
    const eventId = formData.get("eventId") as string | null;

    if (!svgFile || !name || !year || !eventId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (svgFile.type !== "image/svg+xml" && !svgFile.name.toLowerCase().endsWith(".svg")) {
      return NextResponse.json(
        { error: "File must be an SVG" },
        { status: 400 }
      );
    }

    // Step 1: Get or create event page for this event
    const eventPage = await getOrCreateEventPage(eventId);
    if (!eventPage) {
      return NextResponse.json(
        { error: "Failed to get or create event page" },
        { status: 500 }
      );
    }

    // Step 2: Read SVG file content
    let svgText: string;
    let viewBox: string;
    try {
      svgText = await svgFile.text();
      
      // Get dimensions from SVG
      const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/);
      let width = 1000;
      let height = 600;
      
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].split(/\s+/);
        if (parts.length >= 4) {
          width = parseFloat(parts[2]) || width;
          height = parseFloat(parts[3]) || height;
        }
        viewBox = viewBoxMatch[1];
      } else {
        viewBox = `0 0 ${width} ${height}`;
      }
    } catch (svgError) {
      console.error("SVG file reading error:", svgError);
      return NextResponse.json(
        { error: `Failed to read SVG file: ${svgError instanceof Error ? svgError.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Upload SVG file to Directus
    const svgFileId = await uploadDirectusFile(svgFile);

    if (!svgFileId) {
      return NextResponse.json(
        { error: "Failed to upload SVG file" },
        { status: 500 }
      );
    }

    // Step 3: Create floorplan entry
    const floorplan = await createFloorplan({
      name,
      year,
      svg_file: svgFileId,
    });

    if (!floorplan) {
      return NextResponse.json(
        { error: "Failed to create floorplan" },
        { status: 500 }
      );
    }

    // Step 4: Link floorplan to event page
    const linked = await linkFloorplanToEventPage(floorplan.id, eventPage.id);
    if (!linked) {
      return NextResponse.json(
        { error: "Failed to link floorplan to event page" },
        { status: 500 }
      );
    }

    // Step 5: Extract booths from the SVG
    let extractedBooths: Array<{
      booth_number: string;
      coords: unknown;
      Floorplan: string;
    }> = [];

    try {
      console.log("Extracting booths from SVG...");
      const booths = await extractBoothsFromSVG(svgText);
      console.log(`Found ${booths.length} booths in SVG`);
      
      extractedBooths = booths.map(booth => ({
        booth_number: booth.booth_number,
        coords: booth.coords, // Directus will handle JSON serialization
        Floorplan: floorplan.id,
      }));

      console.log(`Prepared ${extractedBooths.length} booths for creation`);

      // Create booth entries
      if (extractedBooths.length > 0) {
        console.log("Creating booths in Directus...");
        const boothResults = await createBooths(extractedBooths);
        if (boothResults) {
          console.log(`Successfully created ${boothResults.length} booths`);
        } else {
          console.warn("createBooths returned null - no booths were created");
        }
      } else {
        console.warn("No booths extracted from SVG. The SVG might not contain <rect> and <text> elements.");
      }
    } catch (boothError) {
      console.error("Error extracting booths from SVG:", boothError);
      console.error("Error stack:", boothError instanceof Error ? boothError.stack : "No stack trace");
      // Continue even if booth extraction fails
    }

    return NextResponse.json({
      success: true,
      floorplanId: floorplan.id,
      boothsExtracted: extractedBooths.length,
      message: `Floorplan uploaded successfully. ${extractedBooths.length} booths extracted from SVG.`,
    });
  } catch (error) {
    console.error("Error uploading floorplan:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

