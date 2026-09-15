import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // Generated copies of the installed, unmodified MapLibre distribution.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".playwright-cli/**", ".agents/**", "public/maplibre/**"]),
]);
