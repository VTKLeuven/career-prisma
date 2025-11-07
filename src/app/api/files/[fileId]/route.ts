import { NextRequest, NextResponse } from "next/server";
import { directus } from "@/lib/directus";
import { readAssetRaw } from "@directus/sdk";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const { fileId } = params;
    
    console.log('[files API] Fetching file:', fileId);
    
    // Fetch the file from Directus
    const fileData = await directus.request(readAssetRaw(fileId));
    
    // Get file metadata
    const response = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${fileId}`, {
      method: 'HEAD',
    });
    
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    
    // Return the file
    return new NextResponse(fileData as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
      },
    });
  } catch (error) {
    console.error('[files API] Error fetching file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}

