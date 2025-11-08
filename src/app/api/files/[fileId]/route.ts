import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const { fileId } = params;
    
    console.log('[files API] Fetching file with ID:', fileId);
    console.log('[files API] File ID type:', typeof fileId);
    console.log('[files API] File ID length:', fileId?.length);

    // Get Directus URL and remove trailing slash to avoid double slashes
    let directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
    if (!directusUrl) {
      console.error('[files API] Directus URL not configured');
      throw new Error('Directus URL not configured');
    }

    // Remove trailing slash to avoid //assets/...
    directusUrl = directusUrl.replace(/\/$/, '');

    console.log('[files API] Using Directus URL:', directusUrl);
    const assetUrl = `${directusUrl}/assets/${fileId}`;
    console.log('[files API] Fetching from:', assetUrl);

    // Fetch the file directly from Directus
    const response = await fetch(assetUrl, {
      method: 'GET',
      headers: {
        // Forward any auth headers if needed
        ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
      },
    });
    
    console.log('[files API] Directus response status:', response.status);
    console.log('[files API] Directus response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[files API] Directus returned error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('[files API] Error body:', errorText);
      return NextResponse.json(
        { error: 'File not found', details: errorText },
        { status: response.status }
      );
    }

    // Get the file as a blob
    const blob = await response.blob();

    // Get headers from Directus response
    const contentType = response.headers.get('content-type') || blob.type || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    const contentLength = response.headers.get('content-length');

    console.log('[files API] File fetched successfully:', {
      contentType,
      size: contentLength,
    });

    // Return the file with proper headers including CDN caching
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache for immutable assets
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Vary': 'Accept',
      },
    });
  } catch (error) {
    console.error('[files API] Error fetching file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

