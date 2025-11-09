import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFormUploadsFolderId } from "@/lib/directus";

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

    // Get Form_uploads folder ID
    const folderId = await getFormUploadsFolderId();
    console.log('[upload API] Form_uploads folder ID:', folderId);

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
    console.error('[upload API] Error uploading file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

