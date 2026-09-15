import { readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const files = readdirSync(".next/static", { recursive: true })
  .filter((f) => /\.(m?js|css|woff2?)$/.test(f))
  .map((f) => "/_next/static/" + f.replaceAll("\\", "/"))
  .sort();
files.push(...readdirSync("public/maplibre", { recursive: true })
  .filter((f) => /\.mjs$/.test(f))
  .map((f) => "/maplibre/" + f.replaceAll("\\", "/")));
if (!files.length)
  throw new Error("Build the application before preparing its offline assets");
const version = createHash("sha256")
  .update(JSON.stringify(files))
  .digest("hex")
  .slice(0, 16);
writeFileSync(
  "public/offline-assets.js",
  `self.VAELORA_ASSETS=${JSON.stringify({ version, files })};\n`,
);
console.log(
  `PWA shell assets prepared: ${files.length} public files, version ${version}`,
);
