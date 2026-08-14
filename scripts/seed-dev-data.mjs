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
 */

import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const force = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Fixed identifiers
// ---------------------------------------------------------------------------

// These three are not arbitrary -- they are compared literally in src/ and the
// app misbehaves if the seed invents its own. Admin doubles as the salesperson
// role (src/lib/repos/users.ts), and only these two roles may sign in at all
// (ALLOWED_ROLE_IDS in src/app/api/login/route.ts).
const ROLE_ADMIN = "7b128ef4-f530-47d2-8f4c-ef82518eb313";
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

/** Replaces a join table's rows for the given parents without touching others. */
async function replaceLinks(model, where, rows) {
  await model.deleteMany({ where });
  if (rows.length) await model.createMany({ data: rows });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(
      `\n${name} is not set.\n\n` +
        "Add the development admin credentials to .env, for example:\n\n" +
        '  DEV_ADMIN_EMAIL="admin@dev.local"\n' +
        '  DEV_ADMIN_PASSWORD="a-long-local-only-password"\n'
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
      "Re-run with --force if that is really what you want."
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
  // "VTK Career" is accepted alongside "Administrator" for salesperson actions
  // (src/app/actions/companies.ts) but cannot sign in, so it is not seeded.
  console.log("\nRoles");
  for (const role of [
    {
      id: ROLE_ADMIN,
      name: "Administrator",
      icon: "verified",
      description: "Full access. Also the salesperson role.",
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
    }
  );
  const currentYear = await findOrCreate(
    prisma.academicYear,
    { name: current.name },
    {
      start_of_year: current.start,
      end_of_year: current.end,
      date_created: now,
    }
  );
  log(`${previous.name} (historical, read-only)`);
  log(`${current.name} (current -- contains today)`);

  // -- Faculties and masters ----------------------------------------------
  console.log("\nFaculties and masters");
  const faculty = await findOrCreate(
    prisma.faculty,
    { name: "Faculteit Ingenieurswetenschappen" },
    { date_created: now }
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
      { name: spec.name, students: spec.students }
    );
  }
  log(`1 faculty, ${Object.keys(masters).length} masters`);

  await replaceLinks(
    prisma.facultyMaster,
    { faculty_id: faculty.id },
    Object.values(masters).map((master) => ({
      faculty_id: faculty.id,
      master_id: master.id,
    }))
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
      role_id: ROLE_ADMIN,
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
      role_id: ROLE_ADMIN,
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

  await replaceLinks(
    prisma.studentCompany,
    { students_id: student.id },
    [
      { students_id: student.id, company_id: COMPANY.technobel },
      { students_id: student.id, company_id: COMPANY.delta },
    ]
  );

  // -- Career event --------------------------------------------------------
  console.log("\nCareer event");
  const eventDate = new Date(current.start);
  eventDate.setUTCMonth(2, 12); // mid-March of the second calendar year
  eventDate.setUTCFullYear(current.start.getUTCFullYear() + 1);

  await prisma.careerEvent.upsert({
    where: { id: EVENT_CAREER_DAY },
    update: {
      academic_year_id: currentYear.id,
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
      status: "published",
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
    }
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
    }))
  );
  log("event page + 3 exhibiting companies");

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
      update: { ...option, academic_year_id: currentYear.id, date_updated: now },
      create: { ...option, academic_year_id: currentYear.id, date_created: now },
    });
    log(`${option.name} (EUR ${option.price})`);
  }

  await replaceLinks(
    prisma.careerEventOptionEvent,
    { career_event_option_id: { in: Object.values(EVENT_OPTION) } },
    Object.values(EVENT_OPTION).map((optionId) => ({
      career_event_option_id: optionId,
      career_event_id: EVENT_CAREER_DAY,
    }))
  );

  const extraLunch = await findOrCreate(
    prisma.careerSubOption,
    { name: "Extra lunch voucher" },
    { description: "One additional lunch for a colleague.", price: "25" }
  );
  await replaceLinks(
    prisma.careerEventOptionSubOption,
    { career_event_option_id: EVENT_OPTION.booth },
    [
      {
        career_event_option_id: EVENT_OPTION.booth,
        career_sub_option_id: extraLunch.id,
      },
    ]
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
  log("4 option sales + 1 sub-option sale");

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
    { id: SECTION.profile, key: "profile", label: "Your profile", required: true },
    { id: SECTION.offer, key: "offer", label: "What we offer", required: false },
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
    (await prisma.vacancySector.findMany()).map((s) => [s.name, s.id])
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
        "A permanent contract, a real mentor, and hardware you can break."
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
        "A paid internship with a genuine chance of an offer afterwards."
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
        "A supervisor on our side, a desk whenever you want one, and a laptop."
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
        "Company car, training budget, and a team that reviews your work."
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
      }))
    );
    await replaceLinks(
      prisma.vacancySectorLink,
      { vacancies_id: vacancy.id },
      sectorId
        ? [{ vacancies_id: vacancy.id, vacancy_sectors_id: sectorId }]
        : []
    );
    log(`${spec.title} (${data.status})`);
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
