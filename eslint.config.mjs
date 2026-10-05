import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs. Wrapping them in
// FlatCompat (the pre-16 recipe) crashes ESLint with "Converting circular
// structure to JSON", and `next lint` itself was removed in Next 16 -- so
// ESLint is run directly.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Expo app in vtk-floorplan-app/ is a separate project with its own
    // toolchain and eslint config -- linting it with the Next rules here fails.
    "vtk-floorplan-app/**",
    // Load-test scripts run under k6, not Node or the browser.
    "k6/**",
  ]),
]);

export default eslintConfig;
