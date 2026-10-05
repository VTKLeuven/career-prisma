// lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 no longer accepts a `datasources` option on the constructor: the
// default engine talks to the database through a driver adapter instead.
const connectionString = process.env.DATABASE_URL;
const databaseHost = process.env.DATABASE_HOST;

if (!connectionString && !databaseHost) {
  throw new Error(
    "Database connection is not configured. Set DATABASE_URL or the DATABASE_HOST/DATABASE_* fields."
  );
}

// Compose supplies separate fields so a password containing URL-reserved
// characters (for example @, #, /, ?, %, or :) never has to be embedded in a
// connection URL. Local development and the Prisma CLI continue to use
// DATABASE_URL.
const adapterConfig = databaseHost
  ? {
      host: databaseHost,
      port: Number(process.env.DATABASE_PORT || 5432),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    }
  : { connectionString: connectionString! };

// Credentials and single-use token material are never selected unless a query
// opts back in with `omit: { password: false }` (login, password reset, invite
// and verification flows). Users and students ride along on companies,
// speakers, scans and orders that reach the browser -- including on public
// pages -- so leaving these columns out by default is what keeps a password
// hash from ending up in a JSON response through some nested include.
const SECRET_COLUMNS = {
  user: {
    password: true,
    password_reset_token: true,
    password_reset_token_created: true,
    invite_token_hash: true,
    invite_token_created: true,
  },
  student: {
    password: true,
    password_reset_token: true,
    password_reset_token_created: true,
    verification_token_hash: true,
    verification_token_created: true,
    sso_access_token: true,
    sso_token_expires_at: true,
  },
} as const;

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg(adapterConfig),
    omit: SECRET_COLUMNS,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

// Next.js clears the module registry on every hot reload in development, which
// would otherwise open a new connection pool per edit until Postgres refuses
// them. Stashing the client on globalThis keeps a single pool across reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
