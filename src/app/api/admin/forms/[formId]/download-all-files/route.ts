import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookies } from "@/lib/auth-server";
import { getServerDirectusClient } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import archiver from "archiver";
import type { FormVersion, FormResponse } from "@/lib/schema";

/** Map content-type to file extension for naming */
function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return "";
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
    "text/csv": ".csv",
  };
  const base = contentType.split(";")[0].trim().toLowerCase();
  return map[base] ?? "";
}

/** Extract file ID(s) from a form field value (string, { id }, or array of either) */
function extractFileIds(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((v) => extractFileIds(v));
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: string }).id;
    return typeof id === "string" ? [id] : [];
  }
  return [];
}

/** UUID regex for Directus file IDs */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Metadata keys that may contain UUIDs but are not file IDs */
const METADATA_KEYS = new Set([
  "_student_id",
  "_student_username",
  "_student_email",
  "_student_full_name",
  "_student_university",
  "_student_university_status",
]);

/** Recursively collect all file IDs from form data (scans any structure), excluding metadata */
function collectFileIdsFromValue(
  value: unknown,
  ids: Set<string>,
  key?: string
): void {
  if (!value) return;
  if (key && METADATA_KEYS.has(key)) return;
  if (typeof value === "string") {
    if (UUID_REGEX.test(value)) ids.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectFileIdsFromValue(v, ids);
    return;
  }
  if (typeof value === "object" && value !== null) {
    if ("id" in value && typeof (value as { id?: unknown }).id === "string") {
      const id = (value as { id: string }).id;
      if (UUID_REGEX.test(id)) ids.add(id);
    }
    for (const [k, v] of Object.entries(value)) {
      collectFileIdsFromValue(v, ids, k);
    }
  }
}

/** Collect all unique file IDs from form responses across all versions */
function collectFileIds(
  responses: FormResponse[],
  versions: FormVersion[]
): Set<string> {
  const fileIds = new Set<string>();
  const fileFieldNamesByVersion = new Map<string, Set<string>>();

  for (const version of versions) {
    const fileFields = new Set<string>();
    const schema = version.schema;
    const fields = Array.isArray(schema)
      ? schema
      : (schema as { fields?: Array<{ name?: string; type?: string }> })?.fields ?? [];
    for (const field of fields) {
      if (field?.type === "file" && field?.name) {
        fileFields.add(field.name);
      }
    }
    fileFieldNamesByVersion.set(version.id, fileFields);
  }

  for (const response of responses) {
    const versionId =
      typeof response.form_version_id === "string"
        ? response.form_version_id
        : (response.form_version_id as { id?: string })?.id;
    const data = response.data ?? {};

    // Schema-based: check known file fields for this version
    const fileFields = versionId ? fileFieldNamesByVersion.get(versionId) : null;
    if (fileFields && fileFields.size > 0) {
      for (const fieldName of fileFields) {
        for (const fileId of extractFileIds(data[fieldName])) {
          if (fileId) fileIds.add(fileId);
        }
      }
    }

    // Fallback: scan all values in data for UUIDs (catches files when schema differs or is missing)
    collectFileIdsFromValue(data, fileIds);
  }

  return fileIds;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ formId: string }> }
) {
  try {
    const user = await getUserFromCookies();
    if (!user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await context.params;
    if (!formId) {
      return NextResponse.json(
        { error: "Missing formId" },
        { status: 400 }
      );
    }

    const client = await getServerDirectusClient();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Fetch all versions for this form
    const versions = (await client.request(
      readItems("form_versions" as any, {
        fields: ["id", "schema"],
        filter: { form_id: { _eq: formId } },
        sort: "-version_number",
      })
    )) as unknown as FormVersion[];

    if (versions.length === 0) {
      return NextResponse.json(
        { error: "No versions found for this form" },
        { status: 404 }
      );
    }

    const versionIds = versions.map((v) => v.id);

    // Fetch all responses for all versions (exclude archived)
    const NOT_ARCHIVED = { _or: [{ archived: { _null: true } }, { archived: { _eq: false } }] };
    const responses = (await client.request(
      readItems("form_responses" as any, {
        fields: ["id", "data", "form_version_id"],
        filter: { _and: [{ form_version_id: { _in: versionIds } }, NOT_ARCHIVED] },
        limit: -1,
      })
    )) as unknown as FormResponse[];

    const fileIds = collectFileIds(responses, versions);

    if (fileIds.size === 0) {
      return NextResponse.json(
        { error: "No files found in form responses" },
        { status: 404 }
      );
    }

    const directusUrl = (
      process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL
    )?.replace(/\/$/, "");
    const serverToken = process.env.DIRECTUS_SERVER_TOKEN;

    if (!directusUrl) {
      return NextResponse.json(
        { error: "Directus URL not configured" },
        { status: 500 }
      );
    }

    // Create zip archive
    const archive = archiver("zip", { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    // Fetch each file and add to archive
    const seenIds = new Set<string>();
    for (const fileId of fileIds) {
      // Skip duplicates (same file in multiple responses)
      if (seenIds.has(fileId)) continue;
      seenIds.add(fileId);

      try {
        const assetUrl = `${directusUrl}/assets/${fileId}`;
        const headers: Record<string, string> = {};
        if (serverToken) {
          headers["Authorization"] = `Bearer ${serverToken}`;
        }

        const res = await fetch(assetUrl, { headers });
        if (!res.ok) {
          console.warn(`[download-all-files] Failed to fetch file ${fileId}: ${res.status}`);
          continue;
        }

        const blob = await res.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const contentType = res.headers.get("content-type");
        const ext = getExtensionFromContentType(contentType);
        const filename = `${fileId}${ext}`;

        archive.append(buffer, { name: filename });
      } catch (err) {
        console.warn(`[download-all-files] Error fetching file ${fileId}:`, err);
      }
    }

    archive.finalize();
    await archivePromise;

    const zipBuffer = Buffer.concat(chunks);

    // Get form slug for download filename
    const form = await client.request(
      readItems("forms" as any, {
        fields: ["slug"],
        filter: { id: { _eq: formId } },
        limit: 1,
      })
    ) as unknown as Array<{ slug?: string }>;
    const slug = form?.[0]?.slug ?? formId;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-all-files.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("[download-all-files] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create download",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
