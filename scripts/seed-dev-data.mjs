#!/usr/bin/env node
/**
 * Seeds the local database with dummy data for manual testing.
 *
 * The migrations create an empty schema (only `vacancy_sectors` is seeded), so a
 * fresh install has no roles and therefore no way to log in at all: both
 * `src/app/api/login/route.ts` and `src/lib/auth-server.ts` compare against role
 * UUIDs that used to come from the Directus export. This script recreates those
 * roles and hangs a believable slice of the application off them.
 *
 * Credentials are read from .env, never hardcoded:
 *
 *   DEV_ADMIN_EMAIL        required
 *   DEV_ADMIN_PASSWORD     required
 *   DEV_REP_EMAIL          optional, defaults to rep@dev.local
 *   DEV_REP_PASSWORD       optional, defaults to DEV_ADMIN_PASSWORD
 *   DEV_STUDENT_EMAIL      optional, defaults to student@dev.local
 *   DEV_STUDENT_PASSWORD   optional, defaults to DEV_ADMIN_PASSWORD
 *
 * Usage:
 *   node scripts/seed-dev-data.mjs
 *   node scripts/seed-dev-data.mjs --force   # allow a non-local database
 *
 * Re-running is safe: every row is keyed on a fixed UUID or a natural key, so
 * the script updates in place instead of duplicating. It never deletes data it
 * did not create.
 *
 * At the end it also runs scripts/fetch-referenced-assets.mjs, which downloads
 * the images whose ids are hardcoded in src/ from the live site.
 */

import "dotenv/config";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const force = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Fixed identifiers
// ---------------------------------------------------------------------------

// These are not arbitrary -- they are compared literally in src/ and the app
// misbehaves if the seed invents its own. The names are misleading on purpose
// (they come from the Directus export): "VTK Career" is the salesperson role,
// "Administrator" is the unadvertised internal one. See docs/auth.md.
// All three may sign in (ALLOWED_ROLE_IDS in src/app/api/login/route.ts); only
// VTK Career is listed as a salesperson (src/lib/repos/users.ts), which is what
// keeps Administrator accounts fully privileged but off the public homepage.
const ROLE_SALES = "7b128ef4-f530-47d2-8f4c-ef82518eb313";
const ROLE_ADMINISTRATOR = "c4e63615-ed81-45d1-8145-1b88137e60cb";
const ROLE_COMPANY_REP = "d5475bf4-a77f-48de-b06c-fac199b0f631";
// Career Day: src/lib/eventsight.ts and the dashboard gate the drink-ordering
// UI on this exact event id, so the seed reuses it to keep that path reachable.
const EVENT_CAREER_DAY = "4a1b38c1-83f4-418e-b4c3-9e1ec680f832";

