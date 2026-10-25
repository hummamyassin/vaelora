import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeCopy } from "../../src/lib/copy/home.ts";
import { trackCopy } from "../../src/lib/copy/track.ts";

test("Screens clear the floating dock and safe areas, with explicit degraded actions", () => {
  const tokens = readFileSync("src/app/styles/tokens.css", "utf8");
  const components = readFileSync("src/app/styles/components.css", "utf8");
  const base = readFileSync("src/app/styles/base.css", "utf8");
  const home = readFileSync("src/components/discovery-home.tsx", "utf8");
  assert.match(tokens, /--dock-reserve: calc\(var\(--dock-h\) \+ var\(--dock-gap\) \* 2 \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(components, /var\(--dock-reserve\)/);
  assert.match(base, /scroll-padding-block/);
  assert.equal(homeCopy.trackNoWindow[0], "Track without a recommendation");
  assert.equal(homeCopy.trackNoWeather[0], "Start tracking without conditions");
  assert.equal(homeCopy.trackNoLocation[0], "Track without a location plan");
  for (const key of ["trackNoWindow", "trackNoWeather", "trackNoLocation"] as const)
    assert.ok(home.includes(`c("${key}")`));
  assert.match(home, /data-recommended/);
  assert.equal(trackCopy.acquiring[0], "GPS acquiring");
  assert.equal(trackCopy.degraded[0], "GPS degraded");
});
