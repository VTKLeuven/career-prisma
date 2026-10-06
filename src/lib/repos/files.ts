// lib/repos/files.ts -- the `files` table: metadata rows for uploads on disk
// (see lib/file-storage.ts for the disk side).
import "server-only";

import prisma from "@/lib/prisma";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A file's metadata row; null for an unknown id or one that is not a UUID. */
export async function getFileRecord(id: string) {
  if (!UUID.test(id)) return null;
  return prisma.file.findUnique({ where: { id } });
}

export async function createFileRecord(data: {
  id: string;
  filenameDisk: string;
  filenameDownload: string;
  type: string;
  size: number;
  uploadedBy?: string | null;
  folder?: string | null;
}): Promise<void> {
  await prisma.file.create({
    data: {
      id: data.id,
      storage: "local",
      filename_disk: data.filenameDisk,
      filename_download: data.filenameDownload,
      title: data.filenameDownload,
      type: data.type,
      folder: data.folder || null,
      uploaded_by: data.uploadedBy || null,
      filesize: BigInt(data.size),
      uploaded_on: new Date(),
    },
  });
}

export async function deleteFileRecord(id: string): Promise<void> {
  await prisma.file.delete({ where: { id } });
}
