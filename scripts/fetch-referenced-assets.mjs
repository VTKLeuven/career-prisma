#!/usr/bin/env node
/**
 * Downloads the handful of images whose file ids are hardcoded in `src/`.
 *
 * Most images on the site come from the database, so seeded dummy rows are
 * enough to make a page render. These four do not: their UUIDs are written
 * directly into the JSX, so on any environment that is not production they
 * resolve to a 404 and the page shows a broken image. The auth pages, the
 * homepage hero and the "Our students" banner are all affected.
 *
 * The files are fetched from the live site (they are served publicly, without
 * credentials) and stored under their original ids, which is what makes the
 * hardcoded references resolve.
 *
 * Usage:
 *   node scripts/fetch-referenced-assets.mjs
 *   node scripts/fetch-referenced-assets.mjs --force   # re-download existing
 *   ASSET_SOURCE=https://dev.career.vtk.be node scripts/fetch-referenced-assets.mjs
 *
 * Re-running is safe: a file already on disk with a matching database row is
 * skipped unless --force is passed.
 *
 * If one of these ever 404s upstream, grep `src/` for its id -- the reference
 * is in the JSX, not in a repo the fetch can discover.
 */

import "dotenv/config";
import path from "node:path";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const force = process.argv.includes("--force");
const source = (process.env.ASSET_SOURCE || "https://career.vtk.be").replace(/\/+$/, "");

/**
 * Each entry is referenced by id from the files listed in `where`. Keep this in
 * sync when a new hardcoded id appears -- `grep -rE "api/files/[0-9a-f-]{36}"`
 * over src/ finds them.
 */
const ASSETS = [
  {
    id: "875bb00d-d935-4e0b-b2fb-2dc9a9a2b12d",
    where: "login / register / student-login / verify-student side image",
  },
  {
    id: "d93c21e6-1145-4d4e-96d2-7e8daa640b9f",
    where: "KU Leuven logo on company, event and speaker pages",
  },
  {
    id: "1be725c7-bc66-47ba-b956-e7ae59978983",
    where: "homepage hero and the event page's fallback hero",
  },
  {
    id: "b2d5f309-d041-4c57-a4a9-ab5cd60f0b60",
    where: "Our students page banner",
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Is .env present?");
  process.exit(1);
}

// Writing rows keyed on production ids into production would be pointless at
// best, so keep this pointed at a local database.
const host = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1", "::1", "database"].includes(host)) {
  console.error(`Refusing to run: DATABASE_URL points at "${host}", which is not local.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Filename from Content-Disposition, falling back to the id. */
function filenameFrom(header, id, contentType) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? "");
  if (match) return decodeURIComponent(match[1]);
  const extension = (contentType ?? "").split("/")[1]?.split(";")[0] ?? "bin";
  return `${id}.${extension}`;
}

/** Pixel dimensions, read from the file header. Metadata only -- never fatal. */
function dimensions(buffer, contentType) {
  try {
    if (contentType?.includes("png") && buffer.length > 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0..SOF15, excluding the DHT/JPG/DAC markers that share the range.
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    }
  } catch {
    // Dimensions are cosmetic; a parse failure must not stop the download.
  }
  return { width: null, height: null };
}

const uploadsDirectory = path.resolve(process.env.UPLOADS_DIR || "./uploads");

async function main() {
  await mkdir(uploadsDirectory, { recursive: true });
  console.log(`\nFetching hardcoded assets from ${source}`);
  console.log(`into ${uploadsDirectory}\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of ASSETS) {
    const destination = path.join(uploadsDirectory, asset.id);
    const onDisk = await stat(destination).then((s) => s.size).catch(() => null);
    const row = await prisma.file.findUnique({ where: { id: asset.id } });

    if (!force && onDisk && row) {
      console.log(`  skip      ${asset.id}  (${onDisk} bytes already present)`);
      skipped += 1;
      continue;
    }

    const url = `${source}/api/files/${asset.id}`;
    let response;
    try {
      response = await fetch(url, { redirect: "follow" });
    } catch (error) {
      console.error(`  FAILED    ${asset.id}  ${error.message}`);
      failed += 1;
      continue;
    }
    if (!response.ok) {
      console.error(`  FAILED    ${asset.id}  HTTP ${response.status} -- ${asset.where}`);
      failed += 1;
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const filename = filenameFrom(response.headers.get("content-disposition"), asset.id, contentType);
    const { width, height } = dimensions(buffer, contentType);

    await writeFile(destination, buffer);
    await prisma.file.upsert({
      where: { id: asset.id },
      update: {
        filename_disk: asset.id,
        filename_download: filename,
        type: contentType,
        filesize: buffer.length,
        width,
        height,
        modified_on: new Date(),
      },
      create: {
        id: asset.id,
        storage: "local",
        filename_disk: asset.id,
        filename_download: filename,
        title: filename.replace(/\.[^.]+$/, ""),
        type: contentType,
        filesize: buffer.length,
        width,
        height,
        uploaded_on: new Date(),
      },
    });

    const size = `${(buffer.length / 1024 / 1024).toFixed(1)} MB`;
    const dims = width && height ? `${width}x${height}` : "unknown size";
    console.log(`  saved     ${asset.id}  ${filename}  ${size}  ${dims}`);
    console.log(`            ${asset.where}`);
    downloaded += 1;
  }

  console.log(
    `\n${downloaded} downloaded, ${skipped} already present, ${failed} failed.\n`
  );
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nFetch failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