// Everything else is seed-owned. The `dede` prefix makes seeded rows obvious in
// psql and keeps them clear of anything Postgres would generate.
const dev = (group, n) =>
  `dede${String(group).padStart(4, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;

const USER_ADMIN = dev(1, 1);
const USER_REP = dev(1, 2);

const COMPANY = {
  technobel: dev(2, 1),
  aurora: dev(2, 2),
  delta: dev(2, 3),
};

const VACANCY_TYPE = {
  internship: dev(3, 1),
  starter: dev(3, 2),
  thesis: dev(3, 3),
  studentJob: dev(3, 4),
};

const SECTION = {
  role: dev(4, 1),
  profile: dev(4, 2),
  offer: dev(4, 3),
};

const VACANCY = {
  backend: dev(5, 1),
  mechanical: dev(5, 2),
  dataThesis: dev(5, 3),
  consultant: dev(5, 4),
};

const EVENT_OPTION = {
  booth: dev(6, 1),
  dinner: dev(6, 2),
};

// The second event exists to exercise the event header: it is the only page
// that replaces the site nav with its own buttons. Career Day deliberately has
// none, so the two together cover both branches.
const EVENT_JOBFAIR = dev(7, 1);
const FILE_COMPANY_GUIDE = dev(7, 2);
const FILE_EVENT_IMAGE = dev(7, 3);

const SPEAKER_USER = {
  ana: dev(8, 1),
  bram: dev(8, 2),
  chiara: dev(8, 3),
};

// One private PDF per seeded CV: dev(9, n).
const cvFile = (n) => dev(9, n);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = (message) => console.log(`  ${message}`);

/** Academic years run September -> August, so the boundary is the 9th month. */
function academicYearBounds(reference = new Date()) {
  const startYear =
    reference.getUTCMonth() >= 8
      ? reference.getUTCFullYear()
      : reference.getUTCFullYear() - 1;
  return {
    name: `${startYear}-${startYear + 1}`,
    start: new Date(Date.UTC(startYear, 8, 1, 0, 0, 0)),
    end: new Date(Date.UTC(startYear + 1, 7, 31, 23, 59, 59)),
  };
}

/**
 * Int primary keys come from Postgres sequences. Inserting explicit ids would
 * leave those sequences behind and break the next insert made through the UI,
 * so these tables are matched on a natural key instead.
 */
async function findOrCreate(model, where, data) {
  const existing = await model.findFirst({ where });
  if (existing) {
    return model.update({ where: { id: existing.id }, data });
  }
  return model.create({ data: { ...where, ...data } });
}

/**
 * Sets what a sub-option grants (career_sub_option_grants, see src/lib/grants.ts).
 * Access comes from these rows, not from the sub-option's name.
 */
async function setGrants(subOptionId, grants) {
  await prisma.careerSubOptionGrant.deleteMany({ where: { career_sub_option_id: subOptionId } });
  if (grants.length) {
    await prisma.careerSubOptionGrant.createMany({
      data: grants.map(({ type, config }) => ({
        career_sub_option_id: subOptionId,
        type,
        ...(config ? { config } : {}),
      })),
    });
  }
}

/** Replaces a join table's rows for the given parents without touching others. */
async function replaceLinks(model, where, rows) {
  await model.deleteMany({ where });
  if (rows.length) await model.createMany({ data: rows });
}

/**
 * A tiny but structurally valid one-page PDF, so the seeded company guide is a
 * real download rather than a database row pointing at nothing. Offsets in the
 * xref table have to be exact, so they are computed rather than written out.
 */
function minimalPdf(title) {
  const NL = "\n";
  const escaped = String(title).replace(/([()\\])/g, "\\$1");
  const stream = `BT /F1 14 Tf 40 120 Td (${escaped}) Tj ET`;
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R" +
      "/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${stream.length}>>${NL}stream${NL}${stream}${NL}endstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  let pdf = `%PDF-1.4${NL}`;
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj${NL}${body}${NL}endobj${NL}`;
  });

  const xrefStart = pdf.length;
  pdf += `xref${NL}0 ${objects.length + 1}${NL}0000000000 65535 f ${NL}`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n ${NL}`;
  }
  pdf +=
    `trailer${NL}<</Size ${objects.length + 1}/Root 1 0 R>>${NL}` +
    `startxref${NL}${xrefStart}${NL}%%EOF${NL}`;

  return Buffer.from(pdf, "latin1");
}

/**
 * A PNG gradient, used as the seeded event hero image. Without an image the
 * hero renders a broken-image icon, which makes every seeded event page look
 * wrong for a reason that has nothing to do with the layout being checked.
 */
function minimalPng(width, height, from, to) {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // One filter byte (0 = none) per scanline, then RGB triples.
  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    const t = height === 1 ? 0 : y / (height - 1);
    const rgb = [0, 1, 2].map((i) =>
      Math.round(from[i] + (to[i] - from[i]) * t),
    );
    for (let x = 0; x < width; x++) {
      raw[offset++] = rgb[0];
      raw[offset++] = rgb[1];
      raw[offset++] = rgb[2];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(
      `\n${name} is not set.\n\n` +
        "Add the development admin credentials to .env, for example:\n\n" +
        '  DEV_ADMIN_EMAIL="admin@dev.local"\n' +
        '  DEV_ADMIN_PASSWORD="a-long-local-only-password"\n',
    );
    process.exit(1);
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Is .env present?");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !force) {
  console.error("Refusing to seed dummy data with NODE_ENV=production.");
  process.exit(1);
}

// This writes a working administrator account, so make pointing it at a remote
// database a deliberate act rather than an accident.
const host = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
})();
const isLocal = ["localhost", "127.0.0.1", "::1", "database"].includes(host);
if (!isLocal && !force) {
  console.error(
    `Refusing to seed: DATABASE_URL points at "${host}", which is not local.\n` +
      "Re-run with --force if that is really what you want.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const adminEmail = requireEnv("DEV_ADMIN_EMAIL").toLowerCase();
  const adminPassword = requireEnv("DEV_ADMIN_PASSWORD");
  const repEmail = (process.env.DEV_REP_EMAIL || "rep@dev.local").toLowerCase();
  const repPassword = process.env.DEV_REP_PASSWORD || adminPassword;
  const studentEmail = (
    process.env.DEV_STUDENT_EMAIL || "student@dev.local"
  ).toLowerCase();
  const studentPassword = process.env.DEV_STUDENT_PASSWORD || adminPassword;

  const now = new Date();

  // -- Roles ---------------------------------------------------------------
  // The three sign-in roles production has. Seeding fewer leaves the role
  // picker in /admin/users short of options that exist in prod.
  console.log("\nRoles");
  for (const role of [
    {
      id: ROLE_SALES,
      name: "VTK Career",
      icon: "verified",
      description:
        "Full access. The salesperson role: listed on the public homepage.",
    },
    {
      id: ROLE_ADMINISTRATOR,
      name: "Administrator",
      icon: "verified",
      description: "Full access, internal only. Never listed as a salesperson.",
    },
    {
      id: ROLE_COMPANY_REP,
      name: "Company Rep",
      icon: "supervised_user_circle",
      description: "Company representative. Limited to their own company.",
    },
  ]) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name, description: role.description },
      create: role,
    });
    log(`${role.name}`);
  }

  // -- Academic years ------------------------------------------------------
  console.log("\nAcademic years");
  const current = academicYearBounds(now);
  const previousStart = new Date(current.start);
  previousStart.setUTCFullYear(previousStart.getUTCFullYear() - 1);
  const previous = academicYearBounds(previousStart);

  const previousYear = await findOrCreate(
    prisma.academicYear,
    { name: previous.name },
    {
      start_of_year: previous.start,
      end_of_year: previous.end,
      date_created: now,
    },
  );
  const currentYear = await findOrCreate(
    prisma.academicYear,
    { name: current.name },
    {
      start_of_year: current.start,
      end_of_year: current.end,
      date_created: now,
    },
  );
  log(`${previous.name} (historical, read-only)`);
  log(`${current.name} (current -- contains today)`);

  // -- Faculties and masters ----------------------------------------------
  console.log("\nFaculties and masters");
  const faculty = await findOrCreate(
    prisma.faculty,
    { name: "Faculteit Ingenieurswetenschappen" },
    { date_created: now },
  );

  const masters = {};
  for (const spec of [
    { name: "Computerwetenschappen", short_name: "CW", students: 320 },
    { name: "Werktuigkunde", short_name: "WTK", students: 210 },
    { name: "Elektrotechniek", short_name: "ELT", students: 180 },
    { name: "Burgerlijke Bouwkunde", short_name: "BWK", students: 150 },
  ]) {
    masters[spec.short_name] = await findOrCreate(
      prisma.master,
      { short_name: spec.short_name },
      { name: spec.name, students: spec.students },
    );
  }
  log(`1 faculty, ${Object.keys(masters).length} masters`);

  await replaceLinks(
    prisma.facultyMaster,
    { faculty_id: faculty.id },
    Object.values(masters).map((master) => ({
      faculty_id: faculty.id,
      master_id: master.id,
    })),
  );

  // -- Companies -----------------------------------------------------------
  console.log("\nCompanies");
  const companies = [
    {
      id: COMPANY.technobel,
      name: "TechnoBel",
      short_description: "Embedded software for industrial automation.",
      long_description:
        "TechnoBel builds control software for factory floors across Belgium. " +
        "Seeded dummy company -- safe to edit or delete.",
      location: "Leuven",
      website: "https://example.com/technobel",
      VAT: "BE0123456789",
      address_street: "Naamsestraat",
      address_number: "1",
      address_zip: "3000",
      address_city: "Leuven",
      address_country: "Belgium",
    },
    {
      id: COMPANY.aurora,
      name: "Aurora Engineering",
      short_description: "Mechanical design and prototyping.",
      long_description:
        "Aurora Engineering designs machines for the food industry. " +
        "Seeded dummy company -- safe to edit or delete.",
      location: "Gent",
      website: "https://example.com/aurora",
      VAT: "BE0987654321",
      address_street: "Korenlei",
      address_number: "12",
      address_zip: "9000",
      address_city: "Gent",
      address_country: "Belgium",
    },
    {
      id: COMPANY.delta,
      name: "Delta Analytics",
      short_description: "Data science consultancy.",
      long_description:
        "Delta Analytics runs forecasting projects for logistics operators. " +
        "Seeded dummy company -- safe to edit or delete.",
      location: "Antwerpen",
      website: "https://example.com/delta",
      VAT: "BE0555666777",
      address_street: "Meir",
      address_number: "40",
      address_zip: "2000",
      address_city: "Antwerpen",
      address_country: "Belgium",
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: { ...company, status: "published", date_updated: now },
      create: { ...company, status: "published", date_created: now },
    });
    log(company.name);
  }

  // -- Accounts ------------------------------------------------------------
  console.log("\nAccounts");
  const adminHash = await argon2.hash(adminPassword);
  const repHash = await argon2.hash(repPassword);

  await prisma.user.upsert({
    where: { id: USER_ADMIN },
    update: {
      email: adminEmail,
      password: adminHash,
      role_id: ROLE_SALES,
      status: "active",
    },
    create: {
      id: USER_ADMIN,
      email: adminEmail,
      password: adminHash,
      first_name: "Dev",
      last_name: "Admin",
      title: "Administrator",
      tel: "+32 470 00 00 01",
      role_id: ROLE_SALES,
      status: "active",
    },
  });
  log(`admin      ${adminEmail}`);

  await prisma.user.upsert({
    where: { id: USER_REP },
    update: {
      email: repEmail,
      password: repHash,
      role_id: ROLE_COMPANY_REP,
      company_id: COMPANY.technobel,
      status: "active",
    },
    create: {
      id: USER_REP,
      email: repEmail,
      password: repHash,
      first_name: "Dev",
      last_name: "Rep",
      title: "Recruitment Lead",
      tel: "+32 470 00 00 02",
      role_id: ROLE_COMPANY_REP,
      company_id: COMPANY.technobel,
      status: "active",
    },
  });
  log(`rep        ${repEmail} (TechnoBel)`);

  // The admin owns the accounts as salesperson so the sales views are populated.
  await prisma.company.updateMany({
    where: { id: { in: Object.values(COMPANY) } },
    data: { salesperson_id: USER_ADMIN },
  });

  const studentHash = await argon2.hash(studentPassword);
  const student = await prisma.student.upsert({
    where: { email: studentEmail },
    update: { password: studentHash, verified: true },
    create: {
      username: studentEmail.split("@")[0],
      email: studentEmail,
      first_name: "Dev",
      last_name: "Student",
      full_name: "Dev Student",
      university: "KU Leuven",
      university_status: "student",
      organization_status: "member",
      verified: true,
      is_shifter: true,
      password: studentHash,
      date_created: now,
    },
  });
  log(`student    ${studentEmail} (verified, shifter)`);

  await replaceLinks(prisma.studentCompany, { students_id: student.id }, [
    { students_id: student.id, company_id: COMPANY.technobel },
    { students_id: student.id, company_id: COMPANY.delta },
  ]);

  // -- Career event --------------------------------------------------------
  console.log("\nCareer event");
  const eventDate = new Date(current.start);
  eventDate.setUTCMonth(2, 12); // mid-March of the second calendar year
  eventDate.setUTCFullYear(current.start.getUTCFullYear() + 1);

  await prisma.careerEvent.upsert({
    where: { id: EVENT_CAREER_DAY },
    update: {
      academic_year_id: currentYear.id,
      // The date has to move with the academic year. Leaving it behind on a
      // re-run produced a March-2026 event filed under 2026-2027, which then
      // turned up on the homepage as a greyed-out "past" card.
      date: eventDate,
      status: "published",
      date_updated: now,
    },
    create: {
      id: EVENT_CAREER_DAY,
      status: "published",
      name: "Career Day",
      description:
        "The yearly VTK Career Day. Seeded dummy event -- safe to edit.",
      location: "Brabanthal, Leuven",
      date: eventDate,
      start_hour: new Date("1970-01-01T10:00:00Z"),
      end_hour: new Date("1970-01-01T17:00:00Z"),
      num_of_companies: 3,
      num_of_students: 1200,
      shout: "Meet 3 companies in one afternoon",
      academic_year_id: currentYear.id,
      series_key: "career-day",
      date_created: now,
    },
  });
  log("Career Day (published)");

  await findOrCreate(
    prisma.careerEventPage,
    { event_id: EVENT_CAREER_DAY },
    {
      // No status here: the event's own status is the only draft flag.
      shout: "Career Day",
      tagline: "One afternoon, every employer worth meeting.",
      description_EN:
        "<p>Seeded dummy event page. Edit freely -- re-running the seed " +
        "will reset it.</p>",
      address: "Brabanthal, Brabantlaan 1, 3001 Leuven",
      parking: "Free parking on site.",
      registration_link: "https://example.com/register",
      latitude: 50.8663,
      longitude: 4.6834,
    },
  );

  const eventPage = await prisma.careerEventPage.findFirst({
    where: { event_id: EVENT_CAREER_DAY },
  });
  await replaceLinks(
    prisma.careerEventPageCompany,
    { career_event_page_id: eventPage.id },
    Object.values(COMPANY).map((companyId) => ({
      career_event_page_id: eventPage.id,
      company_id: companyId,
    })),
  );
  log("event page + 3 exhibiting companies");

  // Career Day is the "no event nav" case: an empty array means the public page
  // keeps the ordinary site header. Explicit, so it reads as a decision rather
  // than as data nobody filled in.
  await prisma.careerEventPage.update({
    where: { id: eventPage.id },
    data: { header_buttons: [] },
  });

  // -- Header and layout variants -----------------------------------------
  // The public site has two header shapes and they are easy to break without
  // noticing, because no single page shows both. These fixtures make each one
  // reachable in the browser:
  //
  //   /                          site header (from the layout)
  //   /event/career-day          site header -- event page, no event nav
  //   /event/vtk-jobfair         event header -- its own nav, no Events menu
  //   /company/technobel         site header + "Discovery Stage" extra item
  //   /company/aurora            site header, no extra item
  //
  console.log("\nHeader and layout variants");

  const jobfairDate = new Date(eventDate);
  jobfairDate.setUTCMonth(2, 11);

  await prisma.careerEvent.upsert({
    where: { id: EVENT_JOBFAIR },
    update: {
      academic_year_id: currentYear.id,
      status: "published",
      date: jobfairDate,
      date_updated: now,
    },
    create: {
      id: EVENT_JOBFAIR,
      status: "published",
      name: "VTK Jobfair",
      description:
        "<p>The open-house fair where engineering students meet their future " +
        "employer. Seeded dummy event -- safe to edit.</p>",
      location: "Brabanthal, Leuven",
      date: jobfairDate,
      start_hour: new Date("1970-01-01T09:45:00Z"),
      end_hour: new Date("1970-01-01T17:00:00Z"),
      num_of_companies: 3,
      num_of_students: 3000,
      shout: "Biggest engineering jobfair in the BeNeLux",
      academic_year_id: currentYear.id,
      series_key: "vtk-jobfair",
      date_created: now,
    },
  });
  log("VTK Jobfair (published)");

  // Real files on disk, so the Company guide button downloads something and the
  // hero renders an image instead of a broken-image icon.
  const uploadsDirectory = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  await mkdir(uploadsDirectory, { recursive: true });

  const guidePdf = minimalPdf("Seeded company guide -- VTK Jobfair");
  await writeFile(path.join(uploadsDirectory, FILE_COMPANY_GUIDE), guidePdf);

  const heroPng = minimalPng(1600, 900, [10, 38, 75], [37, 99, 160]);
  await writeFile(path.join(uploadsDirectory, FILE_EVENT_IMAGE), heroPng);
  await prisma.file.upsert({
    where: { id: FILE_EVENT_IMAGE },
    update: { filesize: heroPng.length, modified_on: now },
    create: {
      id: FILE_EVENT_IMAGE,
      storage: "local",
      filename_disk: FILE_EVENT_IMAGE,
      filename_download: "event-hero.png",
      title: "Seeded event hero",
      type: "image/png",
      filesize: heroPng.length,
      width: 1600,
      height: 900,
      uploaded_on: now,
    },
  });
  await prisma.careerEventPage.update({
    where: { id: eventPage.id },
    data: { image_id: FILE_EVENT_IMAGE },
  });
  await prisma.file.upsert({
    where: { id: FILE_COMPANY_GUIDE },
    update: { filesize: guidePdf.length, modified_on: now },
    create: {
      id: FILE_COMPANY_GUIDE,
      storage: "local",
      filename_disk: FILE_COMPANY_GUIDE,
      filename_download: "vtk-jobfair-company-guide.pdf",
      title: "VTK Jobfair company guide",
      type: "application/pdf",
      filesize: guidePdf.length,
      uploaded_on: now,
    },
  });

  const floorplan = await findOrCreate(
    prisma.floorplan,
    { name: "VTK Jobfair floorplan" },
    { year: String(jobfairDate.getUTCFullYear()) },
  );

  // The Matching Software button is hidden when this row is inactive, so an
  // active one is what makes that button appear at all.
  await findOrCreate(
    prisma.matchingSoftware,
    { event_id: EVENT_JOBFAIR },
    { active: true, year_id: currentYear.id, date_updated: now },
  );

  await findOrCreate(
    prisma.careerEventPage,
    { event_id: EVENT_JOBFAIR },
    {
      shout: "VTK Jobfair",
      tagline: "Biggest engineering jobfair in the BeNeLux for students.",
      description_EN:
        "<p>An open-house fair for industrial, economic and bioengineering " +
        "students. Seeded dummy page -- re-running the seed resets it.</p>",
      address: "Brabanthal, Brabantlaan 1, 3001 Leuven",
      parking: "Free parking at Brabantlaan 1.",
      registration_link: "https://example.com/jobfair-register",
      latitude: 50.8663,
      longitude: 4.6834,
      floorplan_id: floorplan.id,
      company_guide: FILE_COMPANY_GUIDE,
      image_id: FILE_EVENT_IMAGE,
      // All four, so the event header renders every button it can.
      header_buttons: [
        "floorplan",
        "company_guide",
        "cv_upload",
        "matching_software",
      ],
    },
  );

  const jobfairPage = await prisma.careerEventPage.findFirst({
    where: { event_id: EVENT_JOBFAIR },
  });

  await replaceLinks(
    prisma.careerEventPageCompany,
    { career_event_page_id: jobfairPage.id },
    Object.values(COMPANY).map((companyId) => ({
      career_event_page_id: jobfairPage.id,
      company_id: companyId,
    })),
  );

  // Timetable, roughly the shape of the real day.
  const slots = [];
  for (const slot of [
    {
      title: "Company arrival and setup",
      start: "07:00",
      end: "09:30",
      type: ["company"],
    },
    {
      title: "Student breakfast, fair opens",
      start: "09:45",
      end: "10:30",
      type: ["student"],
    },
    {
      title: "Jobfair",
      start: "10:30",
      end: "12:45",
      type: ["student", "company"],
    },
    {
      title: "Lunch",
      start: "12:00",
      end: "14:00",
      type: ["student", "company"],
    },
    {
      title: "That first career choice, does it matter?",
      start: "13:00",
      end: "13:45",
      type: ["discovery"],
    },
    {
      title: "Let's talk salary",
      start: "14:00",
      end: "14:45",
      type: ["discovery"],
    },
    {
      title: "Networking reception",
      start: "17:00",
      end: "19:00",
      type: ["student", "company"],
    },
  ]) {
    slots.push(
      await findOrCreate(
        prisma.timetable,
        { title: slot.title },
        {
          status: "published",
          start_time: new Date(`1970-01-01T${slot.start}:00Z`),
          end_time: new Date(`1970-01-01T${slot.end}:00Z`),
          type: slot.type,
          date_created: now,
        },
      ),
    );
  }
  await replaceLinks(
    prisma.careerEventPageTimetable,
    { career_event_page_id: jobfairPage.id },
    slots.map((slot) => ({
      career_event_page_id: jobfairPage.id,
      timetable_id: slot.id,
    })),
  );
  log(
    `floorplan, company guide (PDF), matching software, ${slots.length} timetable slots`,
  );

  // Speakers drive the "Discovery Stage" nav item -- on the event header and,
  // through their company, on the company page's header too.
  const speakerSpecs = [
    {
      id: SPEAKER_USER.ana,
      first_name: "Ana",
      last_name: "Peeters",
      title: "Lead Engineer",
      company_id: COMPANY.technobel,
      slot: slots.find(
        (s) => s.title === "That first career choice, does it matter?",
      ),
      personal_information: "<p>Ana leads the controls team at TechnoBel.</p>",
      content: "<p>On picking a first job without over-thinking it.</p>",
    },
    {
      id: SPEAKER_USER.bram,
      first_name: "Bram",
      last_name: "Janssens",
      title: "Head of Talent",
      company_id: COMPANY.aurora,
      slot: slots.find((s) => s.title === "Let's talk salary"),
      personal_information: "<p>Bram hires mechanical engineers at Aurora.</p>",
      content: "<p>What a starter package actually contains.</p>",
    },
    {
      id: SPEAKER_USER.chiara,
      first_name: "Chiara",
      last_name: "De Smet",
      title: "Data Science Lead",
      // Second speaker at TechnoBel on purpose, which leaves Delta with none:
      // that is the company page whose header has no "Discovery Stage" item.
      company_id: COMPANY.technobel,
      slot: null,
      personal_information:
        "<p>Chiara runs forecasting projects at TechnoBel.</p>",
      content: "<p>A speaker without a timetable slot, on purpose.</p>",
    },
  ];

  const speakerIds = [];
  for (const spec of speakerSpecs) {
    // Representatives, not sign-in accounts: no password is set.
    await prisma.user.upsert({
      where: { id: spec.id },
      update: {
        first_name: spec.first_name,
        last_name: spec.last_name,
        title: spec.title,
        company_id: spec.company_id,
        role_id: ROLE_COMPANY_REP,
        status: "active",
      },
      create: {
        id: spec.id,
        first_name: spec.first_name,
        last_name: spec.last_name,
        title: spec.title,
        company_id: spec.company_id,
        role_id: ROLE_COMPANY_REP,
        status: "active",
      },
    });

    const speaker = await findOrCreate(
      prisma.speaker,
      { representative_id: spec.id },
      {
        personal_information: spec.personal_information,
        content: spec.content,
        time_id: spec.slot ? spec.slot.id : null,
        date_created: now,
      },
    );
    speakerIds.push(speaker.id);
  }

  await replaceLinks(
    prisma.careerEventPageSpeaker,
    { career_event_page_id: jobfairPage.id },
    speakerIds.map((speakerId) => ({
      career_event_page_id: jobfairPage.id,
      speaker_id: speakerId,
    })),
  );
  log(`${speakerIds.length} speakers (TechnoBel x2, Aurora; Delta has none)`);

  // -- Sellable options ----------------------------------------------------
  console.log("\nOptions");
  for (const option of [
    {
      id: EVENT_OPTION.booth,
      name: "Standard booth",
      description: "A 3x2m booth including table, chairs and power.",
      price: 2500,
      series_key: "booth-standard",
    },
    {
      id: EVENT_OPTION.dinner,
      name: "Company dinner",
      description: "Two seats at the evening dinner with students.",
      price: 800,
      series_key: "dinner",
    },
  ]) {
    await prisma.careerEventOption.upsert({
      where: { id: option.id },
      update: {
        ...option,
        academic_year_id: currentYear.id,
        date_updated: now,
      },
      create: {
        ...option,
        academic_year_id: currentYear.id,
        date_created: now,
      },
    });
    log(`${option.name} (EUR ${option.price})`);
  }

  await replaceLinks(
    prisma.careerEventOptionEvent,
    { career_event_option_id: { in: Object.values(EVENT_OPTION) } },
    Object.values(EVENT_OPTION).map((optionId) => ({
      career_event_option_id: optionId,
      career_event_id: EVENT_CAREER_DAY,
    })),
  );

  const extraLunch = await findOrCreate(
    prisma.careerSubOption,
    { name: "Extra lunch voucher" },
    { description: "One additional lunch for a colleague.", price: "25" },
  );

  // hasCompanyPageAccess() matches this sub-option **by name**, so the string
  // has to be exactly this or every /company/<name> page 404s as "not found".
  const companyPageSub = await findOrCreate(
    prisma.careerSubOption,
    { name: "Company Page On Platform" },
    { description: "A public company profile on career.vtk.be.", price: "200" },
  );
  await setGrants(companyPageSub.id, [{ type: "company_page" }]);
  // The vacancy platform needs this grant; only TechnoBel buys it (below), so
  // the rep can post and Aurora's or Delta's rep would see the "not in your
  // package" notice.
  const vacancySub = await findOrCreate(
    prisma.careerSubOption,
    { name: "Vacancy Platform" },
    { description: "Post vacancies on career.vtk.be for one academic year.", price: "300" },
  );
  await setGrants(vacancySub.id, [{ type: "vacancies" }]);

  await replaceLinks(
    prisma.careerEventOptionSubOption,
    { career_event_option_id: EVENT_OPTION.booth },
    [
      {
        career_event_option_id: EVENT_OPTION.booth,
        career_sub_option_id: extraLunch.id,
      },
    ],
  );

  // Attached to the dinner rather than the booth on purpose. Access is granted
  // by a direct sale OR by any option the company bought that carries this
  // sub-option, so hanging it off the booth would give it to every exhibitor
  // and there would be no company left to check the "no public page" path with.
  await replaceLinks(
    prisma.careerEventOptionSubOption,
    { career_event_option_id: EVENT_OPTION.dinner },
    [
      {
        career_event_option_id: EVENT_OPTION.dinner,
        career_sub_option_id: companyPageSub.id,
      },
    ],
  );

  // Sales, so the company dashboard and revenue views are not empty.
  for (const [companyId, optionId] of [
    [COMPANY.technobel, EVENT_OPTION.booth],
    [COMPANY.technobel, EVENT_OPTION.dinner],
    [COMPANY.aurora, EVENT_OPTION.booth],
    [COMPANY.delta, EVENT_OPTION.booth],
  ]) {
    const option = await prisma.careerEventOption.findUnique({
      where: { id: optionId },
    });
    await prisma.companyCareerEventOption.upsert({
      where: {
        company_id_career_event_option_id_academic_year_id: {
          company_id: companyId,
          career_event_option_id: optionId,
          academic_year_id: currentYear.id,
        },
      },
      update: { status: "sold" },
      create: {
        company_id: companyId,
        career_event_option_id: optionId,
        academic_year_id: currentYear.id,
        price_at_sale: option.price,
        name_at_sale: option.name,
        status: "sold",
      },
    });
  }

  await prisma.companyCareerSubOption.upsert({
    where: {
      company_id_career_sub_option_id_academic_year_id: {
        company_id: COMPANY.technobel,
        career_sub_option_id: extraLunch.id,
        academic_year_id: currentYear.id,
      },
    },
    update: { status: "sold" },
    create: {
      company_id: COMPANY.technobel,
      career_sub_option_id: extraLunch.id,
      academic_year_id: currentYear.id,
      price_at_sale: "25",
      name_at_sale: "Extra lunch voucher",
      status: "sold",
    },
  });
  // TechnoBel and Delta buy the public profile directly; Aurora buys only a
  // booth, which carries no such sub-option, so /company/aurora-engineering is
  // the "no public page" case.
  for (const companyId of [COMPANY.technobel, COMPANY.delta]) {
    await prisma.companyCareerSubOption.upsert({
      where: {
        company_id_career_sub_option_id_academic_year_id: {
          company_id: companyId,
          career_sub_option_id: companyPageSub.id,
          academic_year_id: currentYear.id,
        },
      },
      update: { status: "sold" },
      create: {
        company_id: companyId,
        career_sub_option_id: companyPageSub.id,
        academic_year_id: currentYear.id,
        price_at_sale: "200",
        name_at_sale: "Company Page On Platform",
        status: "sold",
      },
    });
  }
  await prisma.companyCareerSubOption.upsert({
    where: {
      company_id_career_sub_option_id_academic_year_id: {
        company_id: COMPANY.technobel,
        career_sub_option_id: vacancySub.id,
        academic_year_id: currentYear.id,
      },
    },
    update: { status: "sold" },
    create: {
      company_id: COMPANY.technobel,
      career_sub_option_id: vacancySub.id,
      academic_year_id: currentYear.id,
      price_at_sale: "300",
      name_at_sale: "Vacancy Platform",
      status: "sold",
    },
  });
  log("4 option sales + 4 sub-option sales (2 company pages, 1 vacancy platform)");

  // A sale in the previous year too, so year switching shows a difference.
  await prisma.companyCareerEventOption.upsert({
    where: {
      company_id_career_event_option_id_academic_year_id: {
        company_id: COMPANY.aurora,
        career_event_option_id: EVENT_OPTION.booth,
        academic_year_id: previousYear.id,
      },
    },
    update: { status: "sold" },
    create: {
      company_id: COMPANY.aurora,
      career_event_option_id: EVENT_OPTION.booth,
      academic_year_id: previousYear.id,
      price_at_sale: 2300,
      name_at_sale: "Standard booth",
      status: "sold",
    },
  });
  log(`1 historical sale in ${previous.name}`);

  // -- CV book -------------------------------------------------------------
  // Two years of CVs through one form, the way /forms/cv-book is used: last
  // year's book is published, this year's is hidden while it is screened.
  // TechnoBel (the rep's company) bought the CV book both years and sees last
  // year's; Aurora bought last year only; Delta never did, so its rep would
  // land on the request-access page. The dev student has a CV in last year's book
  // only, so they can upload for this year and try the opt-out switch. See
  // docs/data-model.md for the rules this exercises.
  console.log("\nCV book");
  const cvBookSub = await findOrCreate(
    prisma.careerSubOption,
    { name: "CV Book" },
    { description: "Access to the screened student CVs of that academic year.", price: "500" },
  );
  await setGrants(cvBookSub.id, [{ type: "cv_book", config: { scope: "sale_year" } }]);
  for (const [companyId, year] of [
    [COMPANY.technobel, previousYear],
    [COMPANY.technobel, currentYear],
    [COMPANY.aurora, previousYear],
  ]) {
    await prisma.companyCareerSubOption.upsert({
      where: {
        company_id_career_sub_option_id_academic_year_id: {
          company_id: companyId,
          career_sub_option_id: cvBookSub.id,
          academic_year_id: year.id,
        },
      },
      update: { status: "sold" },
      create: {
        company_id: companyId,
        career_sub_option_id: cvBookSub.id,
        academic_year_id: year.id,
        price_at_sale: "500",
        name_at_sale: "CV Book",
        status: "sold",
      },
    });
  }

  const cvForm = await findOrCreate(
    prisma.form,
    { slug: "cv-book" },
    {
      name: "CV Book",
      description: "Upload your CV so companies at the VTK Jobfair can find you.",
      is_active: true,
      updated_at: now,
    },
  );
  const cvFields = [
    { id: "cv_first", name: "first_name", label: "First name", type: "text", required: true, layout: "half" },
    { id: "cv_last", name: "last_name", label: "Last name", type: "text", required: true, layout: "half" },
    { id: "cv_email", name: "email", label: "Email", type: "email", required: true },
    { id: "cv_study", name: "study", label: "Master", type: "master-degrees", required: true },
    { id: "cv_file", name: "cv", label: "CV (PDF)", type: "file", required: true, validation: { allowedFileTypes: [".pdf"] } },
    { id: "cv_linkedin", name: "linkedin", label: "LinkedIn", type: "linkedin", required: false },
  ];
  const cvVersion = await findOrCreate(
    prisma.formVersion,
    { form_id: cvForm.id, version_number: 1 },
    {
      schema: { fields: cvFields },
      is_active: true,
      metadata: { requires_login: true },
      created_at: previous.start,
    },
  );

  // Fixed dates inside each year, so the seed is stable and every response
  // lands in its year's book.
  const inPrevious = (days) => new Date(previous.start.getTime() + days * 86_400_000);
  const inCurrent = (days) =>
    new Date(Math.min(current.start.getTime() + days * 86_400_000, now.getTime() - 3_600_000));

  // status: approved / rejected / pending (no screening row); override: a
  // study the admin corrected. `student` links the dev student's account.
  const cvs = [
    // Last year -- published.
    { n: 1, first: "Lien", last: "Peeters", master: "CW", at: inPrevious(20), status: "approved", linkedin: "lien-peeters" },
    { n: 2, first: "Arne", last: "Janssens", master: "WTK", at: inPrevious(24), status: "approved" },
    { n: 3, first: "Sofie", last: "Maes", master: "ELT", at: inPrevious(31), status: "approved", linkedin: "sofie-maes" },
    { n: 4, first: "Pieter", last: "Willems", master: "BWK", at: inPrevious(35), status: "approved" },
    { n: 5, first: "Emma", last: "Claes", master: "CW", at: inPrevious(42), status: "approved", linkedin: "emma-claes" },
    { n: 6, first: "Jonas", last: "Goossens", master: "WTK", at: inPrevious(47), status: "approved" },
    { n: 7, first: "Noor", last: "Wouters", master: "ELT", at: inPrevious(55), status: "approved", override: "Computerwetenschappen" },
    { n: 8, first: "Tibo", last: "De Smet", master: "CW", at: inPrevious(60), status: "rejected" },
    { n: 9, first: "Dev", last: "Student", master: "CW", at: inPrevious(70), status: "approved", student: true, email: studentEmail },
    // Sent without signing in by someone who later opted out on their
    // account: matched by email, shown as withdrawn in screening.
    { n: 10, first: "Lotte", last: "Vermeulen", master: "BWK", at: inPrevious(75), status: "approved", email: "lotte.optout@dev.local" },
    // This year -- screening in progress.
    { n: 11, first: "Ruben", last: "Mertens", master: "CW", at: inCurrent(5), status: "approved", linkedin: "ruben-mertens" },
    { n: 12, first: "Hanne", last: "Jacobs", master: "WTK", at: inCurrent(9), status: "approved" },
    { n: 13, first: "Wout", last: "Hermans", master: "ELT", at: inCurrent(14), status: "rejected" },
    { n: 14, first: "Fien", last: "Aerts", master: "BWK", at: inCurrent(18), status: "pending", linkedin: "fien-aerts" },
    { n: 15, first: "Lars", last: "Van den Broeck", master: "CW", at: inCurrent(22), status: "pending" },
    { n: 16, first: "Elise", last: "Dubois", master: "WTK", at: inCurrent(26), status: "pending" },
    // Lien sends a new CV this year: one response per year, one per book.
    { n: 17, first: "Lien", last: "Peeters", master: "CW", at: inCurrent(30), status: "pending", linkedin: "lien-peeters" },
  ];

  await prisma.student.upsert({
    where: { email: "lotte.optout@dev.local" },
    update: { cv_book_opt_out: true },
    create: {
      username: "lotte.optout",
      email: "lotte.optout@dev.local",
      first_name: "Lotte",
      last_name: "Vermeulen",
      full_name: "Lotte Vermeulen",
      verified: true,
      cv_book_opt_out: true,
      date_created: now,
    },
  });

  const cvBooks = {};
  for (const [key, year, published] of [
    ["previous", previousYear, true],
    ["current", currentYear, false],
  ]) {
    cvBooks[key] = await findOrCreate(
      prisma.cvBook,
      { form_id: cvForm.id, year_id: year.id },
      {
        student_first_name_field: "first_name",
        student_last_name_field: "last_name",
        student_email_field: "email",
        student_study_field: "study",
        student_cv_field: "cv",
        student_linkedin_field: "linkedin",
        active: published,
        date_updated: now,
      },
    );
  }

  const cvResponses = {};
  for (const cv of cvs) {
    const email =
      cv.email ?? `${cv.first}.${cv.last}`.toLowerCase().replace(/\s+/g, "") + "@student.dev.local";
    const fileId = cvFile(cv.n);
    const pdf = minimalPdf(`CV -- ${cv.first} ${cv.last} (${masters[cv.master].name})`);
    await writeFile(path.join(uploadsDirectory, fileId), pdf);
    await prisma.file.upsert({
      where: { id: fileId },
      update: { filesize: pdf.length, private: true, modified_on: now },
      create: {
        id: fileId,
        storage: "local",
        filename_disk: fileId,
        filename_download: `CV ${cv.first} ${cv.last}.pdf`,
        title: `CV ${cv.first} ${cv.last}`,
        type: "application/pdf",
        filesize: pdf.length,
        private: true,
        uploaded_on: cv.at,
      },
    });

    const data = {
      first_name: cv.first,
      last_name: cv.last,
      email,
      study: String(masters[cv.master].id),
      cv: fileId,
      ...(cv.linkedin ? { linkedin: `https://www.linkedin.com/in/${cv.linkedin}` } : {}),
      ...(cv.student ? { _student_id: String(student.id), _student_email: student.email } : {}),
    };
    // Keyed on email and academic year -- one CV per student per year, the
    // rule the app keeps too -- so re-running never duplicates a response.
    const window = cv.at >= current.start ? current : previous;
    const existing = await prisma.formResponse.findFirst({
      where: {
        form_version_id: cvVersion.id,
        submitter_email: email,
        submitted_at: { gte: window.start, lte: window.end },
      },
      orderBy: { submitted_at: "asc" },
    });
    const response = existing
      ? await prisma.formResponse.update({ where: { id: existing.id }, data: { data, submitted_at: cv.at } })
      : await prisma.formResponse.create({
          data: {
            form_version_id: cvVersion.id,
            submitter_email: email,
            submitter_first_name: cv.first,
            submitter_last_name: cv.last,
            submitted_at: cv.at,
            data,
          },
        });
    cvResponses[cv.n] = response;

    const book = cv.at >= current.start ? cvBooks.current : cvBooks.previous;
    const screening = { cv_book: book.id, form_response: response.id };
    if (cv.status === "pending") {
      await prisma.cvBookScreening.deleteMany({ where: screening });
    } else {
      await findOrCreate(prisma.cvBookScreening, screening, {
        status: cv.status,
        study_override: cv.override ?? null,
        screened_at: new Date(cv.at.getTime() + 2 * 86_400_000),
        screened_by: USER_ADMIN,
      });
    }
  }

  for (const n of [1, 5]) {
    await findOrCreate(
      prisma.cvBookFavourite,
      { company_id: COMPANY.technobel, cv_book: cvBooks.previous.id, form_response: cvResponses[n].id },
      { date_created: now },
    );
  }
  log(`${previous.name}: published, ${cvs.filter((c) => c.at < current.start).length} CVs (1 rejected, 1 withdrawn)`);
  log(`${current.name}: hidden, ${cvs.filter((c) => c.at >= current.start).length} CVs (4 pending)`);
  log("CV Book sold to TechnoBel (both years) and Aurora (last year)");

  // -- Vacancies -----------------------------------------------------------
  console.log("\nVacancies");
  for (const [index, type] of [
    { id: VACANCY_TYPE.internship, name: "Internship" },
    { id: VACANCY_TYPE.starter, name: "Starter job" },
    { id: VACANCY_TYPE.thesis, name: "Master thesis" },
    { id: VACANCY_TYPE.studentJob, name: "Student job" },
  ].entries()) {
    await prisma.vacancyType.upsert({
      where: { id: type.id },
      update: { name: type.name, sort: index + 1, active: true },
      create: { ...type, sort: index + 1, active: true },
    });
  }

  const sectionConfigs = [
    { id: SECTION.role, key: "role", label: "The role", required: true },
    {
      id: SECTION.profile,
      key: "profile",
      label: "Your profile",
      required: true,
    },
    {
      id: SECTION.offer,
      key: "offer",
      label: "What we offer",
      required: false,
    },
  ];
  for (const [index, config] of sectionConfigs.entries()) {
    await prisma.vacancySectionConfig.upsert({
      where: { id: config.id },
      update: { ...config, sort: index + 1, active: true },
      create: { ...config, sort: index + 1, active: true },
    });
  }
  log("4 vacancy types, 3 section configs");

  // Sectors come from the 20260721000000_seed_vacancy_sectors migration.
  const sectorByName = new Map(
    (await prisma.vacancySector.findMany()).map((s) => [s.name, s.id]),
  );
  const sector = (name) => sectorByName.get(name) ?? null;

  // `sections` is keyed by VacancySectionConfig id -- see src/lib/schema.ts.
  const sections = (role, profile, offer) => ({
    [SECTION.role]: `<p>${role}</p>`,
    [SECTION.profile]: `<p>${profile}</p>`,
    [SECTION.offer]: `<p>${offer}</p>`,
  });

  const vacancies = [
    {
      id: VACANCY.backend,
      title: "Backend Engineer (Go)",
      company_id: COMPANY.technobel,
      type_id: VACANCY_TYPE.starter,
      sectorName: "IT",
      location: "Leuven",
      contact_name: "Dev Rep",
      contact_email: repEmail,
      contact_phone: "+32 470 00 00 02",
      masters: ["CW", "ELT"],
      sections: sections(
        "Build and run the services behind our factory-floor control plane.",
        "You know one compiled language well and are not afraid of a terminal.",
        "A permanent contract, a real mentor, and hardware you can break.",
      ),
    },
    {
      id: VACANCY.mechanical,
      title: "Mechanical Design Intern",
      company_id: COMPANY.aurora,
      type_id: VACANCY_TYPE.internship,
      sectorName: "Mechanica & mechatronica",
      location: "Gent",
      contact_name: "Dev Admin",
      contact_email: adminEmail,
      masters: ["WTK"],
      sections: sections(
        "Support the design team on a new packaging line from sketch to prototype.",
        "Second-year master student, comfortable in CAD.",
        "A paid internship with a genuine chance of an offer afterwards.",
      ),
    },
    {
      id: VACANCY.dataThesis,
      title: "Master Thesis: Demand Forecasting",
      company_id: COMPANY.delta,
      type_id: VACANCY_TYPE.thesis,
      sectorName: "Artificiële intelligentie",
      location: "Antwerpen",
      contact_name: "Dev Admin",
      contact_email: adminEmail,
      masters: ["CW"],
      sections: sections(
        "Research forecasting models on two years of real logistics data.",
        "You have taken a machine learning course and can write clearly.",
        "A supervisor on our side, a desk whenever you want one, and a laptop.",
      ),
    },
    {
      id: VACANCY.consultant,
      title: "Junior Data Consultant",
      company_id: COMPANY.delta,
      type_id: VACANCY_TYPE.starter,
      sectorName: "Consultancy",
      location: "Antwerpen",
      contact_name: "Dev Admin",
      contact_email: adminEmail,
      masters: ["CW", "BWK"],
      status: "draft", // one unpublished row, to exercise the status filters
      sections: sections(
        "Work directly with clients on short, focused analytics projects.",
        "You explain a result as well as you compute one.",
        "Company car, training budget, and a team that reviews your work.",
      ),
    },
  ];

  for (const spec of vacancies) {
    const { masters: masterKeys, sectorName, status, ...vacancy } = spec;
    const sectorId = sector(sectorName);
    const data = {
      ...vacancy,
      sector_id: sectorId,
      status: status ?? "published",
    };

    await prisma.vacancy.upsert({
      where: { id: vacancy.id },
      update: { ...data, date_updated: now },
      create: { ...data, date_created: now },
    });

    await replaceLinks(
      prisma.vacancyMaster,
      { vacancies_id: vacancy.id },
      masterKeys.map((key) => ({
        vacancies_id: vacancy.id,
        master_id: masters[key].id,
      })),
    );
    await replaceLinks(
      prisma.vacancySectorLink,
      { vacancies_id: vacancy.id },
      sectorId
        ? [{ vacancies_id: vacancy.id, vacancy_sectors_id: sectorId }]
        : [],
    );
    log(`${spec.title} (${data.status})`);
  }

  // -- Hardcoded images ----------------------------------------------------
  // A few images (auth pages, homepage hero, ...) are referenced by literal id
  // in src/, so no seeded row can stand in for them. Run in a child process
  // because that script is a standalone entry point with its own client. A
  // failure (offline, upstream down) only costs some images, so it is not fatal.
  try {
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("./fetch-referenced-assets.mjs", import.meta.url),
        ),
      ],
      { stdio: "inherit" },
    );
  } catch {
    console.warn(
      "\n  Could not fetch the hardcoded images; some pages will show broken images.\n" +
        "  Retry with: node scripts/fetch-referenced-assets.mjs\n",
    );
  }

  // -- Summary -------------------------------------------------------------
  console.log("\nDone. Sign in at http://localhost:3000/login\n");
  console.log(`  admin    ${adminEmail}`);
  console.log(`  rep      ${repEmail}`);
  console.log(`  student  ${studentEmail}  (/student-login)`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("\nSeeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
