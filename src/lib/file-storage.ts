import "server-only";

import { randomUUID } from "crypto";
import { mkdir, open, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";

export const uploadsDirectory = path.resolve(
  process.env.UPLOADS_DIR || path.join(process.cwd(), "directus-uploads")
);

function safeDiskName(filename: string): string {
  const basename = path.basename(filename);
  if (!basename || basename !== filename) {
    throw new Error("Invalid stored filename");
  }
  return basename;
}

export async function getStoredFile(fileId: string) {
  const metadata = await prisma.file.findUnique({ where: { id: fileId } });
  if (!metadata?.filename_disk) return null;

  const filenameDisk = safeDiskName(metadata.filename_disk);
  const filePath = path.join(uploadsDirectory, filenameDisk);
  if (!filePath.startsWith(`${uploadsDirectory}${path.sep}`)) {
    throw new Error("Invalid stored file path");
  }
  return { metadata, filePath };
}

export async function openStoredFile(fileId: string) {
  const stored = await getStoredFile(fileId);
  if (!stored) return null;
  const handle = await open(stored.filePath, "r");
  return { ...stored, handle };
}

export async function uploadFile(
  file: File,
  uploadedBy?: string | null,
  folder?: string | null
): Promise<string> {
  const id = randomUUID();
  const filenameDisk = id;
  const temporaryName = `.${id}.uploading`;
  const temporaryPath = path.join(uploadsDirectory, temporaryName);
  const finalPath = path.join(uploadsDirectory, filenameDisk);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadsDirectory, { recursive: true });
  await writeFile(temporaryPath, bytes, { flag: "wx" });

  try {
    await prisma.file.create({
      data: {
        id,
        storage: "local",
        filename_disk: filenameDisk,
        filename_download: file.name || id,
        title: file.name || id,
        type: file.type || "application/octet-stream",
        folder: folder || null,
        uploaded_by: uploadedBy || null,
        filesize: BigInt(file.size),
        uploaded_on: new Date(),
      },
    });
    await rename(temporaryPath, finalPath);
    return id;
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    await prisma.file.delete({ where: { id } }).catch(() => undefined);
    throw error;
  }
}

export async function deleteStoredFile(fileId: string): Promise<void> {
  const stored = await getStoredFile(fileId);
  if (!stored) return;
  await prisma.file.delete({ where: { id: fileId } });
  await unlink(stored.filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export function assetUrl(fileId: string): string {
  return `/api/files/${encodeURIComponent(fileId)}`;
}
