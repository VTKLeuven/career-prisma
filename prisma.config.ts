import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js loads .env on its own, but the Prisma CLI does not. Without this,
// every `prisma` command fails with "Cannot resolve environment variable:
// DATABASE_URL" even though the app itself starts fine.
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
