import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFormUploadsFolderId } from "@/lib/directus";

// Configure route for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large file uploads

export async function POST(request: NextRequest) {
  // Wrap everything in a try-catch to ensure we always return JSON
  try {
    console.log('[upload API] Request received');
    console.log('[upload API] Request URL:', request.url);
    console.log('[upload API] Request method:', request.method);
    
    // Early return if request is null/undefined
    if (!request) {
      console.error('[upload API] Request is null or undefined');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    // Log request details for debugging
    const contentType = request.headers.get('content-type') || '';
    const contentLength = request.headers.get('content-length');
    console.log('[upload API] Content-Type:', contentType);
    console.log('[upload API] Content-Length:', contentLength);
    
    // Check content type to ensure it's multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      console.warn('[upload API] Invalid Content-Type:', contentType);
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      console.log('[upload API] Attempting to parse FormData...');
      formData = await request.formData();
      console.log('[upload API] FormData parsed successfully');
    } catch (error) {
      console.error('[upload API] Error parsing FormData:', error);
      console.error('[upload API] Error type:', error?.constructor?.name);
      console.error('[upload API] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[upload API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Check if it's a body size limit error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('body') || 
        errorMessage.includes('size') ||
        errorMessage.includes('limit') ||
        errorMessage.includes('too large') ||
        errorMessage.includes('FormData') ||
        errorMessage.includes('parse')
      ) {
        return NextResponse.json(
          { 
            error: 'File too large. The server has a body size limit. Please try a smaller file or contact support to increase the limit.',
            details: `Failed to parse body as FormData - file size may exceed server limits. Error: ${errorMessage}`
          },
          { status: 413 } // 413 Payload Too Large
        );
      }
      // Return error as JSON instead of re-throwing
      return NextResponse.json(
        { 
          error: 'Failed to parse request body as FormData',
          details: errorMessage
        },
        { status: 400 }
      );
    }

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

    // Try to get auth token (wrap in try-catch in case cookies() fails)
    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;
      token = cookieStore.get(ACCESS_COOKIE)?.value;
      console.log('[upload API] Auth token found:', token ? 'Yes' : 'No');
    } catch (cookieError) {
      console.error('[upload API] Error reading cookies (continuing without auth):', cookieError);
      // Continue without token - Directus might allow public uploads
    }

    // Get Form_uploads folder ID (don't fail if this errors)
    let folderId: string | null = null;
    try {
      folderId = await getFormUploadsFolderId();
      console.log('[upload API] Form_uploads folder ID:', folderId);
    } catch (folderError) {
      console.error('[upload API] Error getting folder ID (continuing without folder):', folderError);
      // Continue without folder ID - file will be uploaded to root
    }

    // Recreate FormData for upload
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    // Add folder parameter if folder ID is available
    if (folderId) {
      uploadFormData.append('folder', folderId);
      console.log('[upload API] Added folder parameter to upload:', folderId);
    } else {
      console.warn('[upload API] No folder ID found, uploading to root');
    }

    // Prepare headers
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Upload directly to Directus using fetch
    const uploadUrl = `${directusUrl.replace(/\/$/, '')}/files`;
    console.log('[upload API] Uploading to Directus:', uploadUrl);
    console.log('[upload API] File size:', file.size, 'bytes');
    console.log('[upload API] File name:', file.name);
    console.log('[upload API] File type:', file.type);
    
    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: uploadFormData,
      });
    } catch (fetchError) {
      console.error('[upload API] Fetch error (network issue):', fetchError);
      const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to file storage service',
          details: fetchErrorMessage
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || response.statusText;
        console.error('[upload API] Directus upload error:', errorData);
      } catch (jsonError) {
        const errorText = await response.text().catch(() => response.statusText);
        errorMessage = errorText || response.statusText;
        console.error('[upload API] Directus upload error (non-JSON):', errorText);
      }
      return NextResponse.json(
        { 
          error: `Directus upload failed: ${errorMessage}`,
          status: response.status
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    let result: any;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('[upload API] Failed to parse Directus response as JSON:', jsonError);
      return NextResponse.json(
        { error: 'Upload succeeded but received invalid response from file storage service' },
        { status: 502 }
      );
    }
    console.log('[upload API] Directus upload response:', JSON.stringify(result, null, 2));
    
    // Extract file ID and check if folder was set
    const fileId = result?.data?.id || result?.id;
    const uploadedFolderId = result?.data?.folder || result?.folder;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'Failed to extract file ID from upload result' },
        { status: 500 }
      );
    }

    console.log('[upload API] Uploaded file ID:', fileId);
    console.log('[upload API] Uploaded file folder ID:', uploadedFolderId);
    console.log('[upload API] Target folder ID:', folderId);

    // Always update the file to set the folder if we have a folder ID
    // This ensures the file is in the correct folder even if the folder parameter wasn't processed during upload
    if (folderId && token) {
      // Only update if the folder doesn't match
      if (uploadedFolderId !== folderId) {
        try {
          console.log('[upload API] Updating file folder from', uploadedFolderId, 'to', folderId);
          const updateUrl = `${directusUrl.replace(/\/$/, '')}/files/${fileId}`;
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folder: folderId }),
          });

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('[upload API] Successfully updated file folder:', updateResult);
          } else {
            const updateError = await updateResponse.json().catch(() => ({ message: 'Update failed' }));
            console.error('[upload API] Failed to update file folder:', updateError, 'Status:', updateResponse.status);
          }
        } catch (updateError) {
          console.error('[upload API] Error updating file folder:', updateError);
          // Don't fail the upload if folder update fails
        }
      } else {
        console.log('[upload API] File already in correct folder');
      }
    } else if (!folderId) {
      console.warn('[upload API] No folder ID available, file uploaded to root/system folder');
    } else if (!token) {
      console.warn('[upload API] No auth token available, cannot update file folder');
    }

    return NextResponse.json({ id: fileId });
  } catch (error) {
    console.error('[upload API] Unexpected error uploading file:', error);
    console.error('[upload API] Error type:', error?.constructor?.name);
    console.error('[upload API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[upload API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more specific error messages
    let errorMessage = 'Upload failed';
    let statusCode = 500;
    let errorDetails: string | undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message || 'Upload failed';
      errorDetails = error.stack;
      
      // Check for common error patterns
      if (error.message.includes('body') || error.message.includes('FormData') || error.message.includes('parse')) {
        errorMessage = 'Failed to parse body as FormData. This usually means the file is too large for the server configuration. Please try a smaller file or contact support.';
        statusCode = 413; // Payload Too Large
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Upload timeout. The file may be too large or the connection is too slow. Please try again.';
        statusCode = 504; // Gateway Timeout
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to file storage service. Please try again later.';
        statusCode = 503; // Service Unavailable
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorDetails ? { details: errorDetails } : {})
      },
      { status: statusCode }
    );
  }
}

