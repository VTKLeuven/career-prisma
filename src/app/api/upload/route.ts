import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get Directus URL
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
    if (!directusUrl) {
      return NextResponse.json(
        { error: 'Directus URL not configured' },
        { status: 500 }
      );
    }

    // Try to get auth token
    const cookieStore = await cookies();
    const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    // Recreate FormData for upload
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    // Prepare headers
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Upload directly to Directus using fetch
    const uploadUrl = `${directusUrl.replace(/\/$/, '')}/files`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      return NextResponse.json(
        { error: `Directus upload failed: ${errorData.message || response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Extract file ID from Directus response
    const fileId = result?.data?.id || result?.id;
    if (!fileId) {
      return NextResponse.json(
        { error: 'Failed to extract file ID from upload result' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: fileId });
  } catch (error) {
    console.error('[upload API] Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

