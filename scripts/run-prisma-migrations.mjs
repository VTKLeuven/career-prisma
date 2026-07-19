import { spawnSync } from "node:child_process";

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const encode = encodeURIComponent;
const user = encode(required("DATABASE_USER"));
const password = encode(required("DATABASE_PASSWORD"));
const host = required("DATABASE_HOST");
const port = required("DATABASE_PORT");
const database = encode(required("DATABASE_NAME"));
const databaseUrl =
  `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;

const runPrisma = (args) => {
  const result = spawnSync("./node_modules/.bin/prisma", args, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (process.env.BASELINE_EXISTING_SCHEMA === "1") {
  runPrisma([
    "migrate",
    "resolve",
    "--applied",
    "00000000000000_init",
  ]);
}

runPrisma(["migrate", "deploy"]);
