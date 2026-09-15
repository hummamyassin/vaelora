import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = dirname(require.resolve("maplibre-gl/package.json"));
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+[-\w.]*$/.test(version)) throw new Error("Invalid MapLibre version");
const target = join("public", "maplibre", version);
mkdirSync(target, { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  copyFileSync(join(root, "dist", name), join(target, name));
copyFileSync(join(root, "LICENSE.txt"), join(target, "LICENSE.txt"));
console.log(`Prepared same-origin MapLibre ${version} worker and shared module`);
